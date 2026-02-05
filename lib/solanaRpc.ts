/**
 * Solana RPC 连接
 */

import { Connection } from '@solana/web3.js';
import type { SolanaCluster } from '../src/slotscribe/types';

import { DEFAULT_CLUSTER } from './constants';

/**
 * 获取 RPC URL
 */
export function getRpcUrl(cluster: SolanaCluster, overrideUrl?: string): string {
    if (overrideUrl) {
        return overrideUrl;
    }

    switch (cluster) {
        case 'mainnet-beta':
            return process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
        case 'testnet':
            return 'https://api.testnet.solana.com';
        case 'devnet':
            return process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com';
        case 'localnet':
            return 'http://localhost:8899';
        default:
            throw new Error(
                `Invalid Solana cluster: "${String(cluster)}". Valid values: mainnet-beta, devnet, testnet, localnet`
            );
    }
}

/**
 * 获取 Solana Connection
 */
export function getConnection(cluster: SolanaCluster, overrideUrl?: string): Connection {
    const url = getRpcUrl(cluster, overrideUrl);
    return new Connection(url, 'confirmed');
}
