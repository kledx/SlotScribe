/**
 * SlotScribe Types
 * API note.
 */

/** 
 * API note.
 * API note.
 * API note.
 */
export type TraceVersion = 'BBX1' | 'BBX2';

/** API note. */
export type SolanaCluster = 'devnet' | 'mainnet-beta' | 'testnet' | 'localnet';

/** API note. */
export type OnChainStatus = 'confirmed' | 'finalized' | 'processed' | 'unknown';

/** API note. */
export interface ToolCall {
    name: string;
    input: unknown;
    output?: unknown;
    error?: string;
    startedAt: string;
    endedAt: string;
}

// Note.

/** API note. */
export type TxType =
    | 'transfer'      // Note.
    | 'swap'          // Note.
    | 'stake'         // Note.
    | 'unstake'       // Note.
    | 'nft_mint'      // Note.
    | 'nft_buy'       // Note.
    | 'nft_list'      // Note.
    | 'token_mint'    // Note.
    | 'lp_add'        // Note.
    | 'lp_remove'     // Note.
    | 'lending_supply'    // Note.
    | 'lending_borrow'    // Note.
    | 'lending_repay'     // Note.
    | 'lending_withdraw'  // Note.
    | 'governance_vote'   // Note.
    | 'custom';       // Note.

/** API note. */
export type DefiProtocol =
    | 'jupiter'
    | 'raydium'
    | 'orca'
    | 'meteora'
    | 'pump_fun'
    | 'moonshot'
    | 'marinade'
    | 'lido'
    | 'jito'
    | 'solend'
    | 'marginfi'
    | 'kamino'
    | 'drift'
    | 'tensor'
    | 'magic_eden'
    | 'metaplex'
    | 'unknown';

/** API note. */
export interface TokenInfo {
    /** API note. */
    mint: string;
    /** API note. */
    symbol?: string;
    /** API note. */
    name?: string;
    /** API note. */
    decimals?: number;
}

/** API note. */
export interface SwapDetails {
    /** API note. */
    protocol: DefiProtocol;
    /** API note. */
    inputToken: TokenInfo;
    /** API note. */
    outputToken: TokenInfo;
    /** API note. */
    inputAmount: string;
    /** API note. */
    outputAmount: string;
    /** API note. */
    minOutputAmount?: string;
    /** API note. */
    slippageBps?: number;
    /** API note. */
    route?: string[];
    /** API note. */
    priceImpactPct?: number;
}

/** API note. */
export interface StakeDetails {
    /** API note. */
    protocol: DefiProtocol | 'native';
    /** API note. */
    amount: string;
    /** API note. */
    validator?: string;
    /** API note. */
    stakeAccount?: string;
    /** API note. */
    lstToken?: TokenInfo;
    /** API note. */
    lstAmount?: string;
}

/** API note. */
export interface NftDetails {
    /** API note. */
    protocol: DefiProtocol;
    /** API note. */
    mint: string;
    /** API note. */
    name?: string;
    /** API note. */
    collection?: string;
    /** API note. */
    collectionName?: string;
    /** API note. */
    price?: string;
    /** API note. */
    paymentToken?: TokenInfo;
    /** API note. */
    seller?: string;
    /** API note. */
    buyer?: string;
}

/** API note. */
export interface LpDetails {
    /** API note. */
    protocol: DefiProtocol;
    /** API note. */
    poolAddress: string;
    /** Token A */
    tokenA: TokenInfo;
    /** Token B */
    tokenB: TokenInfo;
    /** API note. */
    amountA: string;
    /** API note. */
    amountB: string;
    /** API note. */
    lpAmount?: string;
    /** LP Token Mint */
    lpMint?: string;
}

/** API note. */
export interface LendingDetails {
    /** API note. */
    protocol: DefiProtocol;
    /** API note. */
    action: 'supply' | 'borrow' | 'repay' | 'withdraw' | 'liquidate';
    /** Token */
    token: TokenInfo;
    /** API note. */
    amount: string;
    /** API note. */
    collateral?: TokenInfo;
    /** API note. */
    collateralAmount?: string;
}

/** API note. */
export interface MemeCoinDetails {
    /** API note. */
    protocol: 'pump_fun' | 'moonshot' | 'raydium' | DefiProtocol;
    /** Token */
    token: TokenInfo;
    /** API note. */
    action: 'buy' | 'sell' | 'create';
    /** API note. */
    solAmount: string;
    /** API note. */
    tokenAmount: string;
    /** API note. */
    bondingCurve?: string;
    /** API note. */
    graduated?: boolean;
}

// Note.

/** API note. */
export interface TxSummary {
    /** API note. */
    cluster: SolanaCluster;
    /** API note. */
    feePayer: string;

    /** API note. */
    type?: TxType;

    /** API note. */
    to?: string;
    lamports?: number;

    /** API note. */
    programIds: string[];

    /** API note. */
    recentBlockhash?: string;

    // Note.

    /** API note. */
    swap?: SwapDetails;

    /** API note. */
    stake?: StakeDetails;

    /** API note. */
    nft?: NftDetails;

    /** API note. */
    lp?: LpDetails;

    /** API note. */
    lending?: LendingDetails;

    /** API note. */
    meme?: MemeCoinDetails;

    /** API note. */
    custom?: Record<string, unknown>;
}

// Note.

/** API note. */
export interface TracePayload {
    /** API note. */
    nonce?: string;
    intent: string;
    plan: {
        steps: string[];
    };
    toolCalls: ToolCall[];
    txSummary: TxSummary;
}

/** API note. */
export interface OnChainInfo {
    signature: string;
    slot?: number;
    status?: OnChainStatus;
    memo?: string;
}

/** API note. */
export interface DebugInfo {
    txBase64?: string;
}

/** API note. */
export interface Trace {
    version: TraceVersion;
    createdAt: string;
    /** API note. */
    payload: TracePayload;
    /** API note. */
    hashedPayload: TracePayload;
    payloadHash: string;
    onChain?: OnChainInfo;
    /** API note. */
    verifiedResult?: VerifyResult;
    /** API note. */
    cachedTxSummary?: ParsedTxSummary;
    debug?: DebugInfo;
}

/** API note. */
export interface VerifyResult {
    ok: boolean;
    expectedHash?: string;
    computedHash?: string;
    reasons: string[];
}

/** API note. */
export interface ParsedTxSummary {
    fee: number;
    programs: string[];
    to?: string;
    lamports?: number;
    type?: TxType;
}
