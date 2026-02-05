/**
 * SlotScribe Types
 * 定义 Trace 相关的核心类型
 */

/** 
 * Trace 版本标识
 * - BBX1: 初始版本，仅支持简单 transfer
 * - BBX2: 扩展版本，支持复杂交易类型（swap/stake/nft/lending 等）
 */
export type TraceVersion = 'BBX1' | 'BBX2';

/** Solana 集群类型 */
export type SolanaCluster = 'devnet' | 'mainnet-beta' | 'testnet' | 'localnet';

/** 链上状态 */
export type OnChainStatus = 'confirmed' | 'finalized' | 'processed' | 'unknown';

/** 工具调用记录 */
export interface ToolCall {
    name: string;
    input: unknown;
    output?: unknown;
    error?: string;
    startedAt: string;
    endedAt: string;
}

// ==================== 交易类型定义 ====================

/** 交易类型 */
export type TxType =
    | 'transfer'      // SOL/Token 转账
    | 'swap'          // DEX 兑换
    | 'stake'         // 质押
    | 'unstake'       // 解质押
    | 'nft_mint'      // NFT 铸造
    | 'nft_buy'       // NFT 购买
    | 'nft_list'      // NFT 上架
    | 'token_mint'    // Token 铸造
    | 'lp_add'        // 添加流动性
    | 'lp_remove'     // 移除流动性
    | 'lending_supply'    // 借贷存入
    | 'lending_borrow'    // 借贷借出
    | 'lending_repay'     // 借贷还款
    | 'lending_withdraw'  // 借贷取出
    | 'governance_vote'   // 治理投票
    | 'custom';       // 自定义

/** DeFi 协议 */
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

/** Token 信息 */
export interface TokenInfo {
    /** Mint 地址 */
    mint: string;
    /** Token 符号（如 SOL, USDC, BONK） */
    symbol?: string;
    /** Token 名称 */
    name?: string;
    /** 小数位数 */
    decimals?: number;
}

/** Swap 交易详情 */
export interface SwapDetails {
    /** 使用的协议/聚合器 */
    protocol: DefiProtocol;
    /** 输入 Token */
    inputToken: TokenInfo;
    /** 输出 Token */
    outputToken: TokenInfo;
    /** 输入数量（原始值，未除以 decimals） */
    inputAmount: string;
    /** 输出数量（原始值） */
    outputAmount: string;
    /** 最小输出数量（滑点保护） */
    minOutputAmount?: string;
    /** 滑点百分比（如 0.5 表示 0.5%） */
    slippageBps?: number;
    /** 路由路径（多跳时） */
    route?: string[];
    /** 价格影响百分比 */
    priceImpactPct?: number;
}

/** 质押详情 */
export interface StakeDetails {
    /** 质押协议 */
    protocol: DefiProtocol | 'native';
    /** 质押数量（lamports） */
    amount: string;
    /** 验证者地址（原生质押时） */
    validator?: string;
    /** 质押账户地址 */
    stakeAccount?: string;
    /** 获得的 LST Token */
    lstToken?: TokenInfo;
    /** 获得的 LST 数量 */
    lstAmount?: string;
}

/** NFT 详情 */
export interface NftDetails {
    /** NFT 市场/协议 */
    protocol: DefiProtocol;
    /** NFT Mint 地址 */
    mint: string;
    /** NFT 名称 */
    name?: string;
    /** Collection 地址 */
    collection?: string;
    /** Collection 名称 */
    collectionName?: string;
    /** 价格（lamports 或 token amount） */
    price?: string;
    /** 支付 Token（null 表示 SOL） */
    paymentToken?: TokenInfo;
    /** Seller 地址 */
    seller?: string;
    /** Buyer 地址 */
    buyer?: string;
}

/** 流动性池详情 */
export interface LpDetails {
    /** DEX 协议 */
    protocol: DefiProtocol;
    /** Pool 地址 */
    poolAddress: string;
    /** Token A */
    tokenA: TokenInfo;
    /** Token B */
    tokenB: TokenInfo;
    /** Token A 数量 */
    amountA: string;
    /** Token B 数量 */
    amountB: string;
    /** LP Token 数量 */
    lpAmount?: string;
    /** LP Token Mint */
    lpMint?: string;
}

