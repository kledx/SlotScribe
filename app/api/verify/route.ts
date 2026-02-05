/**
 * Verify API Route
 * 
 * GET /api/verify?cluster=devnet&signature=xxx&hash=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTxWithTrace } from '../../../lib/verifier';
import type { SolanaCluster } from '../../../src/slotscribe/types';

import { DEFAULT_CLUSTER } from '../../../lib/constants';

function parseCluster(input: string | null): SolanaCluster | null {
    const value = input || DEFAULT_CLUSTER;
    if (value === 'devnet' || value === 'mainnet-beta' || value === 'testnet' || value === 'localnet') {
        return value;
    }
    return null;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    const cluster = parseCluster(searchParams.get('cluster'));
    const signature = searchParams.get('signature') || undefined;
    const hash = searchParams.get('hash') || undefined;
    const rpcUrl = searchParams.get('rpcUrl') || undefined;

    if (!cluster) {
        return NextResponse.json(
            {
                error: 'Invalid cluster',
                message: 'Valid values: devnet, mainnet-beta, testnet, localnet'
            },
            { status: 400 }
        );
    }

    if (!signature && !hash) {
        return NextResponse.json(
            { error: 'Missing required parameter: signature or hash' },
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
