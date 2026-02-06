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

async function checkDetails() {
    try {
        const data = await apiRequest('/forum/posts?sort=new&limit=5');
        const posts = data.posts || [];
        const slotScribePost = posts.find((p: any) => p.title.includes('SlotScribe'));

        if (slotScribePost) {
            console.log('✅ Found Post Metadata:');
            console.log(JSON.stringify(slotScribePost, null, 2));
        } else {
            console.log('❌ SlotScribe post not found in top 5.');
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

checkDetails();
