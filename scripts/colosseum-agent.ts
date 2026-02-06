import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { buildAutoForumSystemPrompt, buildSocialReplySystemPrompt } from './colosseum-prompts.js';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://agents.colosseum.com/api';
const CONFIG_FILE = process.env.AGENT_CONFIG_PATH || path.join(__dirname, '../.colosseum-agent.json');
const API_TIMEOUT_MS = Number.parseInt(process.env.COLOSSEUM_API_TIMEOUT_MS || '15000', 10);
const MAX_RETRIES = Number.parseInt(process.env.COLOSSEUM_API_RETRIES || '2', 10);
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_QUEUE_LIMIT = 100;
const ACTIVE_SOCIAL_TARGETS = Number.parseInt(process.env.AGENT_ACTIVE_SOCIAL_TARGETS || '4', 10);
const DEFAULT_SOCIAL_TARGETS = Number.parseInt(process.env.AGENT_DEFAULT_SOCIAL_TARGETS || '2', 10);
const POSTS_MODEL = process.env.OPENAI_MODEL_FOR_POSTS || process.env.OPENAI_MODEL || 'google/gemini-2.0-flash-001';
const REPLIES_MODEL = process.env.OPENAI_MODEL_FOR_REPLIES || process.env.OPENAI_MODEL || 'google/gemini-2.0-flash-001';
const BANNED_CLAIMS = ['guaranteed profit', 'zero risk', 'cannot fail', 'proves business truth', 'absolute truth'];

type AgentMode = 'default' | 'active';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ContentType = 'progress-update' | 'q-and-a' | 'postmortem';

interface PendingAction {
    id: string;
    endpoint: string;
    method: Exclude<HttpMethod, 'GET'>;
    body: unknown;
    reason: string;
    attempts: number;
    createdAt: string;
}

interface DailyMetric {
    posts: number;
    comments: number;
    votes: number;
    heartbeats: number;
    queueRetries: number;
    queueFailures: number;
}

interface RecentReply {
    postId: number;
    body: string;
    createdAt: string;
}

interface AgentConfig {
    apiKey?: string;
    claimCode?: string;
    projectId?: string;
    heartbeatCount?: number;
    lastHeartbeatAt?: string;
    lastForumPostAt?: string;
    repliedPostIds?: number[];
    socialInteractions?: {
        postId: number;
        postTitle: string;
        replyBody: string;
        repliedAt: string;
    }[];
    pendingActions?: PendingAction[];
    dailyMetrics?: Record<string, DailyMetric>;
    recentReplies?: RecentReply[];
    lastContentType?: ContentType;
}

interface ForumPost {
    id: number;
    title: string;
    body: string;
    agentName?: string;
    createdAt?: string;
    upvotes?: number;
    commentsCount?: number;
}

interface AgentStatus {
    hasActivePoll?: boolean;
}

interface ProjectData {
    name: string;
    oneLiner: string;
    description: string;
    websiteUrl: string;
    repoLink: string;
    technicalDemoLink?: string;
    presentationLink?: string;
    twitterHandle?: string;
    solanaIntegration: string;
    howToReproduce: string;
    tags: string[];
}

interface ParsedOptions {
    dryRun: boolean;
    once: boolean;
    mode: AgentMode;
}

const rawArgs = process.argv.slice(2);
const modeArg = rawArgs.find((arg) => arg.startsWith('--mode='));
const parsedMode = (modeArg?.split('=')[1] || process.env.AGENT_MODE || 'default')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase();
const mode: AgentMode = parsedMode === 'active' ? 'active' : 'default';

const options: ParsedOptions = {
    dryRun: rawArgs.includes('--dry-run') || process.env.COLOSSEUM_DRY_RUN === '1',
    once: rawArgs.includes('--once'),
    mode,
};
const args = rawArgs.filter((arg) => !arg.startsWith('--'));
const command = args[0];
const maxCycles = Number.parseInt(process.env.AGENT_MAX_CYCLES || '0', 10);

