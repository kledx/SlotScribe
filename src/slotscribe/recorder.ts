/**
 * API note.
 * API note.
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
import { uploadTraceReliable } from './upload';
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
     * API note.
     */
    addPlanSteps(steps: string[]): void {
        this.payload.plan.steps.push(...steps);
    }

    /**
     * API note.
     * API note.
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
     * API note.
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
     * API note.
     */
    setTxSummary(summary: Partial<TxSummary>): void {
        this.payload.txSummary = {
            ...this.payload.txSummary,
            ...summary,
        };
    }

    // Note.

    /**
     * API note.
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
     * API note.
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
     * API note.
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
     * API note.
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
     * API note.
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
     * API note.
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
     * API note.
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
     * API note.
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
     * API note.
     */
    setMemeCoinTx(params: {
        feePayer: string;
        meme: MemeCoinDetails;
        programIds?: string[];
    }): void {
        // Note.
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
     * API note.
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

    // Note.

    /**
     * API note.
     * API note.
     */
    finalizePayloadHash(): string {
        // Note.
        this.hashedPayload = JSON.parse(JSON.stringify(this.payload));
        const canonical = canonicalizeJson(this.hashedPayload);
        this.payloadHash = sha256Hex(canonical);
        return this.payloadHash;
    }

    /**
     * API note.
     */
    getPayloadHash(): string | null {
        return this.payloadHash;
    }

    /**
     * API note.
     */
    attachOnChain(signature: string, info?: Partial<Omit<OnChainInfo, 'signature'>>): void {
        this.onChain = {
            signature,
            ...info,
        };
    }

    /**
     * API note.
     */
    buildTrace(): Trace {
        if (!this.payloadHash || !this.hashedPayload) {
            throw new Error('payloadHash not finalized. Call finalizePayloadHash() first.');
        }

        // Note.
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
     * API note.
     * API note.
     * API note.
     */
    private determineVersion(): TraceVersion {
        const summary = this.payload.txSummary;

        // Note.
        if (summary.swap || summary.stake || summary.nft ||
            summary.lp || summary.lending || summary.meme || summary.custom) {
            return 'BBX2';
        }

        // Note.
        const complexTypes = [
            'swap', 'stake', 'unstake', 'nft_mint', 'nft_buy', 'nft_list',
            'token_mint', 'lp_add', 'lp_remove', 'lending_supply',
            'lending_borrow', 'lending_repay', 'lending_withdraw',
            'governance_vote', 'custom'
        ];
        if (summary.type && complexTypes.includes(summary.type)) {
            return 'BBX2';
        }

        // Note.
        return 'BBX1';
    }

    /**
     * API note.
     */
    getPayload(): Readonly<TracePayload> {
        return this.payload;
    }

    /**
     * API note.
     */
    private sanitizeOutput(output: unknown): unknown {
        try {
            // Note.
            const str = JSON.stringify(output);
            // Note.
            if (str.length > 100000) {
                return { _truncated: true, preview: str.slice(0, 1000) + '...' };
            }
            return JSON.parse(str);
        } catch {
            return { _type: typeof output, _string: String(output).slice(0, 500) };
        }
    }

    /**
     * API note.
     * 
     * API note.
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
                    await uploadTraceReliable(this.buildTrace(), {
                        baseUrl: options.baseUrl,
                        timeout: 60000,
                        retries: 3,
                        retryDelayMs: 800,
                        retryBackoff: 2,
                        queueOnFailure: false,
                    });
                }
            } catch (e) {
                console.error('[SlotScribe] Background upload failed:', e);
            }
        };

        followUp();

        return signature;
    }

    /**
     * API note.
     * 
     * API note.
     * API note.
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
                // Note.
                await connection.confirmTransaction(signature, 'confirmed');
                this.attachOnChain(signature, { status: 'confirmed' });

                // Note.
                if (options.autoUpload !== false) {
                    await uploadTraceReliable(this.buildTrace(), {
                        baseUrl: options.baseUrl,
                        timeout: 60000,
                        retries: 3,
                        retryDelayMs: 800,
                        retryBackoff: 2,
                        queueOnFailure: false,
                    });
                }
            } catch (e) {
                console.error('[SlotScribe] Background sync failed:', e);
            }
        };

        followUp(); // Note.
    }
}

// Note.

/**
 * API note.
 */
export function token(mint: string, symbol?: string, decimals?: number): TokenInfo {
    return { mint, symbol, decimals };
}

/**
 * API note.
 */
export const TOKENS = {
    SOL: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
    USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 },
    USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6 },
    BONK: { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', decimals: 5 },
    WIF: { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', decimals: 6 },
    JUP: { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', decimals: 6 },
} as const;



