import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import type { Trace } from '../src/slotscribe/types';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/** 默认 traces 目录 */
const DEFAULT_TRACES_DIR = process.env.TRACES_DIR || './data/traces';

/**
 * TraceStore 接口
 */
export interface TraceStore {
    get(hash: string): Promise<Trace | null>;
    put(hash: string, trace: Trace): Promise<void>;
    list(limit?: number): Promise<Array<{ hash: string, trace: Trace }>>;
}

/**
 * 基于文件系统的 TraceStore 实现
 */
export class FileTraceStore implements TraceStore {
    private dir: string;

    constructor(dir?: string) {
        this.dir = dir || DEFAULT_TRACES_DIR;
    }

    private getFilePath(hash: string): string {
        return join(this.dir, `${hash}.json`);
    }

    async get(hash: string): Promise<Trace | null> {
        try {
            const filePath = this.getFilePath(hash);
            const content = await readFile(filePath, 'utf8');
            return JSON.parse(content) as Trace;
        } catch (err) {
            return null;
        }
    }

    async put(hash: string, trace: Trace): Promise<void> {
        const filePath = this.getFilePath(hash);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(trace, null, 2), 'utf8');
    }

    async list(limit = 50): Promise<Array<{ hash: string, trace: Trace }>> {
        try {
            const { readdir, stat } = await import('fs/promises');
            const files = await readdir(this.dir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            const tracesWithStats = await Promise.all(
                jsonFiles.map(async (file) => {
                    const filePath = join(this.dir, file);
                    const fileStat = await stat(filePath);
                    const hash = file.replace('.json', '');
                    const content = await readFile(filePath, 'utf8');
                    try {
                        const trace = JSON.parse(content) as Trace;
                        return { hash, trace, mtime: fileStat.mtime.getTime() };
                    } catch (e) {
                        return null;
                    }
                })
            );

            return (tracesWithStats.filter(t => t !== null) as any[])
                .sort((a, b) => b.mtime - a.mtime)
                .slice(0, limit)
                .map(({ hash, trace }) => ({ hash, trace }));

        } catch (err) {
            return [];
        }
    }
}

/**
 * 基于 Cloudflare R2 (S3) 的 TraceStore 实现
 */
export class R2TraceStore implements TraceStore {
    private s3: S3Client;
    private bucket: string;
    private listCache: Array<{ hash: string, trace: Trace }> | null = null;
    private lastListFetch = 0;
    private traceCache = new Map<string, Trace>();

    constructor() {
        this.s3 = new S3Client({
            region: 'auto',
            endpoint: process.env.R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
            },
        });
        this.bucket = process.env.R2_BUCKET_NAME || '';
    }

    async get(hash: string): Promise<Trace | null> {
        // 1. Check Memory Cache
        if (this.traceCache.has(hash)) {
            return this.traceCache.get(hash)!;
        }

        try {
            console.log(`[R2TraceStore] Getting ${hash}.json from bucket ${this.bucket}...`);
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: `${hash}.json`,
            });
            const response = await this.s3.send(command);
            const body = await response.Body?.transformToString();
            if (body) {
                const trace = JSON.parse(body) as Trace;
                // Add to cache (Trace is immutable by hash)
                this.traceCache.set(hash, trace);
                return trace;
            }
            return null;
        } catch (err) {
            console.error(`[R2TraceStore] Error getting ${hash}:`, err);
            return null;
        }
    }

    async put(hash: string, trace: Trace): Promise<void> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: `${hash}.json`,
                Body: JSON.stringify(trace, null, 2),
                ContentType: 'application/json',
            });
            await this.s3.send(command);

            // Update cache
            this.traceCache.set(hash, trace);
            this.listCache = null; // Invalidate list cache

            console.log(`[R2TraceStore] ✅ Successfully stored ${hash}.json to bucket ${this.bucket}`);
        } catch (err) {
            console.error(`[R2TraceStore] ❌ Failed to store ${hash}.json:`, err);
            throw err;
        }
    }

    async list(limit = 100): Promise<Array<{ hash: string, trace: Trace }>> {
        // 1. Check list cache (Valid for 10 seconds)
        const now = Date.now();
        if (this.listCache && (now - this.lastListFetch < 10000)) {
            return this.listCache.slice(0, limit);
        }

        try {
            console.log(`[R2TraceStore] Listing objects in ${this.bucket}...`);
            const command = new ListObjectsV2Command({
                Bucket: this.bucket,
                MaxKeys: 100, // Fetch recent only to save costs
            });
            const response = await this.s3.send(command);
            const contents = response.Contents || [];

            // Sort by LastModified descending
            const sortedContents = contents
                .filter(obj => obj.Key && obj.Key.endsWith('.json'))
                .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
                .slice(0, limit);

            const traces = await Promise.all(
                sortedContents.map(async (obj) => {
                    const hash = obj.Key!.replace('.json', '');
                    const trace = await this.get(hash); // Uses cache internally
                    return trace ? { hash, trace } : null;
                })
            );

            const results = traces.filter(t => t !== null) as any[];
            this.listCache = results;
            this.lastListFetch = now;

            return results;
        } catch (err) {
            console.error('[R2TraceStore] List error:', err);
            return [];
        }
    }
}

/**
 * 自动选择实例
 */
const useR2 = !!process.env.R2_BUCKET_NAME;

if (useR2) {
    console.log('[TraceStore] Initializing Cloudflare R2 Store with bucket:', process.env.R2_BUCKET_NAME);
} else {
    console.log('[TraceStore] R2_BUCKET_NAME not found, falling back to FileTraceStore');
}

export const traceStore: TraceStore = useR2
    ? new R2TraceStore()
    : new FileTraceStore();