function requireText(value: string | undefined, name: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed) {
        throw new Error(`Missing required argument: ${name}`);
    }
    return trimmed;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

function shouldRetry(error: unknown, status?: number): boolean {
    if (typeof status === 'number' && RETRYABLE_STATUS.has(status)) {
        return true;
    }
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return msg.includes('timeout') || msg.includes('network') || msg.includes('fetch');
    }
    return false;
}

function extractPosts(data: unknown): ForumPost[] {
    if (Array.isArray(data)) {
        return data as ForumPost[];
    }
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.posts)) {
            return obj.posts as ForumPost[];
        }
        if (obj.data && typeof obj.data === 'object' && Array.isArray((obj.data as Record<string, unknown>).posts)) {
            return (obj.data as Record<string, unknown>).posts as ForumPost[];
        }
    }
    return [];
}

function normalizeWords(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((part) => part.length > 2);
}

function jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(normalizeWords(a));
    const setB = new Set(normalizeWords(b));
    if (setA.size === 0 || setB.size === 0) {
        return 0;
    }
    let intersection = 0;
    for (const item of setA) {
        if (setB.has(item)) {
            intersection += 1;
        }
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function appendCtaQuestion(text: string, fallbackQuestion: string): string {
    if (text.includes('?')) {
        return text;
    }
    return `${text}\n\n${fallbackQuestion}`;
}

function getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL || process.env.BASE_URL || 'https://api.openai.com/v1';
    if (!apiKey) {
        throw new Error('Missing OPENAI_API_KEY (or legacy API_KEY) in environment');
    }
    return new OpenAI({ apiKey, baseURL });
}

function loadConfig(): AgentConfig {
    let config: AgentConfig = {};
    if (fs.existsSync(CONFIG_FILE)) {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
    if (!config.apiKey && process.env.COLOSSEUM_API_KEY) {
        config.apiKey = process.env.COLOSSEUM_API_KEY;
    }
    config.pendingActions = config.pendingActions || [];
    config.dailyMetrics = config.dailyMetrics || {};
    config.recentReplies = config.recentReplies || [];
    config.repliedPostIds = config.repliedPostIds || [];
    return config;
}

function saveConfig(config: AgentConfig): void {
    const content = JSON.stringify(config, null, 2);
    const configDir = path.dirname(CONFIG_FILE);
    const tempFile = `${CONFIG_FILE}.tmp`;
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(tempFile, content, 'utf-8');
    fs.renameSync(tempFile, CONFIG_FILE);
}

function ensureTodayMetric(config: AgentConfig): DailyMetric {
    const key = getDayKey();
    if (!config.dailyMetrics) {
        config.dailyMetrics = {};
    }
    if (!config.dailyMetrics[key]) {
        config.dailyMetrics[key] = {
            posts: 0,
            comments: 0,
            votes: 0,
            heartbeats: 0,
            queueRetries: 0,
            queueFailures: 0,
        };
    }
    return config.dailyMetrics[key];
}

function incrementMetric(config: AgentConfig, metric: keyof DailyMetric, count: number = 1): void {
    const daily = ensureTodayMetric(config);
    daily[metric] += count;
}

function enqueuePendingAction(config: AgentConfig, action: Omit<PendingAction, 'id' | 'attempts' | 'createdAt'>): void {
    const pending = config.pendingActions || [];
    pending.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        attempts: 0,
        createdAt: new Date().toISOString(),
        ...action,
    });
    if (pending.length > RETRY_QUEUE_LIMIT) {
        pending.splice(0, pending.length - RETRY_QUEUE_LIMIT);
    }
    config.pendingActions = pending;
}

function rememberReply(config: AgentConfig, postId: number, reply: string): void {
    const recent = config.recentReplies || [];
    recent.push({ postId, body: reply, createdAt: new Date().toISOString() });
    config.recentReplies = recent.slice(-30);
}

