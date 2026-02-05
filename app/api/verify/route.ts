/**
 * Verify API Route
 * 
 * GET /api/verify?cluster=devnet&signature=xxx&hash=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTxWithTrace } from '../../../lib/verifier';
import type { SolanaCluster } from '../../../src/slotscribe/types';

import { DEFAULT_CLUSTER } from '../../../lib/constants';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    const cluster = (searchParams.get('cluster') || DEFAULT_CLUSTER) as SolanaCluster;
    const signature = searchParams.get('signature');
    const hash = searchParams.get('hash') || undefined;
    const rpcUrl = searchParams.get('rpcUrl') || undefined;

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing required parameter: signature' },
            { status: 400 }
        );
    }

    try {
        const response = await verifyTxWithTrace({
            cluster,
            signature,
            hash,
            rpcUrl,
        });

        return NextResponse.json(response);
    } catch (err) {
        console.error('[Verify API] Error:', err);
        return NextResponse.json(
            {
                result: {
                    ok: false,
                    reasons: [`Server error: ${err instanceof Error ? err.message : String(err)}`],
                },
                error: String(err),
            },
            { status: 500 }
        );
    }
}
