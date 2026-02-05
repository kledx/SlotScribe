# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-02-05

### Fixed
- Enforced trace integrity consistency across API/CLI/server verification:
  - `payload` and `hashedPayload` must match when both are present.
  - `payloadHash` must match `hash(payload)`.
- Prevented overwrite on `POST /api/trace` when hash already exists.
- Fixed recorder finalize ordering in `sendTransaction`:
  - Auto-fill `txSummary` before `finalizePayloadHash()`.
- Fixed plugin finalize ordering to match recorder behavior.
- Fixed plugin `sendRawTransaction` follow-up path:
  - Skip upload safely when payload hash is not finalized.
- Added explicit rejection for `VersionedTransaction` auto-memo paths in recorder/plugin.
- Enabled verify page hash-only submit path (`signature` OR `hash`).
- Added strict cluster validation in `/api/verify` and removed silent RPC fallback.
- Synced README and README_CN examples with actual exports and scripts.
- Synced docs page examples with current repository behavior and script names.

### Added
- `lib/traceIntegrity.ts` shared validation helper.
- Test scripts:
  - `scripts/test-trace-integrity.ts`
  - `scripts/test-trace-no-overwrite.ts`
  - `scripts/test-sendtx-finalize-order.ts`
  - `scripts/test-plugin-finalize-order.ts`
  - `scripts/test-plugin-sendraw-no-buildtrace.ts`
  - `scripts/test-versioned-sendtx-rejected.ts`
  - `scripts/test-plugin-versioned-sendtx-rejected.ts`
  - `scripts/test-verify-cluster-validation.ts`

### Packaging
- Prepared npm publishing metadata in `package.json`:
  - `private: false`
  - `publishConfig.access: public`
  - `prepublishOnly: pnpm build:sdk`
  - corrected `main/module/exports` targets to match `tsup` output.
