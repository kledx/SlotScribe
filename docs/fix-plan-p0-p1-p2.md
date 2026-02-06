# SlotScribe 分批修复计划（P0/P1/P2）

基于 `docs/bug-risk-report.md` 的 9 条风险，按影响范围与安全优先级分批推进。

## P0（立即修复，阻断安全风险）

目标：修复完整性缺口与公开覆盖写入风险，避免“验证通过但内容可篡改”。

### 覆盖项
1. 统一哈希来源，禁止 `payload` / `hashedPayload` 不一致（风险 #1）。
2. 禁止匿名覆盖写入 trace（风险 #2）。
3. finalize 后冻结 payload，禁止继续修改（风险 #3/#4 的基础防线）。

### 具体改动文件清单
- `app/api/trace/route.ts`
- `app/api/trace/[hash]/route.ts`
- `lib/verifier.ts`
- `src/slotscribe/recorder.ts`
- `app/report/[sig]/page.tsx`
- （可选）`src/slotscribe/types.ts`（若决定弱化或移除 `hashedPayload`）

### 验收标准
- 上传接口对不一致 payload 拒绝（HTTP 400）。
- 同 hash 的 `POST /api/trace` 不可覆盖。
- finalize 后任何修改 API 报错。
- 报告页展示的数据与校验输入一致。

---

## P1（高优先级行为正确性）

目标：修复 SDK/插件流程语义错误，避免“自动锚定”名不副实。

### 覆盖项
4. 修复 `sendTransaction` finalize 时机（风险 #3）。
5. 修复插件 finalize 时机（风险 #4）。
6. 修复 `sendRawTransaction` 路径 buildTrace 失败（风险 #5）。
7. 明确并修复 `VersionedTransaction` 自动注入策略（风险 #6）。

### 具体改动文件清单
- `src/slotscribe/recorder.ts`
- `src/slotscribe/plugin.ts`
- `src/slotscribe/solana.ts`（若补充 Versioned 相关 helper）
- `scripts/demo-transfer.ts`（如需配合新行为示例）
- `scripts/verify.ts`（如需同步提示文案）

### 验收标准
- Legacy transaction 路径：先补全 summary，再 finalize，再注入 memo。
- `sendRawTransaction` 默认不触发 `buildTrace()` 异常。
- Versioned transaction：要么明确支持并验证通过，要么显式抛错并给出指引。

---

## P2（一致性与可维护性）

目标：修复 UI/API 体验不一致、配置隐患、文档漂移。

### 覆盖项
8. 验证页支持“仅 hash 查询”交互（风险 #7）。
9. cluster 参数严格校验，非法值返回 400（风险 #8）。
10. 文档与真实实现对齐（风险 #9）。

### 具体改动文件清单
- `app/verify/page.tsx`
- `app/api/verify/route.ts`
- `lib/solanaRpc.ts`
- `lib/constants.ts`
- `README.md`
- `README_CN.md`
- `package.json`
- `src/slotscribe/index.ts`（若新增别名导出以兼容文档）
- `src/plugins/*`（若补齐 `withSlotScribeConnection` 包装层）

### 验收标准
- 前端按钮条件与后端查询能力一致。
- 非法 cluster 不再静默回退。
- README 中命令与导出在仓库中可直接运行。

---

## 建议执行顺序
1. 先做 P0 并上线（安全兜底）。
2. 再做 P1（保证 SDK 行为可信）。
3. 最后做 P2（体验与文档收敛）。

## 回归检查清单
- `pnpm -s exec tsc --noEmit`
- `pnpm dev` 下手工验证：
  - 上传重复 hash
  - 仅 hash 查询
  - legacy / versioned 交易路径
- （补充后）`pnpm lint` 非交互可执行