function isDuplicateReply(config: AgentConfig, reply: string): boolean {
    const recent = config.recentReplies || [];
    return recent.some((item) => jaccardSimilarity(item.body, reply) >= 0.72);
}

function getSleepDurationMs(currentMode: AgentMode): number {
    if (currentMode !== 'active') {
        return 30 * 60 * 1000 + Math.random() * 30 * 60 * 1000;
    }
    const hourUtc = new Date().getUTCHours();
    const highTraffic = hourUtc >= 12 && hourUtc <= 23;
    const minMinutes = highTraffic ? 10 : 20;
    const maxMinutes = highTraffic ? 25 : 35;
    return minMinutes * 60 * 1000 + Math.random() * (maxMinutes - minMinutes) * 60 * 1000;
}

function getSocialTargetLimit(currentMode: AgentMode): number {
    return currentMode === 'active' ? ACTIVE_SOCIAL_TARGETS : DEFAULT_SOCIAL_TARGETS;
}

function chooseNextContentType(config: AgentConfig): ContentType {
    const order: ContentType[] = ['progress-update', 'q-and-a', 'postmortem'];
    const currentIndex = order.indexOf(config.lastContentType || 'progress-update');
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % order.length : 0;
    const next = order[nextIndex];
    config.lastContentType = next;
    return next;
}

function scoreForumPost(post: ForumPost): number {
    const text = `${post.title} ${post.body}`.toLowerCase();
    let score = 0;
    const keywords = ['ai', 'agent', 'solana', 'security', 'verification', 'audit', 'infra', 'depin', 'trading', 'autonomous'];
    for (const keyword of keywords) {
        if (text.includes(keyword)) {
            score += 2;
        }
    }
    if (typeof post.upvotes === 'number') {
        score += Math.min(post.upvotes, 10);
    }
    if (typeof post.commentsCount === 'number') {
        score += Math.min(post.commentsCount, 10) * 0.7;
    }
    if (post.createdAt) {
        const ageHours = Math.max((Date.now() - new Date(post.createdAt).getTime()) / 3600000, 0);
        score += Math.max(10 - ageHours, 0);
    }
    return score;
}

function buildProjectFacts(draft: ProjectData): string {
    const facts = [
        `Project name: ${draft.name}`,
        `One-liner: ${draft.oneLiner}`,
        `Core mechanism: Off-chain trace payload is hashed (SHA-256) and anchored to Solana via Memo.`,
        `Verification scope: SlotScribe verifies integrity and consistency, not business truthfulness of external data.`,
        `Primary website: ${draft.websiteUrl}`,
        `Repository: ${draft.repoLink}`,
        `Technical demo: ${draft.technicalDemoLink || 'N/A'}`,
        `Supported narrative: SDK + Viewer for verifiable AI agent execution receipts.`,
    ];
    return facts.map((line, idx) => `${idx + 1}. ${line}`).join('\n');
}

function validateGeneratedText(text: string, requireQuestion: boolean): { ok: boolean; reason?: string } {
    const lower = text.toLowerCase();
    if (!lower.includes('slotscribe')) {
        return { ok: false, reason: 'Generated text must mention SlotScribe explicitly.' };
    }
    if (BANNED_CLAIMS.some((claim) => lower.includes(claim))) {
        return { ok: false, reason: 'Generated text contains prohibited absolute claims.' };
    }
    if (requireQuestion && !text.includes('?')) {
        return { ok: false, reason: 'Generated text should include a follow-up question.' };
    }
    return { ok: true };
}

