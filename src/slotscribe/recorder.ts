/**
 * SlotScribeRecorder - Trace 记录器
 * 用于记录 Agent 操作轨迹并计算 payloadHash
 */

import type {
    Trace,
    TracePayload,
    TraceVersion,
    TxSummary,
    SolanaCluster,
    OnChainInfo,
    SwapDetails,
    StakeDetails,
    NftDetails,
    LpDetails,
    LendingDetails,
    MemeCoinDetails,
    TokenInfo,
} from './types';
import { normalizeCluster, buildMemoIx } from './solana';
import { canonicalizeJson } from './canonicalize';
import { sha256Hex } from './hash';
import { uploadTrace } from './upload';
import type {
    Connection,
    Transaction,
    VersionedTransaction,
    Signer,
    SendOptions,
    TransactionSignature
} from '@solana/web3.js';

export interface RecorderOptions {
    intent: string;
    cluster: SolanaCluster | string;
}

export class SlotScribeRecorder {
    private payload: TracePayload;
    private hashedPayload: TracePayload | null = null;
    private payloadHash: string | null = null;
    private onChain: OnChainInfo | null = null;
    private createdAt: string;

    constructor(options: RecorderOptions) {
        const cluster = normalizeCluster(options.cluster);
        this.createdAt = new Date().toISOString();
        this.payload = {
            nonce: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
            intent: options.intent,
            plan: { steps: [] },
            toolCalls: [],
            txSummary: {
                cluster: cluster,
                feePayer: '',
                programIds: [],
            },
        };
    }

    /**
     * 添加计划步骤
     */
    addPlanSteps(steps: string[]): void {
        this.payload.plan.steps.push(...steps);
    }

    /**
     * 记录工具调用
     * 包装异步函数，自动记录开始/结束时间和结果
     */
    async recordToolCall<T>(
        name: string,
        input: unknown,
        fn: () => Promise<T>
    ): Promise<T> {
        const startedAt = new Date().toISOString();

        try {
            const output = await fn();
            const endedAt = new Date().toISOString();

            this.payload.toolCalls.push({
                name,
                input,
                output: this.sanitizeOutput(output),
                startedAt,
                endedAt,
            });

            return output;
        } catch (err) {
            const endedAt = new Date().toISOString();
            const errorMessage = err instanceof Error ? err.message : String(err);

            this.payload.toolCalls.push({
                name,
                input,
                error: errorMessage,
                startedAt,
                endedAt,
            });

            throw err;
        }
    }

    /**
     * 手动记录审计步骤（工具调用）
     */
    addAuditStep(step: {
        name: string;
        details?: string;
        status?: 'success' | 'error';
        input?: unknown;
        output?: unknown;
    }): void {
        const now = new Date().toISOString();
        this.payload.toolCalls.push({
            name: step.name,
            input: step.input || null,
            output: step.output || step.details || null,
            error: step.status === 'error' ? (step.details || 'Unknown error') : undefined,
            startedAt: now,
            endedAt: now,
        });
    }

