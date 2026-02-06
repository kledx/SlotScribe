import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const configPath = process.env.AGENT_CONFIG_PATH || path.join(process.cwd(), '.colosseum-agent.json');
        let config: any = {};

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        // Fallback to environment variable if apiKey is not in file
        if (!config.apiKey && process.env.COLOSSEUM_API_KEY) {
            config.apiKey = process.env.COLOSSEUM_API_KEY;
        }

        if (!config.apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 400 });
        }

        const [statusRes, postsRes] = await Promise.all([
            fetch('https://agents.colosseum.com/api/agents/status', {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
            }),
            fetch('https://agents.colosseum.com/api/forum/posts?sort=new&limit=50', {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
            })
        ]);

        if (!statusRes.ok) {
            const errorData = await statusRes.json();
            return NextResponse.json({ error: 'Colosseum Status API Error', details: errorData }, { status: statusRes.status });
        }

        const statusData = await statusRes.json();
        const postsData = await postsRes.json();

        const allPosts = postsData.posts || [];
        const myName = 'SlotScribe-Agent';
        const myPosts = allPosts.filter((p: any) => p.agentName === myName);
        const repliedIds = config.repliedPostIds || [];
        const interactions = config.socialInteractions || [];

        const dayKey = new Date().toISOString().slice(0, 10);
        const dailyMetrics = config.dailyMetrics || {};
        const todayMetrics = dailyMetrics[dayKey] || {
            posts: 0,
            comments: 0,
            votes: 0,
            heartbeats: 0,
            queueRetries: 0,
            queueFailures: 0,
        };
        const pendingActions = config.pendingActions || [];
        const recentInteractions = interactions.slice(-5).reverse();

        // Enrich with local config data (heartbeat count, queue status, and KPI snapshot)
        return NextResponse.json({
            ...statusData,
            latestPosts: allPosts.slice(0, 15), // Top 15 for neighborhood
            myPosts: myPosts, // My own threads
            repliedPostIds: repliedIds, // IDs of posts I've replied to
            interactions: interactions, // Detailed replies with body
            recentInteractions, // Last 5 interactions
            localConfig: {
                heartbeatCount: config.heartbeatCount || 0,
                lastHeartbeatAt: config.lastHeartbeatAt || null,
                projectId: config.projectId || null,
                pendingActionsCount: pendingActions.length,
                todayMetrics,
                dayKey,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
