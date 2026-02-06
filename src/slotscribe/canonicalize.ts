/**
 * API note.
 * API note.
 * 
 * API note.
 */

/**
 * API note.
 * 
 * API note.
 * API note.
 * API note.
 * API note.
 * API note.
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
        // Note.
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
            // Note.
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });

        const pairs = keys
            .filter(key => obj[key] !== undefined) // Note.
            .map(key => JSON.stringify(key) + ':' + canonicalizeValue(obj[key]));

        return '{' + pairs.join(',') + '}';
    }

    // Note.
    if (value === undefined) {
        return 'null';
    }

    throw new Error(`Cannot canonicalize value of type ${typeof value}`);
}

/**
 * API note.
 * API note.
 * 
 * API note.
 * API note.
 */
export function canonicalizeJson(value: unknown): string {
    return canonicalizeValue(value);
}
