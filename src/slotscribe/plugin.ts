import {
    Connection,
    Transaction,
    VersionedTransaction,
    SendOptions,
    Signer,
    TransactionSignature
} from '@solana/web3.js';
import { SlotScribeRecorder } from './recorder';
import { buildMemoIx, MEMO_PROGRAM_ID } from './solana';
import { uploadTrace } from './upload';
import type { SolanaCluster } from './types';

export interface SlotScribePluginOptions {
    cluster: SolanaCluster | string;
    baseUrl?: string;
    /** API note. */
    autoUpload?: boolean;
    /** API note. */
    defaultIntent?: string;
}

/**
 * API note.
 * 
 * API note.
 * API note.
 */
export function withSlotScribe(
    connection: Connection,
    options: SlotScribePluginOptions
): Connection {
    // Note.
    const proxy = new Proxy(connection, {
        get(target, prop, receiver) {
            const originalValue = Reflect.get(target, prop, receiver);

            // Note.
            if (prop === 'sendTransaction' || prop === 'sendRawTransaction') {
                return async (...args: any[]) => {
                    // Note.
                    const intent = (args[2] as any)?.intent || options.defaultIntent || 'Agent Execution';
                    const recorder = new SlotScribeRecorder({
                        intent,
                        cluster: options.cluster
                    });

                    let signature: TransactionSignature;

                    if (prop === 'sendTransaction') {
                        // Note.
                        const tx = args[0] as Transaction | VersionedTransaction;
                        const signers = args[1] as Signer[];

                        // For legacy transaction, fill txSummary before finalizing hash.
                        if (tx instanceof Transaction) {
                            const programIds = tx.instructions.map(ix => ix.programId.toBase58());
                            const memoProgramId = MEMO_PROGRAM_ID.toBase58();
                            if (!programIds.includes(memoProgramId)) {
                                programIds.push(memoProgramId);
                            }

                            recorder.setTxSummary({
                                cluster: options.cluster as any,
                                feePayer: tx.feePayer?.toBase58() || signers[0]?.publicKey.toBase58() || '',
                                programIds
                            });

                            const hash = recorder.finalizePayloadHash();
                            tx.add(buildMemoIx(`SS1 payload=${hash}`));
                        } else {
                            throw new Error(
                                '[SlotScribe Plugin] sendTransaction with VersionedTransaction is not supported for auto-memo injection. ' +
                                'Please add memo before compiling v0 and call recorder.syncOnChain after send.'
                            );
                        }

                        // Note.
                        signature = await originalValue.apply(target, args);

                    } else {
                        // Note.
                        // Note.
                        signature = await originalValue.apply(target, args);
                    }

                    // Note.
                    const runFollowUp = async () => {
                        try {
                            // Note.
                            await target.confirmTransaction(signature, 'confirmed');

                            // Note.
                            recorder.attachOnChain(signature, { status: 'confirmed' });

                            // Note.
                            if (options.autoUpload !== false) {
                                if (recorder.getPayloadHash()) {
                                    await uploadTrace(recorder.buildTrace(), {
                                        baseUrl: options.baseUrl
                                    });
                                } else {
                                    // sendRawTransaction path has no finalized payload; skip upload safely.
                                    console.warn('[SlotScribe Plugin] Skip trace upload: payloadHash not finalized (likely sendRawTransaction path).');
                                }
                            }
                        } catch (e) {
                            console.error('[SlotScribe Plugin] Follow-up failed:', e);
                        }
                    };

                    runFollowUp(); // Note.

                    return signature;
                };
            }

            // Note.
            return typeof originalValue === 'function'
                ? originalValue.bind(target)
                : originalValue;
        }
    });

    return proxy;
}
