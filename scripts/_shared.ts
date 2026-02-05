/**
 * CLI 共享工具函数
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Trace, SolanaCluster } from '../src/slotscribe/types';

/** 默认配置 */
export const DEFAULT_CLUSTER: SolanaCluster = 'devnet';
export const DEFAULT_TRACES_DIR = './data/traces';

/**
 * 解析命令行参数
 */
export function parseArgs(): Record<string, string> {
    const args: Record<string, string> = {};
    const argv = process.argv.slice(2);

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
            args[key] = value;
        }
    }

    return args;
}

/**
 * 获取配置
 */
export function getConfig() {
    const args = parseArgs();

    return {
        cluster: (args.cluster || process.env.SOLANA_CLUSTER || DEFAULT_CLUSTER) as SolanaCluster,
        rpcUrl: args.rpc || process.env.SOLANA_RPC_URL || undefined,
        tracesDir: args.traces || process.env.TRACES_DIR || DEFAULT_TRACES_DIR,
        signature: args.sig || args.signature,
        hash: args.hash,
        traceFile: args.trace,
        to: args.to,
        sol: parseFloat(args.sol || '0.01'),
    };
}

/**
 * 确保 traces 目录存在
 */
export async function ensureTracesDir(dir: string = DEFAULT_TRACES_DIR): Promise<void> {
    await mkdir(dir, { recursive: true });
}

/**
 * 写入 trace 文件
 */
export async function writeTraceFile(
    hash: string,
    trace: Trace,
    dir: string = DEFAULT_TRACES_DIR
): Promise<string> {
    await ensureTracesDir(dir);
    const filePath = join(dir, `${hash}.json`);
    await writeFile(filePath, JSON.stringify(trace, null, 2), 'utf8');
    return filePath;
}

/**
 * 读取 trace 文件
 */
export async function readTraceFile(
    hash: string,
    dir: string = DEFAULT_TRACES_DIR
): Promise<Trace | null> {
    try {
        const filePath = join(dir, `${hash}.json`);
        const content = await readFile(filePath, 'utf8');
        return JSON.parse(content) as Trace;
    } catch {
        return null;
    }
}

/**
 * 日志输出
 */
export function log(message: string): void {
    console.log(`[SlotScribe] ${message}`);
}

export function logError(message: string): void {
    console.error(`[SlotScribe ERROR] ${message}`);
}

export function logSuccess(message: string): void {
    console.log(`[SlotScribe ✓] ${message}`);
}
