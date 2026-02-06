# SlotScribe - Solana AI Agent 可验证执行记录器

SlotScribe 是一个可验证执行记录器：
- Agent 仍按原流程构建/签名/发送交易（不托管私钥）。
- 在链下记录 trace（`intent`、`plan`、`toolCalls`、`txSummary`）。
- 计算 `payloadHash = sha256(canonicalize(trace.payload))`。
- 在同一笔交易中通过 Memo 锚定：`SS1 payload=<hash>`。
- 任意第三方都可以通过签名/哈希独立复验。

## 为什么需要
当 Agent 开始处理真实资产时，核心问题不是“能不能做”，而是“能不能被独立验证”。
SlotScribe 把 Agent 的声明变成可验证的密码学收据。

## 快速入口
- 文档页：`/docs`
- 验证页：`/verify`
- 公共 Trace API：`https://slotscribe.xyz/api/trace`
- AI Prompt 指南：`./docs/AI_Agent_System_Prompt.md`

## 安装（npm）
```bash
npm i slotscribe@latest @solana/web3.js
# 或
pnpm add slotscribe@latest @solana/web3.js
```

查看最新版本：
```bash
npm view slotscribe version
```

## 最小示例
```ts
import { SlotScribeRecorder, getConnection } from 'slotscribe';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';

const cluster = 'devnet';
const connection = getConnection(cluster);
const payer = Keypair.generate();

const recorder = new SlotScribeRecorder({
    intent: 'Quickstart transfer test',
    cluster,
});

recorder.setTransferTx({
    feePayer: payer.publicKey.toBase58(),
    to: payer.publicKey.toBase58(),
    lamports: 1000,
});

const tx = new Transaction().add(
    SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 1000,
    })
);

const signature = await recorder.sendTransaction(connection, tx, [payer], {
    autoUpload: true,
    baseUrl: 'https://slotscribe.xyz',
});

const trace = recorder.buildTrace();
console.log('signature=', signature);
console.log('payloadHash=', trace.payloadHash);
console.log('verifyUrl=', `https://slotscribe.xyz/verify?cluster=${cluster}&sig=${signature}&hash=${trace.payloadHash}`);
```

## 本地运行
```bash
pnpm install
pnpm dev
```

## 公共 API
- `GET /api/verify?cluster=...&signature=...&hash=...`
- `POST /api/trace`
- `GET /api/trace/{hash}`
- `POST /api/trace/{hash}`

## 安全说明
- SlotScribe 验证的是哈希完整性，不直接证明链下工具输出的“业务真实性”。
- 生产环境建议叠加策略门（allowlist、额度、滑点限制）。

## 目录结构
- `src/slotscribe/`：SDK 核心
- `app/`：Viewer 页面与 API
- `lib/`：验证与存储辅助
- `scripts/`：Demo/验证脚本
- `docs/`：文档与提示词

## 许可证
MIT