/** 借贷详情 */
export interface LendingDetails {
    /** 借贷协议 */
    protocol: DefiProtocol;
    /** 操作类型 */
    action: 'supply' | 'borrow' | 'repay' | 'withdraw' | 'liquidate';
    /** Token */
    token: TokenInfo;
    /** 数量 */
    amount: string;
    /** 抵押品（借款时） */
    collateral?: TokenInfo;
    /** 抵押品数量 */
    collateralAmount?: string;
}

/** Meme 币购买详情（Pump.fun/Moonshot 等） */
export interface MemeCoinDetails {
    /** 平台 */
    protocol: 'pump_fun' | 'moonshot' | 'raydium' | DefiProtocol;
    /** Token */
    token: TokenInfo;
    /** 操作类型 */
    action: 'buy' | 'sell' | 'create';
    /** SOL 数量（买入/卖出） */
    solAmount: string;
    /** Token 数量 */
    tokenAmount: string;
    /** Bonding Curve 地址（适用于 Pump.fun） */
    bondingCurve?: string;
    /** 是否毕业（已上 Raydium） */
    graduated?: boolean;
}

// ==================== 交易摘要 ====================

/** 扩展的交易摘要 */
export interface TxSummary {
    /** 集群 */
    cluster: SolanaCluster;
    /** 手续费支付者 */
    feePayer: string;

    /** 交易类型 */
    type?: TxType;

    /** 简单转账信息（向后兼容） */
    to?: string;
    lamports?: number;

    /** 涉及的 Program IDs */
    programIds: string[];

    /** 最近 Blockhash */
    recentBlockhash?: string;

    // ========== 复杂交易详情（根据 type 填写对应字段） ==========

    /** Swap 详情 */
    swap?: SwapDetails;

    /** 质押详情 */
    stake?: StakeDetails;

    /** NFT 详情 */
    nft?: NftDetails;

    /** LP 详情 */
    lp?: LpDetails;

    /** 借贷详情 */
    lending?: LendingDetails;

    /** Meme 币详情 */
    meme?: MemeCoinDetails;

    /** 自定义扩展字段 */
    custom?: Record<string, unknown>;
}

// ==================== Trace 相关 ====================

/** Trace Payload - 用于计算 hash 的核心数据 */
export interface TracePayload {
    /** 随机盐值或唯一标识，用于区分相同逻辑的多次执行 */
    nonce?: string;
    intent: string;
    plan: {
        steps: string[];
    };
    toolCalls: ToolCall[];
    txSummary: TxSummary;
}

/** 链上信息 */
export interface OnChainInfo {
    signature: string;
    slot?: number;
    status?: OnChainStatus;
    memo?: string;
}

/** 调试信息 */
export interface DebugInfo {
    txBase64?: string;
}

/** 完整 Trace 对象 */
export interface Trace {
    version: TraceVersion;
    createdAt: string;
    /** 完整的 payload（包含所有 toolCalls） */
    payload: TracePayload;
    /** 用于计算 hash 的 payload 快照（在发送交易前冻结） */
    hashedPayload: TracePayload;
    payloadHash: string;
    onChain?: OnChainInfo;
    /** 缓存在本地的验证结果，用于减少 RPC 调用 */
    verifiedResult?: VerifyResult;
    /** 缓存在本地的交易解析摘要 */
    cachedTxSummary?: ParsedTxSummary;
    debug?: DebugInfo;
}

/** 验证结果 */
export interface VerifyResult {
    ok: boolean;
    expectedHash?: string;
    computedHash?: string;
    reasons: string[];
}

/** 交易摘要（从链上解析） */
export interface ParsedTxSummary {
    fee: number;
    programs: string[];
    to?: string;
    lamports?: number;
    type?: TxType;
}