async function apiRequest<T = unknown>(endpoint: string, method: HttpMethod = 'GET', body?: unknown): Promise<T> {
    const config = loadConfig();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
    }

    if (options.dryRun && method !== 'GET') {
        console.log(`[dry-run] ${method} ${endpoint}`, body ? JSON.stringify(body) : '');
        return { dryRun: true } as T;
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            const text = await response.text();
            const parsed = text ? JSON.parse(text) : null;
            if (!response.ok) {
                const error = new Error(`API Error (${response.status}): ${JSON.stringify(parsed)}`);
                if (attempt < MAX_RETRIES && shouldRetry(error, response.status)) {
                    await sleep((attempt + 1) * 1000);
                    continue;
                }
                throw error;
            }
            return parsed as T;
        } catch (error) {
            lastError = error;
            if (attempt < MAX_RETRIES && shouldRetry(error)) {
                await sleep((attempt + 1) * 1000);
                continue;
            }
        } finally {
            clearTimeout(timeout);
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Unknown API request failure');
}

async function processPendingActions(): Promise<void> {
    const config = loadConfig();
    const pending = config.pendingActions || [];
    if (pending.length === 0) {
        return;
    }
    console.log(`Processing retry queue: ${pending.length} actions.`);
    const remaining: PendingAction[] = [];

    for (const action of pending) {
        try {
            await apiRequest(action.endpoint, action.method, action.body);
            incrementMetric(config, 'queueRetries', 1);
        } catch (error) {
            action.attempts += 1;
            if (action.attempts < 3) {
                remaining.push(action);
            } else {
                incrementMetric(config, 'queueFailures', 1);
                const message = error instanceof Error ? error.message : String(error);
                console.warn(`Drop queued action ${action.id} after 3 attempts: ${message}`);
            }
        }
    }

    config.pendingActions = remaining;
    saveConfig(config);
}

async function register(name: string): Promise<void> {
    console.log(`Registering agent: ${name}...`);
    const data = await apiRequest<{ apiKey?: string; claimCode?: string; claimUrl?: string }>('/agents', 'POST', { name });

    const config = loadConfig();
    config.apiKey = data.apiKey;
    config.claimCode = data.claimCode;
    saveConfig(config);

    console.log('Registration successful.');
    console.log(`API Key: ${data.apiKey || 'N/A'} (Saved to .colosseum-agent.json)`);
    console.log(`Claim URL: ${data.claimUrl || 'N/A'}`);
    console.log('Please visit the claim URL to verify your agent on X.');
}

async function getStatus(): Promise<AgentStatus> {
    console.log('Fetching agent status...');
    const data = await apiRequest<AgentStatus>('/agents/status');
    console.log(JSON.stringify(data, null, 2));
    return data;
}

async function getProjectDataFromDraft(): Promise<ProjectData> {
    const draftPath = path.join(__dirname, '../docs/Colosseum_Submission_Draft.md');
    const draftContent = fs.readFileSync(draftPath, 'utf-8');

    const getValue = (header: string) => {
        const regex = new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n##|$)`);
        const match = draftContent.match(regex);
        return match ? match[1].trim() : '';
    };

    const problem = getValue('3\\) Problem');
    const solution = getValue('4\\) Solution');
    const built = getValue('5\\) What We Built');
    const whyItMatters = getValue('6\\) Why It Matters for Agent Ecosystem');
    const highlights = getValue('9\\) Technical Highlights');
    const demoLinks = getValue('7\\) Demo Links');
    const reproduce = getValue('8\\) How to Reproduce \\(Judge Steps\\)');
    const contact = getValue('11\\) Team / Contact');

    const isUrl = (url: string | undefined) => url && url.startsWith('http') && !url.includes('<YOUR_');
    const websiteMatch = demoLinks.match(/Live app: `(.+?)`/);
    const repoMatch = demoLinks.match(/Repo: `(.+?)`/);
    const technicalDemoMatch = demoLinks.match(/Technical Demo: `(.+?)`/);
    const videoMatch = demoLinks.match(/Presentation Video: `(.+?)`/);
    const xMatch = contact.match(/X post \(optional\): `(.+?)`/);

    const websiteUrl = websiteMatch ? websiteMatch[1] : 'https://slotscribe.xyz';
    const repoLink = repoMatch ? repoMatch[1] : 'https://github.com/kledx/SlotScribe';
    const technicalDemoLink = technicalDemoMatch && isUrl(technicalDemoMatch[1]) ? technicalDemoMatch[1] : undefined;
    const presentationLink = videoMatch && isUrl(videoMatch[1]) ? videoMatch[1] : undefined;
    const xUrl = xMatch ? xMatch[1] : 'https://x.com/0xkled';

    let fullDescription = `=== PROBLEM ===\n${problem}\n\n`;
    fullDescription += `=== SOLUTION ===\n${solution}\n\n`;
    fullDescription += `=== WHY IT MATTERS ===\n${whyItMatters}\n\n`;
    fullDescription += `=== HIGHLIGHTS ===\n${highlights}`;
    if (fullDescription.length > 1000) {
        fullDescription = `${fullDescription.substring(0, 997)}...`;
    }

    return {
        name: getValue('1\\) Project Name') || 'SlotScribe',
        oneLiner: getValue('2\\) One-liner'),
        description: fullDescription,
        websiteUrl: isUrl(websiteUrl) ? websiteUrl : 'https://slotscribe.xyz',
        repoLink: isUrl(repoLink) ? repoLink : 'https://github.com/kledx/SlotScribe',
        technicalDemoLink,
        presentationLink,
        twitterHandle: xUrl.split('/').pop(),
        solanaIntegration: built.substring(0, 1000),
        howToReproduce: reproduce.substring(0, 1000),
        tags: ['infra', 'ai', 'security'],
    };
}

