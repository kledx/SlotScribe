/**
 * SlotScribeRecorder - Trace 璁板綍鍣?
 * 鐢ㄤ簬璁板綍 Agent 鎿嶄綔杞ㄨ抗骞惰绠?payloadHash
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
import { normalizeCluster, buildMemoIx, MEMO_PROGRAM_ID } from './solana';
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
     * 娣诲姞璁″垝姝ラ
     */
    addPlanSteps(steps: string[]): void {
        this.payload.plan.steps.push(...steps);
    }

    /**
     * 璁板綍宸ュ叿璋冪敤
     * 鍖呰寮傛鍑芥暟锛岃嚜鍔ㄨ褰曞紑濮?缁撴潫鏃堕棿鍜岀粨鏋?
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
     * 鎵嬪姩璁板綍瀹¤姝ラ锛堝伐鍏疯皟鐢級
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
     * 璁剧疆浜ゆ槗鎽樿锛堥€氱敤鏂规硶锛?
     */
    setTxSummary(summary: Partial<TxSummary>): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            ...summary,
        };
    }

    // ==================== 渚挎嵎鏂规硶锛氬鏉備氦鏄撶被鍨?====================

    /**
     * 璁剧疆 Swap 浜ゆ槗
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
     * 璁剧疆璐ㄦ娂浜ゆ槗
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
     * 璁剧疆瑙ｈ川鎶间氦鏄?
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
     * 璁剧疆 NFT 璐拱浜ゆ槗
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
     * 璁剧疆 NFT 閾搁€犱氦鏄?
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
     * 璁剧疆娣诲姞娴佸姩鎬т氦鏄?
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
     * 璁剧疆绉婚櫎娴佸姩鎬т氦鏄?
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
     * 璁剧疆鍊熻捶浜ゆ槗
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
     * 璁剧疆 Meme 甯佷氦鏄擄紙Pump.fun/Moonshot 绛夛級
     */
    setMemeCoinTx(params: {
        feePayer: string;
        meme: MemeCoinDetails;
        programIds?: string[];
    }): void {
        // 鏍规嵁 action 纭畾浜ゆ槗绫诲瀷
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
     * 璁剧疆绠€鍗曡浆璐︼紙鍚戝悗鍏煎锛?
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

    // ==================== 鏍稿績鏂规硶 ====================

    /**
     * 璁＄畻骞跺浐鍖?payloadHash
     * 蹇呴』鍦?txSummary 濉厖瀹屾垚鍚庤皟鐢?
     */
    finalizePayloadHash(): string {
        // 淇濆瓨 payload 蹇収锛堟繁鎷疯礉锛?
        this.hashedPayload = JSON.parse(JSON.stringify(this.payload));
        const canonical = canonicalizeJson(this.hashedPayload);
        this.payloadHash = sha256Hex(canonical);
        return this.payloadHash;
    }

    /**
     * 鑾峰彇褰撳墠 payloadHash锛堝鏋滃凡璁＄畻锛?
     */
    getPayloadHash(): string | null {
        return this.payloadHash;
    }

    /**
     * 闄勫姞閾句笂淇℃伅
     */
    attachOnChain(signature: string, info?: Partial<Omit<OnChainInfo, 'signature'>>): void {
        this.onChain = {
            signature,
            ...info,
        };
    }

    /**
     * 鏋勫缓瀹屾暣鐨?Trace 瀵硅薄
     */
    buildTrace(): Trace {
        if (!this.payloadHash || !this.hashedPayload) {
            throw new Error('payloadHash not finalized. Call finalizePayloadHash() first.');
        }

        // 鏍规嵁浜ゆ槗绫诲瀷鑷姩閫夋嫨鐗堟湰
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
     * 鏍规嵁 txSummary 鍐呭纭畾 Trace 鐗堟湰
     * - BBX1: 浠呭寘鍚畝鍗?transfer锛堟棤 type 鎴?type='transfer'涓旀棤澶嶆潅瀛楁锛?
     * - BBX2: 鍖呭惈澶嶆潅浜ゆ槗绫诲瀷锛坰wap/stake/nft/lending/meme 绛夛級
     */
    private determineVersion(): TraceVersion {
        const summary = this.payload.txSummary;

        // 濡傛灉鏈夊鏉備氦鏄撳瓧娈碉紝浣跨敤 BBX2
        if (summary.swap || summary.stake || summary.nft ||
            summary.lp || summary.lending || summary.meme || summary.custom) {
            return 'BBX2';
        }

        // 濡傛灉 type 鏄鏉傜被鍨嬶紝浣跨敤 BBX2
        const complexTypes = [
            'swap', 'stake', 'unstake', 'nft_mint', 'nft_buy', 'nft_list',
            'token_mint', 'lp_add', 'lp_remove', 'lending_supply',
            'lending_borrow', 'lending_repay', 'lending_withdraw',
            'governance_vote', 'custom'
        ];
        if (summary.type && complexTypes.includes(summary.type)) {
            return 'BBX2';
        }

        // 榛樿浣跨敤 BBX1锛堝悜鍚庡吋瀹癸級
        return 'BBX1';
    }

    /**
     * 鑾峰彇褰撳墠 payload锛堝彧璇伙級
     */
    getPayload(): Readonly<TracePayload> {
        return this.payload;
    }

    /**
     * 娓呯悊杈撳嚭鏁版嵁锛岄伩鍏嶅瓨鍌ㄨ繃澶ф垨涓嶅彲搴忓垪鍖栫殑瀵硅薄
     */
    private sanitizeOutput(output: unknown): unknown {
        try {
            // 灏濊瘯 JSON 搴忓垪鍖栵紝濡傛灉澶辫触鍒欒繑鍥炲瓧绗︿覆琛ㄧず
            const str = JSON.stringify(output);
            // 闄愬埗澶у皬
            if (str.length > 100000) {
                return { _truncated: true, preview: str.slice(0, 1000) + '...' };
            }
            return JSON.parse(str);
        } catch {
            return { _type: typeof output, _string: String(output).slice(0, 500) };
        }
    }

    /**
     * 銆愭帹鑽愩€戞樉寮忓彂閫佸苟閿氬畾浜ゆ槗
     * 
     * 鑷姩瀹屾垚锛氭敞鍏?Memo -> 鍙戦€佷氦鏄?-> 涓婁紶 Trace
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
        // 1. Only legacy transactions are supported for automatic memo injection.
        if (!(transaction instanceof (await import('@solana/web3.js')).Transaction)) {
            throw new Error(
                'SlotScribe sendTransaction does not support VersionedTransaction auto-memo injection. ' +
                'Please add the memo before compiling v0, send via your SDK, then call syncOnChain(signature, connection).'
            );
        }

        // 2. Fill txSummary before hashing to avoid post-hash mutations.
        if (!this.payload.txSummary.feePayer) {
            this.payload.txSummary.feePayer = transaction.feePayer?.toBase58() || signers[0]?.publicKey.toBase58() || '';
        }
        if (this.payload.txSummary.programIds.length === 0) {
            const programIds = transaction.instructions.map(ix => ix.programId.toBase58());
            const memoProgramId = MEMO_PROGRAM_ID.toBase58();
            if (!programIds.includes(memoProgramId)) {
                programIds.push(memoProgramId);
            }
            this.payload.txSummary.programIds = programIds;
        }

        // 3. Finalize hash and inject memo.
        const hash = this.finalizePayloadHash();
        const memoIx = buildMemoIx(`SS1 payload=${hash}`);
        transaction.add(memoIx);

        // 4. Send transaction.
        const signature = await connection.sendTransaction(transaction, signers, options.sendOptions);

        // 5. Follow-up confirmation and optional upload in background.
        const followUp = async () => {
            try {
                await connection.confirmTransaction(signature, 'confirmed');
                this.attachOnChain(signature, { status: 'confirmed' });

                if (options.autoUpload !== false) {
                    await uploadTrace(this.buildTrace(), { baseUrl: options.baseUrl });
                }
            } catch (e) {
                console.error('[SlotScribe] Background upload failed:', e);
            }
        };

        followUp();

        return signature;
    }

    /**
     * 銆愰€氱敤鍔╂墜銆戝悓姝ュ凡鍙戦€佺殑浜ゆ槗鍒?SlotScribe
     * 
     * 閫傜敤浜庣敤鎴蜂娇鐢?Anchor, Jupiter 鎴栧叾浠栫涓夋柟 SDK 鍙戦€佷氦鏄撶殑鍦烘櫙銆?
     * 鍦ㄥ悗鍙扮瓑寰呬氦鏄撶‘璁ゅ悗鑷姩涓婁紶瀹¤鎶ュ憡銆?
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
                // 绛夊緟纭
                await connection.confirmTransaction(signature, 'confirmed');
                this.attachOnChain(signature, { status: 'confirmed' });

                // 鑷姩涓婁紶
                if (options.autoUpload !== false) {
                    await uploadTrace(this.buildTrace(), { baseUrl: options.baseUrl });
                }
            } catch (e) {
                console.error('[SlotScribe] Background sync failed:', e);
            }
        };

        followUp(); // 蹇呴』鏄紓姝ョ殑锛屼笉褰卞搷鐢ㄦ埛涓讳笟鍔℃祦
    }
}

// ==================== 渚挎嵎鍑芥暟锛氬垱寤?Token 淇℃伅 ====================

/**
 * 鍒涘缓 Token 淇℃伅
 */
export function token(mint: string, symbol?: string, decimals?: number): TokenInfo {
    return { mint, symbol, decimals };
}

/**
 * 甯哥敤 Token
 */
export const TOKENS = {
    SOL: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
    USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 },
    USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6 },
    BONK: { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', decimals: 5 },
    WIF: { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', decimals: 6 },
    JUP: { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', decimals: 6 },
} as const;

