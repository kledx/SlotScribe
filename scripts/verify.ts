/**
 * CLI Verify Script
 * 
 * 从链上读取交易，验证 memo 中的 hash 与本地 trace 计算的 hash 是否一致
 */

import {
    getConnection,
    findMemoInTransaction,
    extractSlotScribeMemo,
    summarizeTransaction,
} from '../src/slotscribe/index';
import { validateTraceIntegrity } from '../lib/traceIntegrity';
import {
    getConfig,
    readTraceFile,
    log,
    logError,
    logSuccess,
} from './_shared';
import { readFile } from 'fs/promises';
import type { Trace } from '../src/slotscribe/types';

async function main() {
    const config = getConfig();

    // 验证必填参数
    if (!config.signature) {
        logError('Missing required argument: --sig <signature>');
        console.log('\nUsage:');
        console.log('  pnpm verify -- --sig <signature> [--cluster devnet] [--hash <hash>] [--trace <path>]');
        process.exit(1);
    }

    log(`Verifying transaction on ${config.cluster}...`);
    log(`Signature: ${config.signature}`);

    // 创建 Connection
    const connection = getConnection(config.cluster, config.rpcUrl);

    // Step 1: 获取链上交易
    log('Fetching transaction from chain...');

    const txResponse = await connection.getParsedTransaction(config.signature, {
        maxSupportedTransactionVersion: 0,
    });

    if (!txResponse) {
        logError('Transaction not found on chain');
        process.exit(1);
    }

    log(`Transaction found in slot ${txResponse.slot}`);

    // Step 2: 解析 memo
    const memoData = findMemoInTransaction(txResponse);

    if (!memoData) {
        logError('No memo found in transaction');
        process.exit(1);
    }

    log(`Memo found: ${memoData}`);

    const { payloadHash: onChainHash, raw: memoRaw } = extractSlotScribeMemo(memoData);

    if (!onChainHash) {
        logError(`Invalid memo format. Expected "BBX1 payload=<hash>", got: ${memoRaw}`);
        process.exit(1);
    }

    log(`On-chain hash: ${onChainHash}`);

    // Step 3: 加载 trace
    let trace: Trace | null = null;
    const hashToUse = config.hash || onChainHash;

    if (config.traceFile) {
        // 从指定文件加载
        log(`Loading trace from file: ${config.traceFile}`);
        try {
            const content = await readFile(config.traceFile, 'utf8');
            trace = JSON.parse(content) as Trace;
        } catch (err) {
            logError(`Failed to read trace file: ${err}`);
            process.exit(1);
        }
    } else {
        // 从 tracesDir 按 hash 查找
        log(`Loading trace by hash: ${hashToUse}`);
        trace = await readTraceFile(hashToUse, config.tracesDir);
    }

    if (!trace) {
        logError(`Trace file not found for hash: ${hashToUse}`);
        logError(`Make sure the trace file exists at: ${config.tracesDir}/${hashToUse}.json`);
        process.exit(1);
    }

    log('Trace loaded successfully');

    // Step 4: 计算本地 hash
    // 使用 hashedPayload（计算 hash 时的快照），如果不存在则回退到 payload（兼容旧 trace）
    const integrity = validateTraceIntegrity(trace);
    const computedHash = integrity.computedHash;

    log(`Computed hash: ${computedHash}`);

    // Step 5: 比较 hash
    const hashMatch = computedHash.toLowerCase() === onChainHash.toLowerCase();

    // Step 6: 额外验证 txSummary
    const txSummary = summarizeTransaction(txResponse);
    const reasons: string[] = [];

    if (!integrity.ok) {
        reasons.push(`Trace integrity invalid: ${integrity.error}`);
    }

    if (!hashMatch) {
        reasons.push(`Hash mismatch: on-chain=${onChainHash}, computed=${computedHash}`);
    }

    // 验证 to 地址
    if (trace.payload.txSummary.to && txSummary.to) {
        if (trace.payload.txSummary.to !== txSummary.to) {
            reasons.push(`To address mismatch: trace=${trace.payload.txSummary.to}, chain=${txSummary.to}`);
        }
    }

    // 验证 lamports
    if (trace.payload.txSummary.lamports && txSummary.lamports) {
        if (trace.payload.txSummary.lamports !== txSummary.lamports) {
            reasons.push(`Lamports mismatch: trace=${trace.payload.txSummary.lamports}, chain=${txSummary.lamports}`);
        }
    }

    // 输出结果
    console.log('\n' + '='.repeat(60));

    if (hashMatch && reasons.length === 0) {
        console.log('VERIFIED ✓');
        console.log('='.repeat(60));
        console.log(`On-chain hash:  ${onChainHash}`);
        console.log(`Computed hash:  ${computedHash}`);
        console.log(`Trace intent:   ${trace.payload.intent}`);
        console.log(`Tool calls:     ${trace.payload.toolCalls.length}`);
        console.log(`Fee:            ${txSummary.fee} lamports`);
        console.log(`Programs:       ${txSummary.programs.join(', ')}`);
        logSuccess('Hash matches memo + trace payload');
    } else {
        console.log('NOT VERIFIED ✗');
        console.log('='.repeat(60));
        console.log(`On-chain hash:  ${onChainHash}`);
        console.log(`Computed hash:  ${computedHash}`);
        console.log('\nMismatch reasons:');
        for (const reason of reasons) {
            console.log(`  - ${reason}`);
        }
        logError('Verification failed');
        process.exit(1);
    }

    console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
    logError(err.message || String(err));
    console.error(err);
    process.exit(1);
});
