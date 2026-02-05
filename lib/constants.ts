import { SolanaCluster } from '../src/slotscribe/types';

/**
 * 全局默认网络
 * 优先级: 环境变量 > 默认主网
 */
export const DEFAULT_CLUSTER: SolanaCluster =
    (process.env.NEXT_PUBLIC_DEFAULT_CLUSTER as SolanaCluster) || 'mainnet-beta';

/**
 * 是否启用调试日志
 */
export const IS_DEBUG = process.env.NODE_ENV === 'development';
