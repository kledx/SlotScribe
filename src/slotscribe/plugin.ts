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
    /** 鏄惁鑷姩涓婁紶鍒颁簯绔紝榛樿涓?true */
    autoUpload?: boolean;
    /** 榛樿鎰忓浘璇存槑 */
    defaultIntent?: string;
}

/**
 * SlotScribe 鏃犳劅鍖呰鍣?
 * 
 * 鍔ㄦ€佷唬鐞嗘爣鍑嗙殑 Solana Connection 瀵硅薄锛?
 * 鎷︽埅骞惰嚜鍔ㄥ鐞?SlotScribe 鐨勫綍鍒躲€侀敋瀹氫笌涓婁紶娴佺▼銆?
 */
export function withSlotScribe(
    connection: Connection,
    options: SlotScribePluginOptions
): Connection {
    // 浣跨敤 Proxy 鎷︽埅 connection 鐨勬柟娉?
    const proxy = new Proxy(connection, {
        get(target, prop, receiver) {
            const originalValue = Reflect.get(target, prop, receiver);

            // 鎴戜滑鍙嫤鎴彂閫佷氦鏄撶殑鏂规硶
            if (prop === 'sendTransaction' || prop === 'sendRawTransaction') {
                return async (...args: any[]) => {
                    // 1. 鍒濆鍖栧綍鍒?
                    const intent = (args[2] as any)?.intent || options.defaultIntent || 'Agent Execution';
                    const recorder = new SlotScribeRecorder({
                        intent,
                        cluster: options.cluster
                    });

                    let signature: TransactionSignature;

                    if (prop === 'sendTransaction') {
                        // args[0] 鏄?tx, args[1] 鏄?signers
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

                        // 璋冪敤鍘熷鏂规硶
                        signature = await originalValue.apply(target, args);

                    } else {
                        // sendRawTransaction 涓嶉渶瑕佹嫤鎴敞鍏ワ紝閫氬父鏄洜涓虹敤鎴峰凡缁忕绾跨鍚嶄簡
                        // 杩欑鎯呭喌鍙兘鍋氬悗缁殑鏁版嵁鍏宠仈
                        signature = await originalValue.apply(target, args);
                    }

                    // 2. 寮傛澶勭悊鍚庣画娴佺▼锛堜笉闃诲涓氬姟杩斿洖 signature锛?
                    const runFollowUp = async () => {
                        try {
                            // 绛夊緟纭
                            await target.confirmTransaction(signature, 'confirmed');

                            // 鍏宠仈閾句笂 ID
                            recorder.attachOnChain(signature, { status: 'confirmed' });

                            // 涓婁紶
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

                    runFollowUp(); // 鍚庡彴杩愯

                    return signature;
                };
            }

            // 鍏朵粬鏂规硶淇濇寔鍘熸牱
            return typeof originalValue === 'function'
                ? originalValue.bind(target)
                : originalValue;
        }
    });

    return proxy;
}
