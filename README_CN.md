# SlotScribe — Solana AI Agent 可验证黑盒（Execution Flight Recorder）

> 让 Solana 上的 AI Agent 从“信任我”变成“你可以验证我”。

SlotScribe 是一个 **可验证的执行记录器（Execution Recorder）**：  
- Agent **照常**构建/签名/发送交易（SlotScribe 不托管私钥、不替你签名）。  
- SlotScribe 在链下记录 trace（意图、计划、工具调用、交易摘要等），对 **trace.payload** 做 JSON 规范化后计算 **SHA-256**。  
- 将该 hash 写入同一笔交易的 **Memo** 指令（链上锚定）。  
- 任何人只要提供 tx signature，就能在 Viewer/CLI 中复算 hash 并验证：  
  ✅ **on-chain Memo hash == trace payload hash**

---

## 🤖 AI Agent 生态兼容

SlotScribe 为现代 AI Agent 提供多种集成方式：
- **[MCP 服务器](file:///e:/work_space/SlotScribe/docs/MCP_Quick_Start.md)**: 原生支持 Model Context Protocol，适配 Claude Desktop 及各类 MCP Agent。
- **[1 行 SDK 插件](file:///e:/work_space/SlotScribe/docs/AI_Agent_Quick_Start.md)**: 为 TypeScript/Node.js Agent 提供极简集成。
- **[公共 API](https://slotscribe.xyz/api/trace)**: 为任何语言（Python, Rust 等）编写的 Agent 提供 REST API。

---

## 为什么需要 SlotScribe？

当 AI Agent 开始参与 DeFi、质押、交易、任务市场时，最大的风险不是“能不能做”，而是：
- 它到底做了什么？
- 有没有事后改口？
- 出问题时如何复盘与问责？

SlotScribe 提供一个简单但强大的基础设施：**可验证的执行收据（verifiable execution receipt）**。

---

## SlotScribe 如何“验证 agent 行为”？（你可以直接引用）

### 1) 把“行为”从口头声明变成可核对的证据

没有 SlotScribe 时，agent 可以说：

> “我帮你买了 meme 币，放心。”

有 SlotScribe 时，agent 必须给出：
- tx signature
- 可验证报告（✅ Verified）

用户/另一个 agent 可以独立核对：
- 真的买了吗？买了哪个 token？花了多少？结果如何？
- 有没有夹带别的指令（例如转走资产）？

这就是行为验证：从“我说我做了”变成“链上证据显示我做了”。

### 2) 让“信任门槛”自动化（让别的 agent 做判断）

这才是 SlotScribe 真正的扩散点：
- 任务市场/资金方/策略跟单 agent 可以设规则：  
  - `if not SlotScribe verified -> refuse / require manual review`
- 结算可以绑定：  
  - “只有 Verified 的 tx 才付款/分成”

---

## 核心原理（最重要）

### Hash 规则
- `payloadHash = sha256Hex(canonicalize(trace.payload))`
- Memo 内容必须包含：`SS1 payload=<payloadHash>`

### 验证流程
1. RPC 拉取交易，解析 Memo 得到 `payloadHashOnChain`
2. 读取 `trace.json`
3. 重新计算 `payloadHashLocal`
4. 比较：`payloadHashOnChain === payloadHashLocal` → ✅ Verified

> 注意：`trace` 可包含 `onChain` 等字段，但**不参与 hash**。参与 hash 的只有 `trace.payload`。

---

## 快速开始（本地 Demo）

### 依赖
- Node.js >= 20
- pnpm

### 安装
```bash
pnpm install
```

### 一键跑通 Demo（devnet）
```bash
pnpm demo
```

你将看到类似输出：
- `Signature: <tx_signature>`
- `PayloadHash: <sha256_hex>`
- `Viewer: http://localhost:3000/verify?cluster=devnet&sig=<tx_signature>&hash=<sha256_hex>`

打开 Viewer 链接后应显示：
- ✅ Verified（Memo hash 与 trace payload hash 匹配）
- 交易摘要（to / lamports / fee / programs）
- trace 时间线（intent / plan / tool calls / send）

> Demo 会在 devnet 用临时 Keypair airdrop 资金，然后发送一笔带 Memo 的转账交易。

---

## CLI 验证

```bash
pnpm verify -- --cluster devnet --sig <tx_signature>
```

可选参数：
- `--hash <payloadHash>`（不传则从 Memo 解析）
- `--rpc <rpcUrl>`
- `--trace <path>`（指定 trace 文件路径）

---

## Viewer（验证页面）

本地启动：
```bash
pnpm dev
```

页面：
- 首页：`http://localhost:3000/`
- 验证页：`http://localhost:3000/verify`

验证页支持：
- 输入 tx signature
- 选择 cluster（devnet/mainnet-beta/testnet）
- 输出 ✅/❌ 与 mismatch 原因（reasons）

---

## 1 行集成（自动记录插件）

SlotScribe 提供 **自动记录插件**，让其他团队几乎不用改业务逻辑就能接入。

### 方式 A：包一层 Connection（推荐）
```ts
import { Connection } from "@solana/web3.js";
import { withSlotScribe } from "slotscribe";

const connection = withSlotScribe(new Connection(rpcUrl, "confirmed"), {
  cluster: "devnet",
  autoUpload: true,
  baseUrl: "http://localhost:3000"
});

// 直接沿用标准 API：
const signature = await connection.sendTransaction(tx, [payer]);
```

### 方式 B：包一层 Signer（best-effort）
适用于某些只暴露 signer 的框架。注意 signer 不负责广播，所以更适合做“预提交 trace”。

---

## 插件 Demo
```bash
pnpm examples
```

---

## Trace 存储

SlotScribe 默认使用内容寻址（content-addressable）方式：  
- 文件：`data/traces/<payloadHash>.json`（hackathon 最快）
- HTTP：`POST/GET /api/trace/<hash>`（推荐部署后给生态使用）
- 后续可扩展到 S3/R2、IPFS/Arweave 等

---

## 公共 API（供其他 Agent 使用）

SlotScribe 在 `https://slotscribe.xyz` 提供**公共 API**，其他 Agent 可以直接上传和查询 trace。

### 上传 trace
```bash
POST https://slotscribe.xyz/api/trace
Content-Type: application/json

{
  "version": "BBX1",
  "payload": { ... },
  "payloadHash": "<sha256_hex>",
  ...
}
```

### 查询 trace
```bash
GET https://slotscribe.xyz/api/trace/<payloadHash>
```

### SDK 辅助函数
```typescript
import { SlotScribeRecorder, uploadTrace, buildMemoIx } from 'slotscribe';

// ... 交易确认后 ...
const trace = recorder.buildTrace();
const result = await uploadTrace(trace, {
    baseUrl: 'https://slotscribe.xyz'
});

console.log('验证页面:', result.viewerUrl);
// → https://slotscribe.xyz/verify?sig=xxx&hash=xxx
```

### API 特性
- ✅ 支持 CORS（任何域名都可调用）
- ✅ Hash 验证（重新计算并校验）
- ✅ 防重复上传（相同 hash 不会覆盖）

---

## 目录结构

```
src/slotscribe/      # 核心 SDK（trace、canonicalize、hash、recorder、solana helpers）
src/plugins/         # 自动记录插件（1 行集成）
scripts/             # demo / verify CLI
app/                 # Next.js Viewer（verify 页面 + trace API）
lib/                 # trace store / verifier
data/traces/         # 本地 trace 存储（默认）
```

---

## 安全与边界

- SlotScribe **不托管私钥**、不替你签名、不改变交易语义（只追加 Memo 指令）。
- SlotScribe 验证的是：**链上 memo hash 与 trace payload 一致**。  
  它不直接证明“链下工具输出是真实的”，但能保证记录**不可事后篡改**。
- 建议在生产场景叠加“Policy Gate”（限额、allowlist、滑点限制等）做事前防护。

---

## Roadmap（建议）

- [ ] 多交易 session（一个 intent → 多笔 tx 的统一时间线）
- [ ] DeFi 解析插件（Jupiter swap / staking / token delta）
- [x] MCP 支持：提供交互式 Agent 的 slotscribe-mcp 服务器
- [ ] Commit–Reveal（更强的不可抵赖：防事后改口）

---

## License
MIT
