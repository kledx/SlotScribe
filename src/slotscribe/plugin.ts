import {
    Connection,
    Transaction,
    VersionedTransaction,
    SendOptions,
    Signer,
    TransactionSignature
} from '@solana/web3.js';
import { SlotScribeRecorder } from './recorder';
import { buildMemoIx } from './solana';
import { uploadTrace } from './upload';
import type { SolanaCluster } from './types';

export interface SlotScribePluginOptions {
    cluster: SolanaCluster | string;
    baseUrl?: string;
    /** 是否自动上传到云端，默认为 true */
    autoUpload?: boolean;
    /** 默认意图说明 */
    defaultIntent?: string;
}

/**
 * SlotScribe 无感包装器
 * 
 * 动态代理标准的 Solana Connection 对象，
 * 拦截并自动处理 SlotScribe 的录制、锚定与上传流程。
 */
export function withSlotScribe(
    connection: Connection,
    options: SlotScribePluginOptions
): Connection {
    // 使用 Proxy 拦截 connection 的方法
    const proxy = new Proxy(connection, {
        get(target, prop, receiver) {
            const originalValue = Reflect.get(target, prop, receiver);

            // 我们只拦截发送交易的方法
            if (prop === 'sendTransaction' || prop === 'sendRawTransaction') {
                return async (...args: any[]) => {
                    // 1. 初始化录制
                    const intent = (args[2] as any)?.intent || options.defaultIntent || 'Agent Execution';
                    const recorder = new SlotScribeRecorder({
                        intent,
                        cluster: options.cluster
                    });

                    let signature: TransactionSignature;

                    if (prop === 'sendTransaction') {
                        // args[0] 是 tx, args[1] 是 signers
                        const tx = args[0] as Transaction | VersionedTransaction;
                        const signers = args[1] as Signer[];

                        // 注入 Memo (对于普通 Transaction 比较容易)
                        if (tx instanceof Transaction) {
                            const hash = recorder.finalizePayloadHash();
                            tx.add(buildMemoIx(`SS1 payload=${hash}`));

                            // 记录摘要
                            recorder.setTxSummary({
                                cluster: options.cluster as any,
                                feePayer: tx.feePayer?.toBase58() || signers[0]?.publicKey.toBase58() || '',
                                programIds: tx.instructions.map(ix => ix.programId.toBase58())
                            });
                        }

                        // 调用原始方法
                        signature = await originalValue.apply(target, args);

                    } else {
                        // sendRawTransaction 不需要拦截注入，通常是因为用户已经离线签名了
                        // 这种情况只能做后续的数据关联
                        signature = await originalValue.apply(target, args);
                    }

                    // 2. 异步处理后续流程（不阻塞业务返回 signature）
                    const runFollowUp = async () => {
                        try {
                            // 等待确认
                            await target.confirmTransaction(signature, 'confirmed');

                            // 关联链上 ID
                            recorder.attachOnChain(signature, { status: 'confirmed' });

                            // 上传
                            if (options.autoUpload !== false) {
                                await uploadTrace(recorder.buildTrace(), {
                                    baseUrl: options.baseUrl
                                });
                            }
                        } catch (e) {
                            console.error('[SlotScribe Plugin] Follow-up failed:', e);
                        }
                    };

                    runFollowUp(); // 后台运行

                    return signature;
                };
            }

            // 其他方法保持原样
            return typeof originalValue === 'function'
                ? originalValue.bind(target)
                : originalValue;
        }
    });

    return proxy;
}
