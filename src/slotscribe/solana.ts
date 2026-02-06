/**
 * API note.
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
 * API note.
 * API note.
 */
export function normalizeCluster(cluster: string): SolanaCluster {
    const name = cluster.toLowerCase().trim();
    if (name === 'mainnet' || name === 'mainnet-beta') return 'mainnet-beta';
    if (name === 'devnet') return 'devnet';
    if (name === 'testnet') return 'testnet';
    if (name === 'localnet' || name === 'localhost' || name === '127.0.0.1') return 'localnet';

    throw new Error(
        `Invalid Solana cluster: "${cluster}". \nValid values are: "mainnet-beta", "devnet", "testnet", "localnet"`
    );
}

/**
 * API note.
 */
export function getRpcUrl(cluster: SolanaCluster | string, overrideUrl?: string): string {
    if (overrideUrl) {
        return overrideUrl;
    }

    const normalized = normalizeCluster(cluster);

    switch (normalized) {
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
 * API note.
 */
export function getConnection(cluster: SolanaCluster | string, overrideUrl?: string): Connection {
    const url = getRpcUrl(cluster, overrideUrl);
    return new Connection(url, 'confirmed');
}

/**
 * API note.
 */
export function buildMemoIx(memo: string): TransactionInstruction {
    return new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, 'utf8'),
    });
}

/**
 * API note.
 * API note.
 */
export function extractSlotScribeMemo(memoData: string): { payloadHash?: string; raw: string } {
    const raw = memoData.trim();

    // Note.
    const match = raw.match(/^(SS1|BBX1)\s+payload=([a-fA-F0-9]{64})$/);

    if (match) {
        return {
            payloadHash: match[2].toLowerCase(),
            raw,
        };
    }

    return { raw };
}

/**
 * API note.
 */
export function findMemoInTransaction(
    txResponse: ParsedTransactionWithMeta | VersionedTransactionResponse | null
): string | null {
    if (!txResponse) return null;

    const meta = txResponse.meta;
    if (!meta) return null;

    const allMemos: string[] = [];

    // Note.
    if ('transaction' in txResponse && txResponse.transaction) {
        const tx = txResponse.transaction;
        if ('message' in tx && tx.message) {
            const message = tx.message as {
                instructions?: Array<{
                    programId?: PublicKey | string;
                    program?: string;
                    parsed?: string;
                    data?: string;
                }>;
            };

            if (message.instructions) {
                for (const ix of message.instructions) {
                    if (ix.program === 'spl-memo' && typeof ix.parsed === 'string') {
                        allMemos.push(ix.parsed);
                    } else if (ix.programId) {
                        const id = typeof ix.programId === 'string' ? ix.programId : ix.programId.toBase58();
                        if (id === MEMO_PROGRAM_ID.toBase58() && ix.data) {
                            allMemos.push(decodeMemoData(ix.data));
                        }
                    }
                }
            }
        }
    }

    // Note.
    if (meta.innerInstructions) {
        for (const inner of meta.innerInstructions) {
            for (const ix of inner.instructions) {
                if ('parsed' in ix && ix.program === 'spl-memo') {
                    allMemos.push(ix.parsed as string);
                } else if ('data' in ix && 'programId' in ix) {
                    const id = typeof ix.programId === 'string' ? ix.programId : (ix.programId as PublicKey).toBase58();
                    if (id === MEMO_PROGRAM_ID.toBase58() && ix.data) {
                        allMemos.push(decodeMemoData(ix.data as string));
                    }
                }
            }
        }
    }

    // Note.
    const slotScribeMemo = allMemos.find(m => m.includes('BBX1 payload=') || m.includes('SS1 payload='));
    if (slotScribeMemo) return slotScribeMemo;

    // Note.
    if (meta.logMessages) {
        for (const log of meta.logMessages) {
            if (log.includes('BBX1 payload=') || log.includes('SS1 payload=')) {
                const match = log.match(/(BBX1|SS1) payload=[a-fA-F0-9]{64}/);
                if (match) return match[0];
            }
        }
    }

    // Note.
    return allMemos[0] || null;
}

/**
 * API note.
 */
function decodeMemoData(data: string): string {
    try {
        // Note.
        const bytes = Buffer.from(data, 'base64');
        return new TextDecoder().decode(bytes);
    } catch {
        try {
            // Note.
            return data;
        } catch {
            return data;
        }
    }
}

/**
 * API note.
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

    // Note.
    result.fee = txResponse.meta.fee;

    // Note.
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

                    // Note.
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
 * API note.
 */
export async function getParsedTransaction(
    connection: Connection,
    signature: string
): Promise<ParsedTransactionWithMeta | null> {
    return connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
    });
}
