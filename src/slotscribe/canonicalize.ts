/**
 * JSON 规范化 (Canonicalization)
 * 使用 RFC8785 / JCS 风格输出稳定的 JSON 字符串
 * 
 * 这个实现兼容 Node.js CLI 和 Next.js/Webpack 环境
 */

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) 实现
 * 
 * 规则：
 * 1. 对象键按 Unicode 码点排序
 * 2. 数字使用 ES6 Number 序列化
 * 3. 字符串使用 JSON.stringify 转义
 * 4. 无空白字符
 */
function canonicalizeValue(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error('JSON cannot represent Infinity or NaN');
        }
        // ES6 规范的数字序列化
        return Object.is(value, -0) ? '0' : String(value);
    }

    if (typeof value === 'string') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        const items = value.map(item => canonicalizeValue(item));
        return '[' + items.join(',') + ']';
    }

    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).sort((a, b) => {
            // 按 UTF-16 码元比较（JavaScript 默认行为）
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });

        const pairs = keys
            .filter(key => obj[key] !== undefined) // 忽略 undefined 值
            .map(key => JSON.stringify(key) + ':' + canonicalizeValue(obj[key]));

        return '{' + pairs.join(',') + '}';
    }

    // undefined 和 function 在 JSON 中不支持
    if (value === undefined) {
        return 'null';
    }

    throw new Error(`Cannot canonicalize value of type ${typeof value}`);
}

/**
 * 将任意值规范化为稳定的 JSON 字符串
 * 用于确保相同数据产生相同的 hash
 * 
 * @param value - 任意可序列化的值
 * @returns 规范化后的 JSON 字符串
 */
export function canonicalizeJson(value: unknown): string {
    return canonicalizeValue(value);
}