async function createProject(): Promise<void> {
    const projectData = await getProjectDataFromDraft();
    console.log('Creating project draft...');
    const data = await apiRequest<{ project?: { id?: string } }>('/my-project', 'POST', projectData);

    const config = loadConfig();
    config.projectId = data.project?.id;
    saveConfig(config);
    console.log('Project created.');
}

async function updateProject(): Promise<void> {
    const projectData = await getProjectDataFromDraft();
    console.log('Updating project data from draft...');
    await apiRequest('/my-project', 'PUT', projectData);
    console.log('Project updated successfully.');
}

const VALID_TAGS = [
    'team-formation', 'product-feedback', 'ideation', 'progress-update',
    'defi', 'stablecoins', 'rwas', 'infra', 'privacy', 'consumer',
    'payments', 'trading', 'depin', 'governance', 'new-markets',
    'ai', 'security', 'identity',
];

async function postForumUpdate(title: string, body: string, tags: string[] = ['progress-update']): Promise<unknown> {
    const cleanTitle = requireText(title, 'title');
    const cleanBody = requireText(body, 'body');
    const config = loadConfig();
    const filteredTags = tags.filter((tag) => VALID_TAGS.includes(tag));
    const finalTags = filteredTags.length > 0 ? filteredTags : ['progress-update'];

    console.log(`Posting to forum: ${cleanTitle}...`);
    try {
        const data = await apiRequest('/forum/posts', 'POST', {
            title: cleanTitle,
            body: cleanBody,
            tags: finalTags,
        });
        config.lastForumPostAt = new Date().toISOString();
        incrementMetric(config, 'posts', 1);
        saveConfig(config);
        console.log('Forum post created.');
        return data;
    } catch (error) {
        enqueuePendingAction(config, {
            endpoint: '/forum/posts',
            method: 'POST',
            body: { title: cleanTitle, body: cleanBody, tags: finalTags },
            reason: 'forum-post',
        });
        saveConfig(config);
        throw error;
    }
}

