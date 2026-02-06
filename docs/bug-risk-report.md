# SlotScribe 潜在 Bug / 风险（按严重度）与检查结果

## 潜在 bug / 风险（按严重度）

### Critical
1. 校验基于 `hashedPayload`，UI 展示基于 `payload`，存在“验证通过但展示内容可被替换”的完整性缺口。  
涉及位置：`app/api/trace/route.ts:104`、`app/api/trace/[hash]/route.ts:122`、`lib/verifier.ts:148`、`app/report/[sig]/page.tsx:269`、`app/report/[sig]/page.tsx:382`。

2. `POST /api/trace` 允许同 hash 覆盖写入，且无鉴权，等于允许公开重写记录。  
涉及位置：`app/api/trace/route.ts:121`、`app/api/trace/route.ts:124`、`app/api/trace/route.ts:129`。

### High
3. `recorder.sendTransaction` 先 `finalizePayloadHash` 再自动填充 `txSummary`，导致自动填充字段未被哈希承诺。  
涉及位置：`src/slotscribe/recorder.ts:452`、`src/slotscribe/recorder.ts:455`。

4. 插件中同样先 finalize 再 `setTxSummary`，承诺内容与展示内容可能不一致。  
涉及位置：`src/slotscribe/plugin.ts:57`、`src/slotscribe/plugin.ts:61`。

5. 插件拦截 `sendRawTransaction` 时不会 finalize，却在后续 `buildTrace()`，会抛错并吞掉，只打日志。  
涉及位置：`src/slotscribe/plugin.ts:72`、`src/slotscribe/plugin.ts:88`。

6. `VersionedTransaction` 分支未注入 Memo，函数语义是“自动锚定”但该路径实际可能未锚定。  
涉及位置：`src/slotscribe/recorder.ts:455`、`src/slotscribe/recorder.ts:488`。

### Medium
7. 验证页支持“仅 hash”查询逻辑，但按钮被 `!signature.trim()` 禁用，前后端行为不一致。  
涉及位置：`app/verify/page.tsx:117`、`app/verify/page.tsx:234`。

8. `cluster` 参数直接强转，非法值会静默回退默认网络（当前默认主网），容易误验到错误链。  
涉及位置：`app/api/verify/route.ts:16`、`lib/solanaRpc.ts:27`、`lib/constants.ts:8`。

9. README 与实际代码/脚本不一致：提到 `withSlotScribeConnection` 和 `demo:plugin`，仓库里没有对应实现/脚本。  
涉及位置：`README.md:157`、`README.md:176`、`package.json:25`。

## 检查结果

1. `tsc --noEmit` 通过。  
2. `pnpm lint` 当前不可用，会进入 Next.js ESLint 初始化交互（尚未配置 lint）。