    /**
     * 设置交易摘要（通用方法）
     */
    setTxSummary(summary: Partial<TxSummary>): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            ...summary,
        };
    }

    // ==================== 便捷方法：复杂交易类型 ====================

    /**
     * 设置 Swap 交易
     */
    setSwapTx(params: {
        feePayer: string;
        swap: SwapDetails;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'swap',
            feePayer: params.feePayer,
            swap: params.swap,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置质押交易
     */
    setStakeTx(params: {
        feePayer: string;
        stake: StakeDetails;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'stake',
            feePayer: params.feePayer,
            stake: params.stake,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置解质押交易
     */
    setUnstakeTx(params: {
        feePayer: string;
        stake: StakeDetails;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'unstake',
            feePayer: params.feePayer,
            stake: params.stake,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置 NFT 购买交易
     */
    setNftBuyTx(params: {
        feePayer: string;
        nft: NftDetails;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'nft_buy',
            feePayer: params.feePayer,
            nft: params.nft,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置 NFT 铸造交易
     */
    setNftMintTx(params: {
        feePayer: string;
        nft: NftDetails;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'nft_mint',
            feePayer: params.feePayer,
            nft: params.nft,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置添加流动性交易
     */
    setAddLiquidityTx(params: {
        feePayer: string;
        lp: LpDetails;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'lp_add',
            feePayer: params.feePayer,
            lp: params.lp,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置移除流动性交易
     */
    setRemoveLiquidityTx(params: {
        feePayer: string;
        lp: LpDetails;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'lp_remove',
            feePayer: params.feePayer,
            lp: params.lp,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置借贷交易
     */
    setLendingTx(params: {
        feePayer: string;
        lending: LendingDetails;
        programIds?: string[];
    }): void {
        const typeMap: Record<string, TxSummary['type']> = {
            supply: 'lending_supply',
            borrow: 'lending_borrow',
            repay: 'lending_repay',
            withdraw: 'lending_withdraw',
        };

        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: typeMap[params.lending.action] || 'custom',
            feePayer: params.feePayer,
            lending: params.lending,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置 Meme 币交易（Pump.fun/Moonshot 等）
     */
    setMemeCoinTx(params: {
        feePayer: string;
        meme: MemeCoinDetails;
        programIds?: string[];
    }): void {
        // 根据 action 确定交易类型
        const type = params.meme.action === 'buy' || params.meme.action === 'sell'
            ? 'swap'
            : 'token_mint';

        this.payload.txSummary = {
            ...this.payload.txSummary,
            type,
            feePayer: params.feePayer,
            meme: params.meme,
            programIds: params.programIds || [],
        };
    }

    /**
     * 设置简单转账（向后兼容）
     */
    setTransferTx(params: {
        feePayer: string;
        to: string;
        lamports: number;
        programIds?: string[];
    }): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            type: 'transfer',
            feePayer: params.feePayer,
            to: params.to,
            lamports: params.lamports,
            programIds: params.programIds || [],
        };
    }

    // ==================== 核心方法 ====================

    /**
     * 计算并固化 payloadHash
     * 必须在 txSummary 填充完成后调用
     */
    finalizePayloadHash(): string {
        // 保存 payload 快照（深拷贝）
        this.hashedPayload = JSON.parse(JSON.stringify(this.payload));
        const canonical = canonicalizeJson(this.hashedPayload);
        this.payloadHash = sha256Hex(canonical);
        return this.payloadHash;
    }

    /**
     * 获取当前 payloadHash（如果已计算）
     */
    getPayloadHash(): string | null {
        return this.payloadHash;
    }

    /**
     * 附加链上信息
     */
    attachOnChain(signature: string, info?: Partial<Omit<OnChainInfo, 'signature'>>): void {
        this.onChain = {
            signature,
            ...info,
        };
    }

    /**
     * 构建完整的 Trace 对象
     */
    buildTrace(): Trace {
        if (!this.payloadHash || !this.hashedPayload) {
            throw new Error('payloadHash not finalized. Call finalizePayloadHash() first.');
        }

        // 根据交易类型自动选择版本
        const version = this.determineVersion();

        const trace: Trace = {
            version,
            createdAt: this.createdAt,
            payload: this.payload,
            hashedPayload: this.hashedPayload,
            payloadHash: this.payloadHash,
        };

        if (this.onChain) {
            trace.onChain = this.onChain;
        }

        return trace;
    }

    /**
     * 根据 txSummary 内容确定 Trace 版本
     * - BBX1: 仅包含简单 transfer（无 type 或 type='transfer'且无复杂字段）
     * - BBX2: 包含复杂交易类型（swap/stake/nft/lending/meme 等）
     */
    private determineVersion(): TraceVersion {
        const summary = this.payload.txSummary;

        // 如果有复杂交易字段，使用 BBX2
        if (summary.swap || summary.stake || summary.nft ||
            summary.lp || summary.lending || summary.meme || summary.custom) {
            return 'BBX2';
        }

        // 如果 type 是复杂类型，使用 BBX2
        const complexTypes = [
            'swap', 'stake', 'unstake', 'nft_mint', 'nft_buy', 'nft_list',
            'token_mint', 'lp_add', 'lp_remove', 'lending_supply',
            'lending_borrow', 'lending_repay', 'lending_withdraw',
            'governance_vote', 'custom'
        ];
        if (summary.type && complexTypes.includes(summary.type)) {
            return 'BBX2';
        }

        // 默认使用 BBX1（向后兼容）
        return 'BBX1';
    }

    /**
     * 获取当前 payload（只读）
     */
    getPayload(): Readonly<TracePayload> {
        return this.payload;
    }

    /**
     * 清理输出数据，避免存储过大或不可序列化的对象
     */
    private sanitizeOutput(output: unknown): unknown {
        try {
            // 尝试 JSON 序列化，如果失败则返回字符串表示
            const str = JSON.stringify(output);
            // 限制大小
            if (str.length > 100000) {
                return { _truncated: true, preview: str.slice(0, 1000) + '...' };
            }
            return JSON.parse(str);
        } catch {
            return { _type: typeof output, _string: String(output).slice(0, 500) };
        }
    }

    /**
     * 【推荐】显式发送并锚定交易
     * 
     * 自动完成：注入 Memo -> 发送交易 -> 上传 Trace
     */
    async sendTransaction(
        connection: Connection,
        transaction: Transaction | VersionedTransaction,
        signers: Signer[],
        options: {
            sendOptions?: SendOptions;
            autoUpload?: boolean;
            baseUrl?: string;
        } = {}
    ): Promise<TransactionSignature> {
        // 1. 注入 Memo (对于 Legacy Transaction)
        const hash = this.finalizePayloadHash();
        const memoIx = buildMemoIx(`SS1 payload=${hash}`);

        if (transaction instanceof (await import('@solana/web3.js')).Transaction) {
            // Legacy Transaction
            transaction.add(memoIx);

            // 自动填充一部分 TxSummary
            if (!this.payload.txSummary.feePayer) {
                this.payload.txSummary.feePayer = transaction.feePayer?.toBase58() || signers[0]?.publicKey.toBase58() || '';
            }
            if (this.payload.txSummary.programIds.length === 0) {
                this.payload.txSummary.programIds = transaction.instructions.map(ix => ix.programId.toBase58());
            }
        } else {
            // VersionedTransaction
            // 注意：如果交易已经签名，注入 Memo 会导致签名无效。
            // 这里我们记录信息，但对于已经编码的消息，注入需要重新构建
            if (!this.payload.txSummary.feePayer) {
                this.payload.txSummary.feePayer = transaction.message.staticAccountKeys[0]?.toBase58() || signers[0]?.publicKey.toBase58() || '';
            }
            if (this.payload.txSummary.programIds.length === 0) {
                const staticKeys = transaction.message.staticAccountKeys;
                this.payload.txSummary.programIds = transaction.message.compiledInstructions.map(
                    ix => staticKeys[ix.programIdIndex]?.toBase58() || 'unknown'
                );
            }
        }

        // 2. 发送交易
        let signature: TransactionSignature;
        if ('instructions' in transaction) {
            // Legacy Transaction
            signature = await connection.sendTransaction(transaction, signers, options.sendOptions);
        } else {
            // VersionedTransaction
            signature = await connection.sendTransaction(transaction, options.sendOptions);
        }
        // 3. 后台跟进逻辑（确认并上传）
        const followUp = async () => {
            try {
                // 等待确认
                await connection.confirmTransaction(signature, 'confirmed');
                this.attachOnChain(signature, { status: 'confirmed' });

                // 自动上传
                if (options.autoUpload !== false) {
                    await uploadTrace(this.buildTrace(), { baseUrl: options.baseUrl });
                }
            } catch (e) {
                console.error('[SlotScribe] Background upload failed:', e);
            }
        };

        followUp(); // 异步执行，不阻塞主线程返回 signature

        return signature;
    }

    /**
     * 【通用助手】同步已发送的交易到 SlotScribe
     * 
     * 适用于用户使用 Anchor, Jupiter 或其他第三方 SDK 发送交易的场景。
     * 在后台等待交易确认后自动上传审计报告。
     */
    syncOnChain(
        signature: TransactionSignature,
        connection: Connection,
        options: {
            autoUpload?: boolean;
            baseUrl?: string;
        } = {}
    ): void {
        const followUp = async () => {
            try {
                // 等待确认
                await connection.confirmTransaction(signature, 'confirmed');
                this.attachOnChain(signature, { status: 'confirmed' });

                // 自动上传
                if (options.autoUpload !== false) {
                    await uploadTrace(this.buildTrace(), { baseUrl: options.baseUrl });
                }
            } catch (e) {
                console.error('[SlotScribe] Background sync failed:', e);
            }
        };

        followUp(); // 必须是异步的，不影响用户主业务流
    }
}

// ==================== 便捷函数：创建 Token 信息 ====================

/**
 * 创建 Token 信息
 */
export function token(mint: string, symbol?: string, decimals?: number): TokenInfo {
    return { mint, symbol, decimals };
}

/**
 * 常用 Token
 */
export const TOKENS = {
    SOL: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
    USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 },
    USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6 },
    BONK: { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', decimals: 5 },
    WIF: { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', decimals: 6 },
    JUP: { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', decimals: 6 },
} as const;
