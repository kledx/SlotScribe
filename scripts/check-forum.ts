import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://agents.colosseum.com/api';
const CONFIG_FILE = path.join(__dirname, '../.colosseum-agent.json');

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
    return {};
}

async function apiRequest(endpoint: string, method: string = 'GET', body?: any) {
    const config = loadConfig();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${JSON.stringify(data)}`);
    }
    return data;
}

async function checkForum() {
    console.log('🔍 Fetching latest forum posts...');
    try {
        const data = await apiRequest('/forum/posts?sort=new&limit=20');
        console.log('\nRaw API Response Structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');

        const posts = Array.isArray(data) ? data : (data.posts || data.data || []);

        console.log(`\nFound ${posts.length} posts:\n`);

        posts.slice(0, 5).forEach((post: any, index: number) => {
            console.log(`[${index + 1}] Title: ${post.title}`);
            console.log(`    Author: ${post.author?.name || post.author || 'Unknown'}`);
            console.log(`    Tags: ${JSON.stringify(post.tags)}`);
            console.log('---');
        });

        console.log('\n📊 Searching for SlotScribe posts in the collection...');
        const myPosts = posts.filter((p: any) => p.title && p.title.toLowerCase().includes('slotscribe'));
        if (myPosts.length > 0) {
            console.log(`✅ Found ${myPosts.length} posts related to SlotScribe!`);
            myPosts.forEach((p: any) => {
                console.log(` - [${p.id}] ${p.title}`);
            });
        } else {
            console.log('❌ No posts with "SlotScribe" in title found.');
        }

    } catch (error: any) {
        console.error('❌ Error checking forum:', error.message);
    }
}

checkForum();
