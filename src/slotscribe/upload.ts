import type { Trace } from './types';

export interface UploadResult {
    success: boolean;
    hash?: string;
    message?: string;
    viewerUrl?: string;
    traceUrl?: string;
    error?: string;
    duplicate?: boolean;
}

export interface UploadOptions {
    baseUrl?: string;
    timeout?: number;
    headers?: Record<string, string>;
    retries?: number;
    retryDelayMs?: number;
    retryBackoff?: number;
}

export interface ReliableUploadOptions extends UploadOptions {
    queueOnFailure?: boolean;
    pendingDir?: string;
}

export interface RetryPendingResult {
    total: number;
    success: number;
    failed: number;
    uploaded: string[];
    remaining: string[];
}

const DEFAULT_BASE_URL = 'https://slotscribe.xyz';
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 800;
const DEFAULT_RETRY_BACKOFF = 2;
const DEFAULT_PENDING_DIR = './data/traces/pending';

function isNodeRuntime(): boolean {
    return typeof process !== 'undefined' && !!process.versions?.node;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(response: Response): Promise<any> {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function shouldRetry(err: unknown, status?: number): boolean {
    if (typeof status === 'number') {
        return status >= 500 || status === 408 || status === 429;
    }

    if (err instanceof Error) {
        if (err.name === 'AbortError') {
            return true;
        }

        const message = err.message.toLowerCase();
        return (
            message.includes('fetch') ||
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnreset') ||
            message.includes('etimedout')
        );
    }

    return false;
}

async function uploadTraceOnce(
    trace: Trace,
    options: UploadOptions = {}
): Promise<{ result: UploadResult; status?: number }> {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const timeout = options.timeout || DEFAULT_TIMEOUT;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`${baseUrl}/api/trace`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            body: JSON.stringify(trace),
            signal: controller.signal,
        });

        const data = await safeJson(response);

        if (!response.ok) {
            return {
                status: response.status,
                result: {
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                    message: data.message,
                },
            };
        }

        return {
            status: response.status,
            result: {
                success: true,
                hash: data.hash,
                message: data.message,
                viewerUrl: data.viewerUrl ? `${baseUrl}${data.viewerUrl}` : undefined,
                traceUrl: data.traceUrl ? `${baseUrl}${data.traceUrl}` : undefined,
                duplicate: data.duplicate,
            },
        };
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            return {
                result: {
                    success: false,
                    error: 'Upload timeout',
                    message: `Request timed out after ${timeout}ms`,
                },
            };
        }

        return {
            result: {
                success: false,
                error: 'Upload failed',
                message: err instanceof Error ? err.message : String(err),
            },
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function uploadTrace(
    trace: Trace,
    options: UploadOptions = {}
): Promise<UploadResult> {
    const retries = Math.max(0, options.retries ?? DEFAULT_RETRIES);
    const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
    const retryBackoff = Math.max(1, options.retryBackoff ?? DEFAULT_RETRY_BACKOFF);

    let attempt = 0;
    let delay = retryDelayMs;
    let lastResult: UploadResult = {
        success: false,
        error: 'Upload failed',
        message: 'Unknown error',
    };

    while (attempt <= retries) {
        const { result, status } = await uploadTraceOnce(trace, options);
        if (result.success) {
            return result;
        }

        lastResult = result;

        if (attempt === retries) {
            break;
        }

        if (!shouldRetry(result.message || result.error, status)) {
            break;
        }

        await sleep(delay);
        delay = Math.ceil(delay * retryBackoff);
        attempt += 1;
    }

    return lastResult;
}

export async function savePendingTrace(
    trace: Trace,
    pendingDir = DEFAULT_PENDING_DIR
): Promise<string | undefined> {
    if (!isNodeRuntime()) {
        return undefined;
    }

    try {
        const { mkdir, writeFile } = await import('fs/promises');
        const { join } = await import('path');

        await mkdir(pendingDir, { recursive: true });
        const fileName = `${Date.now()}-${trace.payloadHash}.json`;
        const filePath = join(pendingDir, fileName);
        await writeFile(filePath, JSON.stringify(trace, null, 2), 'utf8');

        return filePath;
    } catch (err) {
        console.error('[SlotScribe] Failed to persist pending trace:', err);
        return undefined;
    }
}

export async function uploadTraceReliable(
    trace: Trace,
    options: ReliableUploadOptions = {}
): Promise<UploadResult & { queuedPath?: string }> {
    const result = await uploadTrace(trace, options);
    if (result.success) {
        return result;
    }

    // Queueing to local disk is opt-in to avoid surprising end-user UX.
    if (options.queueOnFailure !== true) {
        return result;
    }

    const queuedPath = await savePendingTrace(trace, options.pendingDir || DEFAULT_PENDING_DIR);
    return {
        ...result,
        message: queuedPath
            ? `${result.message || 'Upload failed'}; saved to pending queue`
            : result.message,
        queuedPath,
    };
}

export async function retryPendingUploads(
    options: ReliableUploadOptions = {}
): Promise<RetryPendingResult> {
    const pendingDir = options.pendingDir || DEFAULT_PENDING_DIR;

    if (!isNodeRuntime()) {
        return {
            total: 0,
            success: 0,
            failed: 0,
            uploaded: [],
            remaining: [],
        };
    }

    const { readdir, readFile, unlink } = await import('fs/promises');
    const { join } = await import('path');

    let files: string[] = [];
    try {
        files = (await readdir(pendingDir)).filter((f) => f.endsWith('.json'));
    } catch {
        return {
            total: 0,
            success: 0,
            failed: 0,
            uploaded: [],
            remaining: [],
        };
    }

    const uploaded: string[] = [];
    const remaining: string[] = [];

    for (const file of files) {
        const filePath = join(pendingDir, file);
        try {
            const raw = await readFile(filePath, 'utf8');
            const trace = JSON.parse(raw) as Trace;
            const result = await uploadTrace(trace, options);

            if (result.success) {
                await unlink(filePath);
                uploaded.push(filePath);
            } else {
                remaining.push(filePath);
            }
        } catch {
            remaining.push(filePath);
        }
    }

    return {
        total: files.length,
        success: uploaded.length,
        failed: remaining.length,
        uploaded,
        remaining,
    };
}

export async function saveTraceToFile(
    trace: Trace,
    dir = './data/traces'
): Promise<string> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');

    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${trace.payloadHash}.json`);
    await writeFile(filePath, JSON.stringify(trace, null, 2), 'utf8');

    return filePath;
}

export async function saveTrace(
    trace: Trace,
    options: {
        kind: 'file' | 'http';
        dir?: string;
        baseUrl?: string;
    }
): Promise<{ path?: string; url?: string; result?: UploadResult }> {
    if (options.kind === 'file') {
        const path = await saveTraceToFile(trace, options.dir);
        return { path };
    }

    const result = await uploadTraceReliable(trace, {
        baseUrl: options.baseUrl,
        queueOnFailure: false,
    });

    return {
        url: result.traceUrl,
        result,
    };
}

