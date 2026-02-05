/**
 * Solana 相关工具函数
 */

import {
    Connection,
    PublicKey,
    TransactionInstruction,
    type ParsedTransactionWithMeta,
    type VersionedTransactionResponse,
} from '@solana/web3.js';
import type { ParsedTxSummary, SolanaCluster } from './types';

/** Memo Program ID */
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/** System Program ID */
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

/**
 * 获取 Solana RPC URL
 */
export function getRpcUrl(cluster: SolanaCluster, overrideUrl?: string): string {
    if (overrideUrl) {
        return overrideUrl;
    }

    switch (cluster) {
        case 'mainnet-beta':
            return 'https://api.mainnet-beta.solana.com';
        case 'testnet':
            return 'https://api.testnet.solana.com';
        case 'devnet':
            return 'https://api.devnet.solana.com';
        case 'localnet':
            return 'http://localhost:8899';
        default:
            return 'https://api.devnet.solana.com';
    }
}

/**
 * 创建 Solana Connection
 */
export function getConnection(cluster: SolanaCluster, overrideUrl?: string): Connection {
    const url = getRpcUrl(cluster, overrideUrl);
    return new Connection(url, 'confirmed');
}

/**
 * 构建 Memo 指令
 */
export function buildMemoIx(memo: string): TransactionInstruction {
    return new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, 'utf8'),
    });
}

/**
 * 解析 SlotScribe Memo 内容
 * 格式: BBX1 payload=<hash>
 */
export function extractSlotScribeMemo(memoData: string): { payloadHash?: string; raw: string } {
    const raw = memoData.trim();

    // 匹配 BBX1 payload=<hash> 格式
    const match = raw.match(/^BBX1\s+payload=([a-fA-F0-9]{64})$/);

    if (match) {
        return {
            payloadHash: match[1].toLowerCase(),
            raw,
        };
    }

    return { raw };
}

/**
 * 从交易响应中查找 Memo 指令数据
 */
export function findMemoInTransaction(
    txResponse: ParsedTransactionWithMeta | VersionedTransactionResponse | null
): string | null {
    if (!txResponse) return null;

    const meta = txResponse.meta;
    if (!meta) return null;

    // 尝试从 parsed transaction 获取
    if ('transaction' in txResponse && txResponse.transaction) {
        const tx = txResponse.transaction;

        // Check if it's a parsed transaction
        if ('message' in tx && tx.message) {
            const message = tx.message as {
                instructions?: Array<{
                    programId?: PublicKey | string;
                    program?: string;
                    parsed?: string;
                    data?: string;
                }>;
                accountKeys?: Array<{ pubkey: PublicKey }>;
            };

            if (message.instructions) {
                for (const ix of message.instructions) {
                    // Check parsed memo
                    if (ix.program === 'spl-memo' && typeof ix.parsed === 'string') {
                        return ix.parsed;
                    }

                    // Check by program ID
                    const programId = ix.programId;
                    if (programId) {
                        const programIdStr = typeof programId === 'string' ? programId : programId.toBase58();
                        if (programIdStr === MEMO_PROGRAM_ID.toBase58() && ix.data) {
                            // 尝试解码 data
                            return decodeMemoData(ix.data);
                        }
                    }
                }
            }
        }
    }

    // 尝试从 inner instructions 获取
    if (meta.innerInstructions) {
        for (const inner of meta.innerInstructions) {
            for (const ix of inner.instructions) {
                if ('parsed' in ix && ix.program === 'spl-memo') {
                    return ix.parsed as string;
                }
            }
        }
    }

    // 尝试从 log messages 获取
    if (meta.logMessages) {
        for (const log of meta.logMessages) {
            // Memo program logs the data directly
            if (log.startsWith('Program log: Memo')) {
                const match = log.match(/Memo \(len \d+\): "(.+)"$/);
                if (match) {
                    return match[1];
                }
            }
            // 直接查找 BBX1 格式
            if (log.includes('BBX1 payload=')) {
                const match = log.match(/BBX1 payload=[a-fA-F0-9]{64}/);
                if (match) {
                    return match[0];
                }
            }
        }
    }

    return null;
}

/**
 * 解码 Memo 数据
 */
function decodeMemoData(data: string): string {
    try {
        // 尝试 base58 解码
        const bytes = Buffer.from(data, 'base64');
        return new TextDecoder().decode(bytes);
    } catch {
        try {
            // 直接尝试 UTF-8
            return data;
        } catch {
            return data;
        }
    }
}

/**
 * 从交易响应中提取摘要信息
 */
export function summarizeTransaction(
    txResponse: ParsedTransactionWithMeta | VersionedTransactionResponse | null
): ParsedTxSummary {
    const result: ParsedTxSummary = {
        fee: 0,
        programs: [],
    };

    if (!txResponse || !txResponse.meta) {
        return result;
    }

    // 获取 fee
    result.fee = txResponse.meta.fee;

    // 获取 program IDs
    const programSet = new Set<string>();

    if ('transaction' in txResponse && txResponse.transaction) {
        const tx = txResponse.transaction;
        if ('message' in tx && tx.message) {
            const message = tx.message as {
                instructions?: Array<{
                    programId?: PublicKey | string;
                    program?: string;
                    parsed?: {
                        type?: string;
                        info?: {
                            destination?: string;
                            lamports?: number;
                        };
                    };
                }>;
            };

            if (message.instructions) {
                for (const ix of message.instructions) {
                    if (ix.programId) {
                        const id = typeof ix.programId === 'string' ? ix.programId : ix.programId.toBase58();
                        programSet.add(id);
                    }

                    // 尝试解析 transfer 信息
                    if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
                        result.to = ix.parsed.info?.destination;
                        result.lamports = ix.parsed.info?.lamports;
                    }
                }
            }
        }
    }

    result.programs = Array.from(programSet);

    return result;
}

/**
 * 获取交易（支持 parsed 模式）
 */
export async function getParsedTransaction(
    connection: Connection,
    signature: string
): Promise<ParsedTransactionWithMeta | null> {
    return connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
    });
}
