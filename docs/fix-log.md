# SlotScribe Fix Log

## Scope
本次修复覆盖 `docs/bug-risk-report.md` 中 1-9 条风险项，按顺序落地并完成回归测试。

## Fixes

### 1) payload / hashedPayload 一致性缺口（Critical）
- 新增统一校验模块：`lib/traceIntegrity.ts`
- 上传接口改为统一完整性校验：
  - `app/api/trace/route.ts`
  - `app/api/trace/[hash]/route.ts`
- 服务端验证改为统一完整性校验：`lib/verifier.ts`
- CLI 验证同步：`scripts/verify.ts`

### 2) `/api/trace` 同 hash 覆盖写入（Critical）
- `POST /api/trace` 改为不可覆盖，已存在返回 `duplicate: true`
- 文件：`app/api/trace/route.ts`

### 3) recorder finalize 时机错误（High）
- `sendTransaction()` 改为先补全 `txSummary`，后 `finalizePayloadHash()`
- Legacy 路径在哈希前将 Memo Program 纳入 `programIds`
- 文件：`src/slotscribe/recorder.ts`

### 4) plugin finalize 时机错误（High）
- 插件 `sendTransaction` 先 `setTxSummary` 再 finalize，再注入 memo
- 文件：`src/slotscribe/plugin.ts`

### 5) plugin `sendRawTransaction` 路径 buildTrace 异常（High）
- 上传前先检查 `recorder.getPayloadHash()`
- 未 finalize 时安全跳过上传并记录 warning
- 文件：`src/slotscribe/plugin.ts`

### 6) VersionedTransaction 自动锚定语义不实（High）
- recorder 对 `VersionedTransaction` 显式抛错并给出迁移指引
- plugin 对 `VersionedTransaction` 显式抛错，避免“静默未锚定”
- 文件：
  - `src/slotscribe/recorder.ts`
  - `src/slotscribe/plugin.ts`

### 7) 验证页仅 hash 查询被按钮拦截（Medium）
- 按钮禁用条件改为：`(!signature && !hash)` 才禁用
- 文件：`app/verify/page.tsx`

### 8) cluster 非法值静默回退（Medium）
- `/api/verify` 增加 cluster 严格白名单校验，非法返回 400
- `lib/solanaRpc.ts` 移除默认回退，非法 cluster 显式抛错
- 文件：
  - `app/api/verify/route.ts`
  - `lib/solanaRpc.ts`

### 9) README 与实现不一致（Medium）
- README/README_CN 对齐真实导出和脚本：
  - `withSlotScribeConnection` -> `withSlotScribe`
  - `sendTransactionWithSlotScribe` -> `sendTransaction`
  - `pnpm demo:plugin` -> `pnpm examples`
- 文件：
  - `README.md`
  - `README_CN.md`

## Added Test Scripts
- `scripts/test-trace-integrity.ts`
- `scripts/test-trace-no-overwrite.ts`
- `scripts/test-sendtx-finalize-order.ts`
- `scripts/test-plugin-finalize-order.ts`
- `scripts/test-plugin-sendraw-no-buildtrace.ts`
- `scripts/test-versioned-sendtx-rejected.ts`
- `scripts/test-plugin-versioned-sendtx-rejected.ts`
- `scripts/test-verify-cluster-validation.ts`

## Regression Commands
- `pnpm -s exec tsc --noEmit`
- `pnpm -s tsx scripts/test-trace-integrity.ts`
- `pnpm -s tsx scripts/test-trace-no-overwrite.ts`
- `pnpm -s tsx scripts/test-sendtx-finalize-order.ts`
- `pnpm -s tsx scripts/test-plugin-finalize-order.ts`
- `pnpm -s tsx scripts/test-plugin-sendraw-no-buildtrace.ts`
- `pnpm -s tsx scripts/test-versioned-sendtx-rejected.ts`
- `pnpm -s tsx scripts/test-plugin-versioned-sendtx-rejected.ts`
- `pnpm -s tsx scripts/test-verify-cluster-validation.ts`

## Result
上述回归命令均通过。
