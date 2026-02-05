/**
 * SHA256 哈希计算
 */

import { createHash } from 'crypto';

/**
 * 计算输入的 SHA256 哈希值
 * 
 * @param input - 字符串或 Uint8Array
 * @returns 64 位小写十六进制字符串
 */
export function sha256Hex(input: string | Uint8Array): string {
    const hash = createHash('sha256');

    if (typeof input === 'string') {
        hash.update(input, 'utf8');
    } else {
        hash.update(Buffer.from(input));
    }

    return hash.digest('hex');
}
