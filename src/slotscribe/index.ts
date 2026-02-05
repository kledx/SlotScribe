/**
 * SlotScribe SDK
 * 统一导出
 */

// Types - Core
export type {
    TraceVersion,
    SolanaCluster,
    OnChainStatus,
    ToolCall,
    TracePayload,
    OnChainInfo,
    DebugInfo,
    Trace,
    VerifyResult,
    ParsedTxSummary,
} from './types';

// Types - Transaction
export type {
    TxType,
    TxSummary,
    DefiProtocol,
    TokenInfo,
    SwapDetails,
    StakeDetails,
    NftDetails,
    LpDetails,
    LendingDetails,
    MemeCoinDetails,
} from './types';

// Canonicalize
export { canonicalizeJson } from './canonicalize';

// Hash
export { sha256Hex } from './hash';

// Recorder
export { SlotScribeRecorder, token, TOKENS } from './recorder';
export type { RecorderOptions } from './recorder';

export {
    MEMO_PROGRAM_ID,
    SYSTEM_PROGRAM_ID,
    getRpcUrl,
    getConnection,
    buildMemoIx,
    extractSlotScribeMemo,
    findMemoInTransaction,
    summarizeTransaction,
    getParsedTransaction,
} from './solana';

// Upload helpers
export {
    uploadTrace,
    saveTraceToFile,
    saveTrace,
} from './upload';
export type { UploadResult, UploadOptions } from './upload';
