/**
 * SlotScribe Trace Upload Helper
 * 
 * 提供便捷的 trace 上传功能
 */

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
    /** SlotScribe 服务 URL */
    baseUrl?: string;
    /** 请求超时（毫秒） */
    timeout?: number;
    /** 自定义 headers */
    headers?: Record<string, string>;
}

const DEFAULT_BASE_URL = 'https://slotscribe.xyz';
const DEFAULT_TIMEOUT = 10000;

/**
 * 上传 trace 到 SlotScribe 公共服务
 * 
 * @example
 * ```typescript
 * const trace = recorder.buildTrace();
 * const result = await uploadTrace(trace);
 * if (result.success) {
 *     console.log('Viewer:', result.viewerUrl);
 * }
 * ```
 */
export async function uploadTrace(
    trace: Trace,
    options: UploadOptions = {}
): Promise<UploadResult> {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const timeout = options.timeout || DEFAULT_TIMEOUT;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${baseUrl}/api/trace`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            body: JSON.stringify(trace),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || `HTTP ${response.status}`,
                message: data.message,
            };
        }

        return {
            success: true,
            hash: data.hash,
            message: data.message,
            viewerUrl: data.viewerUrl ? `${baseUrl}${data.viewerUrl}` : undefined,
            traceUrl: data.traceUrl ? `${baseUrl}${data.traceUrl}` : undefined,
            duplicate: data.duplicate,
        };

    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            return {
                success: false,
                error: 'Upload timeout',
                message: `Request timed out after ${timeout}ms`,
            };
        }

        return {
            success: false,
            error: 'Upload failed',
            message: err instanceof Error ? err.message : String(err),
        };
    }
}

/**
 * 保存 trace 到本地文件
 * 
 * @example
 * ```typescript
 * const trace = recorder.buildTrace();
 * const filePath = await saveTraceToFile(trace, './data/traces');
 * ```
 */
export async function saveTraceToFile(
    trace: Trace,
    dir = './data/traces'
): Promise<string> {
    // 动态导入 fs（仅在 Node.js 环境）
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');

    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${trace.payloadHash}.json`);
    await writeFile(filePath, JSON.stringify(trace, null, 2), 'utf8');

    return filePath;
}

/**
 * 保存 trace 的通用函数（自动选择本地或远程）
 */
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
    } else {
        const result = await uploadTrace(trace, { baseUrl: options.baseUrl });
        return {
            url: result.traceUrl,
            result
        };
    }
}
