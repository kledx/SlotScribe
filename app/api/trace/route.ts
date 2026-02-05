/**
 * Trace Upload API
 * 
 * POST /api/trace - 上传 trace（自动从 payloadHash 提取 hash）
 * 
 * 简化版端点，Agent 不需要在 URL 中指定 hash
 */

import { NextRequest, NextResponse } from 'next/server';
import { traceStore } from '../../../lib/traceStore';
import { validateTraceIntegrity } from '../../../lib/traceIntegrity';
import type { Trace } from '../../../src/slotscribe/types';

/** CORS headers */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Create JSON response with CORS */
function jsonResponse(data: object, status = 200) {
    return NextResponse.json(data, { status, headers: corsHeaders });
}

/** OPTIONS - CORS preflight */
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** GET /api/trace - API info or list traces */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const listMode = searchParams.get('list') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (listMode) {
        try {
            const traces = await (traceStore as any).list(limit); // Use any for now as types might sync later
            return jsonResponse({
                success: true,
                count: traces.length,
                traces: traces.map((t: any) => ({
                    hash: t.hash,
                    version: t.trace.version,
                    createdAt: t.trace.createdAt,
                    intent: t.trace.payload.intent,
                    cluster: t.trace.payload.txSummary?.cluster || 'unknown',
                    signature: t.trace.onChain?.signature
                }))
            });
        } catch (err) {
            return jsonResponse({ error: 'Failed to list traces' }, 500);
        }
    }

    return jsonResponse({
        name: 'SlotScribe Trace API',
        version: '1.0.0',
        endpoints: {
            'GET /api/trace': 'API info',
            'GET /api/trace?list=true': 'List recent traces',
            'POST /api/trace': 'Upload a trace (hash extracted from payloadHash)',
            'GET /api/trace/:hash': 'Get a trace by hash',
            'POST /api/trace/:hash': 'Upload a trace to specific hash',
        },
    });
}

/** POST /api/trace - 上传 trace（自动提取 hash） */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 1. 验证 trace 结构
        if (!body.version || !body.payload || !body.payloadHash) {
            return jsonResponse(
                {
                    error: 'Invalid trace format',
                    message: 'Required fields: version, payload, payloadHash',
                    received: Object.keys(body)
                },
                400
            );
        }

        const trace = body as Trace;
        const hash = trace.payloadHash.toLowerCase();

        // 2. 验证 hash 格式
        if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
            return jsonResponse(
                {
                    error: 'Invalid payloadHash format',
                    message: 'Expected 64-character hex string (SHA-256)',
                    received: trace.payloadHash
                },
                400
            );
        }

        // 3. 验证 payloadHash 正确性（重新计算）
        const integrity = validateTraceIntegrity(trace);
        if (!integrity.ok) {
            return jsonResponse(
                {
                    error: 'Hash verification failed',
                    message: `Trace integrity check failed: ${integrity.error}.`,
                    computedHash: integrity.computedHash,
                    claimedHash: trace.payloadHash
                },
                400
            );
        }

        // 4. 允许在 Hash 一致的情况下更新 Trace（例如补全链上签名）
        const existing = await traceStore.get(hash);
        if (existing) {
            // 如果新旧 trace 的核心 payload 一致，允许覆盖以更新 onChain 或 debug 信息
            return jsonResponse(
                {
                    success: true,
                    hash,
                    message: 'Trace already exists (no overwrite)',
                    duplicate: true,
                    viewerUrl: `/verify?hash=${hash}${trace.onChain?.signature ? `&sig=${trace.onChain.signature}` : ''}`
                }
            );
        }

        // 5. 保存
        await traceStore.put(hash, trace);

        return jsonResponse(
            {
                success: true,
                hash,
                message: 'Trace saved successfully',
                viewerUrl: `/verify?hash=${hash}${trace.onChain?.signature ? `&sig=${trace.onChain.signature}` : ''}`,
                traceUrl: `/api/trace/${hash}`
            },
            201
        );

    } catch (err) {
        console.error('[Trace API] POST error:', err);
        return jsonResponse(
            {
                error: 'Failed to save trace',
                message: err instanceof Error ? err.message : String(err)
            },
            500
        );
    }
}
