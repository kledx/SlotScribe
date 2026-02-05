import type { Trace } from '../src/slotscribe/types';
import { canonicalizeJson } from '../src/slotscribe/canonicalize';
import { sha256Hex } from '../src/slotscribe/hash';

export interface TraceIntegrityResult {
    ok: boolean;
    computedHash: string;
    error?: string;
}

/**
 * Validates that:
 * 1) payload and hashedPayload are identical when hashedPayload is present
 * 2) payloadHash matches hash(payload)
 */
export function validateTraceIntegrity(trace: Trace): TraceIntegrityResult {
    const payloadCanonical = canonicalizeJson(trace.payload);
    const computedHash = sha256Hex(payloadCanonical);

    if (trace.hashedPayload) {
        const hashedPayloadCanonical = canonicalizeJson(trace.hashedPayload);
        if (hashedPayloadCanonical !== payloadCanonical) {
            return {
                ok: false,
                computedHash,
                error: 'payload and hashedPayload mismatch',
            };
        }
    }

    if (computedHash.toLowerCase() !== trace.payloadHash.toLowerCase()) {
        return {
            ok: false,
            computedHash,
            error: 'payloadHash does not match payload',
        };
    }

    return {
        ok: true,
        computedHash,
    };
}
