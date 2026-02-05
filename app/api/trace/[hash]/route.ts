/**
 * Trace API Route
 * 
 * GET /api/trace/[hash] - 获取 trace 文件
 * POST /api/trace/[hash] - 保存 trace 文件
 * 
 * 公共 API，支持跨域调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { traceStore } from '../../../../lib/traceStore';
import { canonicalizeJson } from '../../../../src/slotscribe/canonicalize';
import { sha256Hex } from '../../../../src/slotscribe/hash';
import type { Trace } from '../../../../src/slotscribe/types';

/** CORS headers for public API */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Validate hash format (64 hex chars) */
function isValidHash(hash: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(hash);
}

/** Create JSON response with CORS */
function jsonResponse(data: object, status = 200) {
    return NextResponse.json(data, { status, headers: corsHeaders });
}

/** OPTIONS - CORS preflight */
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** GET /api/trace/[hash] - 获取 trace */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    const { hash } = await params;

    if (!hash || !isValidHash(hash)) {
        return jsonResponse(
            {
                error: 'Invalid hash format',
                message: 'Expected 64-character hex string (SHA-256)',
                example: 'f853f6cf093b112d84b640d557b4f21fdc6e40d1226140ab278a3a37dc0bc75c'
            },
            400
        );
    }

    const trace = await traceStore.get(hash);

    if (!trace) {
        return jsonResponse(
            {
                error: 'Trace not found',
                hash,
                message: 'The trace for this hash has not been uploaded yet'
            },
            404
        );
    }

    return jsonResponse(trace);
}

/** POST /api/trace/[hash] - 保存 trace */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    const { hash } = await params;

    // 1. 验证 URL hash 格式
    if (!hash || !isValidHash(hash)) {
        return jsonResponse(
            {
                error: 'Invalid hash format',
                message: 'URL must contain a 64-character hex hash',
                example: 'POST /api/trace/f853f6cf093b112d84b640d557b4f21fdc6e40d1226140ab278a3a37dc0bc75c'
            },
            400
        );
    }

    try {
        const body = await request.json();

        // 2. 验证 trace 结构
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

        // 3. 验证 URL hash 与 payloadHash 匹配
        if (hash.toLowerCase() !== trace.payloadHash.toLowerCase()) {
            return jsonResponse(
                {
                    error: 'Hash mismatch',
                    message: 'URL hash must match trace.payloadHash',
                    urlHash: hash,
                    traceHash: trace.payloadHash
                },
                400
            );
        }

        // 4. 验证 payloadHash 正确性（重新计算）
        const payloadToHash = trace.hashedPayload || trace.payload;
        const canonical = canonicalizeJson(payloadToHash);
        const computedHash = sha256Hex(canonical);

        if (computedHash.toLowerCase() !== trace.payloadHash.toLowerCase()) {
            return jsonResponse(
                {
                    error: 'Hash verification failed',
                    message: 'Computed hash does not match trace.payloadHash. The trace may be tampered.',
                    computedHash,
                    claimedHash: trace.payloadHash
                },
                400
            );
        }

        // 5. 检查是否已存在
        const existing = await traceStore.get(hash);
        if (existing) {
            return jsonResponse(
                {
                    success: true,
                    hash,
                    message: 'Trace already exists (no overwrite)',
                    duplicate: true
                }
            );
        }

        // 6. 保存
        await traceStore.put(hash, trace);

        return jsonResponse(
            {
                success: true,
                hash,
                message: 'Trace saved successfully',
                viewerUrl: `/verify?hash=${hash}${trace.onChain?.signature ? `&sig=${trace.onChain.signature}` : ''}`
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
