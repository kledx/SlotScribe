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

        // Enrich with local config data (heartbeat count, etc.)
        return NextResponse.json({
            ...statusData,
            latestPosts: allPosts.slice(0, 15), // Top 15 for neighborhood
            myPosts: myPosts, // My own threads
            repliedPostIds: repliedIds, // IDs of posts I've replied to
            interactions: interactions, // Detailed replies with body
            localConfig: {
                heartbeatCount: config.heartbeatCount || 0,
                lastHeartbeatAt: config.lastHeartbeatAt || null,
                projectId: config.projectId || null,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