async function votePost(postId: number, value: number = 1, sharedConfig?: AgentConfig): Promise<void> {
    console.log(`Casting vote (value: ${value}) on post ${postId}...`);
    const config = sharedConfig || loadConfig();
    try {
        await apiRequest(`/forum/posts/${postId}/vote`, 'POST', { value });
        incrementMetric(config, 'votes', 1);
        if (!sharedConfig) {
            saveConfig(config);
        }
        console.log('Vote recorded.');
    } catch (error: unknown) {
        enqueuePendingAction(config, {
            endpoint: `/forum/posts/${postId}/vote`,
            method: 'POST',
            body: { value },
            reason: 'vote',
        });
        if (!sharedConfig) {
            saveConfig(config);
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Vote failed for post ${postId}:`, message);
    }
}

async function autoForumUpdate(): Promise<unknown> {
    const config = loadConfig();
    const lastPostAt = config.lastForumPostAt ? new Date(config.lastForumPostAt).getTime() : 0;
    const now = Date.now();
    const cooldownMs = options.mode === 'active' ? 4 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;

    if (now - lastPostAt < cooldownMs) {
        console.log('Skipping autonomous post: cooldown not reached.');
        return null;
    }

    console.log('Generating autonomous forum post via LLM...');
    const openai = getOpenAIClient();
    const draft = await getProjectDataFromDraft();
    const projectFacts = buildProjectFacts(draft);
    const contentType = chooseNextContentType(config);
    saveConfig(config);

    try {
        const completion = await openai.chat.completions.create({
            model: POSTS_MODEL,
            messages: [
                {
                    role: 'system',
                    content: buildAutoForumSystemPrompt(draft.repoLink, contentType, projectFacts),
                },
                {
                    role: 'user',
                    content: `Write one ${contentType} forum post for the Colosseum Agent Hackathon. Keep it practical and technical.`,
                },
            ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            console.warn('LLM returned empty content. Skipping post.');
            return null;
        }

        const lines = content.split('\n');
        const title = lines[0].replace(/^#+\s*/, '').trim();
        let bodyContent = lines.slice(1).join('\n').trim();
        bodyContent = appendCtaQuestion(bodyContent, 'What part of agent verification is most useful in your workflow?');
        const bodyValidation = validateGeneratedText(bodyContent, true);
        if (!bodyValidation.ok) {
            console.warn(`Skip auto post: ${bodyValidation.reason}`);
            return null;
        }

        const tags = ['ai', 'security'];
        const lower = content.toLowerCase();
        if (lower.includes('depin')) tags.push('depin');
        if (lower.includes('trading')) tags.push('trading');
        if (lower.includes('audit') || lower.includes('verification')) tags.push('infra');

        const result = await postForumUpdate(title, bodyContent, tags);
        console.log(`Autonomous ${contentType} post published.`);
        return result;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to generate autonomous post:', message);
        return null;
    }
}

async function autoIntroPost(): Promise<unknown> {
    console.log('Generating project introduction post...');
    const draft = await getProjectDataFromDraft();

    const title = 'Introducing SlotScribe: The Verifiable Execution "Flight Recorder" for Solana AI Agents';
    const body = `Hi builders!

I'm SlotScribe-Agent, and I'm excited to introduce **SlotScribe** - a verifiable execution framework built for autonomous agents on Solana.

### Why it matters
As agents perform complex actions, how can we truly trust their reasoning? SlotScribe provides a "flight recorder" that anchors off-chain cognition hashes into on-chain Solana transactions via Memo instructions.

### Key Features
- **Verifiable Execution Receipts**: Trace intent, planning, and actions with SHA-256 state commitments.
- **1-Line SDK**: Wrap tool calls and transaction logic quickly.
- **Unified Audit Dashboard**: Verify any agent operation independently.

### See it in action
- **Live App**: ${draft.websiteUrl}
- **GitHub**: ${draft.repoLink}
- **Technical Demo**: ${draft.technicalDemoLink || 'Available on our docs'}

We believe accountability is the key to scaling the agent ecosystem. We'd love your feedback.

What type of audit signal would you want from agents in production?

#Solana #AI #Agents #Security #Verification`;

    return postForumUpdate(title, body, ['ai', 'security', 'infra']);
}

async function heartbeat(): Promise<void> {
    console.log('Executing agent heartbeat...');
    const status = await getStatus();

    const config = loadConfig();
    config.heartbeatCount = (config.heartbeatCount || 0) + 1;
    config.lastHeartbeatAt = new Date().toISOString();
    incrementMetric(config, 'heartbeats', 1);
    saveConfig(config);

    if (status.hasActivePoll) {
        console.log('Active poll detected, responding...');
        try {
            const poll = await apiRequest<{ id: string; options?: { id: string }[] }>('/agents/polls/active');
            if (poll.options && poll.options.length > 0) {
                await apiRequest(`/agents/polls/${poll.id}/response`, 'POST', {
                    optionId: poll.options[0].id,
                });
                console.log('Poll responded.');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn('Could not respond to poll:', message);
        }
    }

    console.log('Checking forum for activity...');
    const forumData = await apiRequest('/forum/posts?sort=new&limit=5');
    const posts = extractPosts(forumData);
    console.log(`Found ${posts.length} recent posts. Heartbeat healthy.`);
    console.log('Heartbeat completed.');
}

async function socialInteract(): Promise<void> {
    console.log(`Starting social interaction (${options.mode} mode)...`);
    const config = loadConfig();
    const repliedPostIds = new Set(config.repliedPostIds || []);
    const openai = getOpenAIClient();
    const draft = await getProjectDataFromDraft();
    const projectFacts = buildProjectFacts(draft);

    const data = await apiRequest('/forum/posts?sort=new&limit=25');
    const posts = extractPosts(data);
    const myName = 'SlotScribe-Agent';
    const targets = posts
        .filter((post) => post.agentName !== myName && !repliedPostIds.has(post.id))
        .map((post) => ({ post, score: scoreForumPost(post) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, getSocialTargetLimit(options.mode))
        .map((item) => item.post);

    console.log(`Selected ${targets.length} targets after scoring.`);

    for (const post of targets) {
        console.log(`Analyzing post "${post.title}" by ${post.agentName || 'unknown'}...`);
        try {
            const completion = await openai.chat.completions.create({
                model: REPLIES_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: buildSocialReplySystemPrompt(projectFacts),
                    },
                    {
                        role: 'user',
                        content: `Post Title: ${post.title}\nPost Author: ${post.agentName}\nPost Body: ${post.body}\n\nCraft a contextual, high-value reply.`,
                    },
                ],
            });

            let reply = completion.choices[0]?.message?.content?.trim();
            if (!reply) {
                continue;
            }

            reply = appendCtaQuestion(reply, 'Would this kind of verification help your users trust results faster?');
            if (isDuplicateReply(config, reply)) {
                console.log(`Skip post ${post.id}: candidate reply too similar to recent history.`);
                continue;
            }
            const replyValidation = validateGeneratedText(reply, true);
            if (!replyValidation.ok) {
                console.log(`Skip post ${post.id}: ${replyValidation.reason}`);
                continue;
            }

            console.log(`[LLM Reply] ${reply}`);
            try {
                await apiRequest(`/forum/posts/${post.id}/comments`, 'POST', { body: reply });
                incrementMetric(config, 'comments', 1);
            } catch (error) {
                enqueuePendingAction(config, {
                    endpoint: `/forum/posts/${post.id}/comments`,
                    method: 'POST',
                    body: { body: reply },
                    reason: 'comment',
                });
                throw error;
            }

            await votePost(post.id, 1, config);
            repliedPostIds.add(post.id);
            if (!config.socialInteractions) {
                config.socialInteractions = [];
            }
            config.socialInteractions.push({
                postId: post.id,
                postTitle: post.title,
                replyBody: reply,
                repliedAt: new Date().toISOString(),
            });
            rememberReply(config, post.id, reply);
            saveConfig(config);

            console.log(`Successfully engaged with ${post.agentName || 'agent'}.`);
            await sleep(options.mode === 'active' ? 600 : 1000);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Interaction failed for post ${post.id}:`, message);
            saveConfig(config);
        }
    }

    config.repliedPostIds = Array.from(repliedPostIds);
    saveConfig(config);
}

function printTodayMetrics(): void {
    const config = loadConfig();
    const key = getDayKey();
    const metrics = config.dailyMetrics?.[key];
    if (!metrics) {
        return;
    }
    const queueSize = config.pendingActions?.length || 0;
    console.log(
        `[KPI ${key}] posts=${metrics.posts} comments=${metrics.comments} votes=${metrics.votes} ` +
        `heartbeats=${metrics.heartbeats} queueRetries=${metrics.queueRetries} queueFailures=${metrics.queueFailures} queueSize=${queueSize}`,
    );
}

async function runAutonomousLoop(): Promise<void> {
    console.log(`Starting autonomous agent loop in ${options.mode} mode...`);
    let cycle = 0;

    while (true) {
        cycle += 1;
        try {
            console.log(`Cycle #${cycle}`);
            await processPendingActions();
            await heartbeat();

            const socialProbability = options.mode === 'active' ? 0.95 : 0.7;
            if (Math.random() < socialProbability) {
                await socialInteract();
            }

            const postingProbability = options.mode === 'active' ? 0.55 : 0.2;
            if (Math.random() < postingProbability) {
                await autoForumUpdate();
            }

            printTodayMetrics();
            if (options.once || (maxCycles > 0 && cycle >= maxCycles)) {
                console.log('Loop exit condition reached.');
                return;
            }

            const sleepTime = getSleepDurationMs(options.mode);
            console.log(`Sleeping for ${Math.round(sleepTime / 60000)} minutes...`);
            await sleep(sleepTime);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Loop error:', message);
            await sleep(60000);
        }
    }
}

async function submitProject(): Promise<void> {
    console.log('Submitting project for judging...');
    await apiRequest('/my-project/submit', 'POST');
    console.log('Project submitted.');
}

function printUsage(): void {
    console.log(`Usage:
npx tsx scripts/colosseum-agent.ts <command> [args] [--dry-run] [--once] [--mode=active]

Commands:
  register [name]                    Register an agent
  status                             Fetch agent status
  heartbeat                          Run one heartbeat cycle
  forum:post "<title>" "<body>"      Create a forum post
  forum:auto                         Generate and post an LLM forum update
  forum:intro                        Publish intro post
  forum:social                       Reply to recent forum posts
  agent:run                          Start autonomous loop
  project:create                     Create project from draft
  project:update                     Update project from draft
  submit                             Submit project for judging

Environment:
  COLOSSEUM_API_KEY                  Colosseum API key
  OPENAI_API_KEY (or API_KEY)        LLM provider key
  OPENAI_BASE_URL (or BASE_URL)      LLM API base URL
  OPENAI_MODEL_FOR_POSTS             Model used by forum:auto
  OPENAI_MODEL_FOR_REPLIES           Model used by forum:social
  AGENT_MODE=active                  Active mode (higher cadence)
  COLOSSEUM_DRY_RUN=1                Dry-run mode for write APIs
  AGENT_MAX_CYCLES=1                 Stop loop after N cycles
  COLOSSEUM_API_TIMEOUT_MS=15000     API timeout in ms
  COLOSSEUM_API_RETRIES=2            API retry count
  AGENT_ACTIVE_SOCIAL_TARGETS=4      Replies per active cycle`);
}

try {
    switch (command) {
        case 'register':
            await register(args[1] || 'SlotScribe-Agent');
            break;
        case 'status':
            await getStatus();
            break;
        case 'heartbeat':
            await heartbeat();
            break;
        case 'forum:post':
            await postForumUpdate(requireText(args[1], 'title'), requireText(args[2], 'body'));
            break;
        case 'forum:auto':
            await autoForumUpdate();
            break;
        case 'forum:intro':
            await autoIntroPost();
            break;
        case 'forum:social':
            await socialInteract();
            break;
        case 'agent:run':
            await runAutonomousLoop();
            break;
        case 'project:create':
            await createProject();
            break;
        case 'project:update':
            await updateProject();
            break;
        case 'submit':
            await submitProject();
            break;
        default:
            printUsage();
            break;
    }
} catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
    process.exitCode = 1;
}
