/**
 * 交易验证器
 */

import { getConnection } from './solanaRpc';
import { traceStore } from './traceStore';
import {
    findMemoInTransaction,
    extractSlotScribeMemo,
    summarizeTransaction,
    canonicalizeJson,
    sha256Hex,
} from '../src/slotscribe/index';
import type { SolanaCluster, Trace, VerifyResult, ParsedTxSummary } from '../src/slotscribe/types';

export interface VerifyOptions {
    cluster: SolanaCluster;
    signature: string;
    hash?: string;
    rpcUrl?: string;
}

export interface VerifyResponse {
    result: VerifyResult;
    trace?: Trace;
    txSummary?: ParsedTxSummary;
    memoRaw?: string;
    onChainHash?: string;
    slot?: number;
}

/**
 * 验证交易与 trace 的一致性
 */
export async function verifyTxWithTrace(options: VerifyOptions): Promise<VerifyResponse> {
    const { cluster, signature, hash, rpcUrl } = options;
    const reasons: string[] = [];

    // Step 0: 检查缓存 (如果提供了 hash，尝试实现 0 RPC 读取)
    if (hash) {
        const cachedTrace = await traceStore.get(hash);
        if (cachedTrace?.verifiedResult?.ok && cachedTrace.onChain?.signature === signature) {
            console.log(`[Verifier] ⚡ Cache Hit! Returning sealed verification for hash: ${hash}`);
            return {
                result: cachedTrace.verifiedResult,
                trace: cachedTrace,
                txSummary: cachedTrace.cachedTxSummary,
                onChainHash: cachedTrace.payloadHash,
                slot: cachedTrace.onChain?.slot,
            };
        }
    }

    // Step 1: 获取链上交易 (如果缓存未命中或未传 hash)
    const connection = getConnection(cluster, rpcUrl);
    console.log(`[Verifier] Fetching transaction ${signature} from ${cluster}...`);
    const txResponse = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
    });

    if (!txResponse) {
        return {
            result: {
                ok: false,
                reasons: ['Transaction not found on chain'],
            },
        };
    }

    // Step 2: 解析 memo
    const memoData = findMemoInTransaction(txResponse);

    if (!memoData) {
        return {
            result: {
                ok: false,
                reasons: ['No memo found in transaction'],
            },
            slot: txResponse.slot,
        };
    }

    const { payloadHash: onChainHash, raw: memoRaw } = extractSlotScribeMemo(memoData);

    if (!onChainHash) {
        return {
            result: {
                ok: false,
                reasons: [`Invalid memo format. Expected "BBX1 payload=<hash>", got: "${memoRaw}"`],
            },
            memoRaw,
            slot: txResponse.slot,
        };
    }

    // Step 3: 加载 trace
    const hashToUse = hash || onChainHash;
    console.log(`[Verifier] Fetching trace for hash: ${hashToUse} from store...`);
    const trace = await traceStore.get(hashToUse);

    if (!trace) {
        console.warn(`[Verifier] Trace NOT FOUND in store for hash: ${hashToUse}`);
        return {
            result: {
                ok: false,
                expectedHash: onChainHash,
                reasons: [`Trace file not found in data center for hash: ${hashToUse}. Please ensure the agent has uploaded the trace.`],
            },
            memoRaw,
            onChainHash,
            slot: txResponse.slot,
        };
    }

    // Step 3.5: 再次检查 Trace 内部的缓存 (支持通过 sig 查到 hash 后的第二次缓存检查)
    if (trace.verifiedResult?.ok && trace.onChain?.signature === signature) {
        console.log(`[Verifier] ⚡ Cache Hit (Post-Lookup)! Returning sealed verification.`);
        return {
            result: trace.verifiedResult,
            trace: trace,
            txSummary: trace.cachedTxSummary,
            onChainHash: trace.payloadHash,
            slot: trace.onChain?.slot,
        };
    }

    // Step 4: 计算本地 hash
    const payloadForHash = trace.hashedPayload || trace.payload;
    const canonical = canonicalizeJson(payloadForHash);
    const computedHash = sha256Hex(canonical);

    // Step 5: 比较 hash
    const hashMatch = computedHash.toLowerCase() === onChainHash.toLowerCase();

    if (!hashMatch) {
        reasons.push(`Hash mismatch: on-chain=${onChainHash}, computed=${computedHash}`);
    }

    // Step 6: 提取交易摘要
    const txSummary = summarizeTransaction(txResponse);

    // 额外验证 txSummary
    if (trace.payload.txSummary.to && txSummary.to) {
        if (trace.payload.txSummary.to !== txSummary.to) {
            reasons.push(`To address mismatch: trace=${trace.payload.txSummary.to}, chain=${txSummary.to}`);
        }
    }

    if (trace.payload.txSummary.lamports && txSummary.lamports) {
        if (trace.payload.txSummary.lamports !== txSummary.lamports) {
            reasons.push(`Lamports mismatch: trace=${trace.payload.txSummary.lamports}, chain=${txSummary.lamports}`);
        }
    }

    const finalResult = {
        ok: hashMatch && reasons.length === 0,
        expectedHash: onChainHash,
        computedHash,
        reasons,
    };

    // Step 7: 持久化验证结果 (联动 R2/磁盘)
    if (finalResult.ok) {
        console.log(`[Verifier] ✅ Verification successful. Sealing result to store...`);
        const updatedTrace: Trace = {
            ...trace,
            verifiedResult: finalResult,
            cachedTxSummary: txSummary,
            onChain: {
                ...trace.onChain,
                signature,
                slot: txResponse.slot,
            }
        };
        await traceStore.put(hashToUse, updatedTrace);
    }

    return {
        result: finalResult,
        trace,
        txSummary,
        memoRaw,
        onChainHash,
        slot: txResponse.slot,
    };
}
