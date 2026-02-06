# SlotScribe（Agent 黑盒 / 飞行记录器）— Coding Agent 任务拆分 Prompt（逐文件）

> 复制下面整段（从“PROMPT START”到“PROMPT END”）喂给你的 coding agent。  
> 目标是 **一次性搭起可运行仓库**：在 Solana devnet 发一笔带 Memo 的交易，Memo 里锚定 trace payload 的 SHA256；本地 Viewer 页面粘贴 signature 后显示 ✅ Verified，并可查看 trace 时间线。

---

## PROMPT START

你是一个**自主 coding agent**。请你从零开始在当前工作目录创建一个仓库：`SlotScribe`（如果目录已存在就在其中创建/更新文件）。你必须：

- 生成完整可运行代码（TypeScript + Next.js）
- 生成逐文件内容（按我给的 file tree 创建/修改每个文件）
- 代码要可本地运行、可验证（不只是伪代码）
- 输出一个干净的、可读的 README（含快速跑通 demo 的命令）
- 默认跑 **Solana devnet**（用 airdrop 资金）
- 不依赖任何私钥托管；demo 里用临时 Keypair 即可

### 0) Definition of Done（必须满足）

完成后，用户应能执行：

1. `pnpm install`
2. `pnpm demo`

并看到类似输出：

- `Signature: <tx_signature>`
- `PayloadHash: <sha256_hex>`
- `Viewer: http://localhost:3000/verify?cluster=devnet&sig=<tx_signature>&hash=<sha256_hex>`

然后打开 Viewer 链接，应显示：

- ✅ Verified（Hash matches memo + trace payload）
- 展示交易摘要（to / amount / fee / programs）
- 展示 trace（intent、plan、工具调用、tx build、simulate（可选）、send/confirm）

同时提供 CLI 校验：

- `pnpm verify -- --cluster devnet --sig <tx_signature> --hash <sha256_hex>`

返回 `VERIFIED` 或给出 mismatch 细节。

---

## 1) 技术栈与约束

- Node.js >= 20
- pnpm
- Next.js（App Router）
- TypeScript
- Solana: `@solana/web3.js`
- JSON Canonicalization：使用 `json-canonicalize`（JCS/RFC8785 风格）
- Hash：Node `crypto` SHA-256 输出 hex
- Memo Program ID 常量：`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

### Trace 与 Hash 的规则（很关键）

Memo 里锚定的是 **payloadHash**，它是对 `trace.payload`（且仅 payload）做 canonicalize 后 SHA256 得到的 hex。

- `payloadHash = sha256Hex(canonicalize(trace.payload))`
- 交易 memo 内容必须包含：`BBX1 payload=<payloadHash>`
- `trace` 文件可包含 `onChain`（signature/slot/status）等字段，但这些字段**不参与 hash**

验证逻辑：

1) 从链上交易中读取 memo，得到 `payloadHashOnChain`
2) 加载 `trace.json`
3) 计算 `payloadHashLocal = sha256Hex(canonicalize(trace.payload))`
4) 若 `payloadHashLocal == payloadHashOnChain` 则 Hash 校验通过
5) 额外校验（尽量做）：trace.payload.txSummary 与链上交易关键字段一致（to/lamports/fee/programs）

---

## 2) 仓库目录结构（必须按此创建）

```
SlotScribe/
  package.json
  pnpm-lock.yaml                  # pnpm install 自动生成即可
  tsconfig.json
  next.config.mjs
  .gitignore
  .env.example
  README.md
  LICENSE

  data/
    traces/
      .gitkeep

  src/
    slotscribe/
      index.ts
      types.ts
      canonicalize.ts
      hash.ts
      recorder.ts
      solana.ts

  scripts/
    demo-transfer.ts
    verify.ts
    _shared.ts

  app/
    layout.tsx
    page.tsx
    verify/
      page.tsx
    api/
      trace/
        [hash]/
          route.ts

  lib/
    traceStore.ts
    solanaRpc.ts
    verifier.ts
```

---

## 3) 逐文件实现要求（按文件生成）

### 3.1 Root 配置文件

#### `package.json`
- name: `slotscribe`
- private: true
- scripts（至少这些）：
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `demo`: 同时启动 next dev + 跑 demo-transfer（建议用 `concurrently` + `wait-on`）
  - `demo:tx`: `tsx scripts/demo-transfer.ts`
  - `verify`: `tsx scripts/verify.ts`
- dependencies（至少）：
  - next
  - react
  - react-dom
  - @solana/web3.js
  - json-canonicalize
- devDependencies（至少）：
  - typescript
  - tsx
  - @types/node
  - @types/react
  - @types/react-dom
  - concurrently
  - wait-on

#### `tsconfig.json`
- Next.js 推荐配置即可（`"jsx": "preserve"`，`"moduleResolution": "bundler"`）
- `baseUrl` 设为 `.`，并给 `src/*` / `lib/*` 做 paths（方便引用）

#### `next.config.mjs`
- 默认即可；确保 node fs API 在 route handler 可用

#### `.env.example`
- `SOLANA_CLUSTER=devnet`
- `SOLANA_RPC_URL=`（可空，默认使用 cluster 的官方 RPC）
- `TRACES_DIR=./data/traces`

#### `.gitignore`
- `.next/`, `node_modules/`, `data/traces/*.json`（但保留 `.gitkeep`）

#### `README.md`
必须包含：
- 项目一句话
- 核心原理：payloadHash→memo 锚定→viewer 校验
- 快速开始：`pnpm install`，`pnpm demo`
- 手动验证：打开 viewer / CLI verify
- 目录说明（sdk/cli/viewer）
- 安全声明：仅 demo，默认 devnet

#### `LICENSE`
MIT

---

### 3.2 slotscribe SDK（`src/slotscribe/*`）

#### `src/slotscribe/types.ts`
定义类型（足够 MVP）：

- `TraceVersion = "BBX1"`
- `TracePayload`:
  - `intent: string`
  - `plan: { steps: string[] }`
  - `toolCalls: Array<{ name: string; input: any; output?: any; error?: string; startedAt: string; endedAt: string }>`
  - `txSummary`:
    - `cluster: "devnet"|"mainnet-beta"|"testnet"|"localnet"`
    - `feePayer: string`
    - `to: string`
    - `lamports: number`
    - `programIds: string[]`
    - `recentBlockhash?: string`
- `Trace`:
  - `version: TraceVersion`
  - `createdAt: string`
  - `payload: TracePayload`
  - `payloadHash: string`  # hex
  - `onChain?: { signature: string; slot?: number; status?: "confirmed"|"finalized"|"processed"|"unknown"; memo?: string }`
  - `debug?: { txBase64?: string }`  # 可选，方便复现
- `VerifyResult`:
  - `ok: boolean`
  - `expectedHash?: string`
  - `computedHash?: string`
  - `reasons: string[]`

#### `src/slotscribe/canonicalize.ts`
- 导出 `canonicalizeJson(value: any): string`
- 用 `json-canonicalize` 输出稳定字符串

#### `src/slotscribe/hash.ts`
- 导出 `sha256Hex(input: string | Uint8Array): string`
- Node `crypto` 实现

#### `src/slotscribe/recorder.ts`
实现一个 `SlotscribeRecorder` 类：

- constructor 接受 `{ intent: string; cluster: string }`
- 内部维护 `payload: TracePayload`
- 方法：
  - `addPlanSteps(steps: string[])`
  - `recordToolCall(name, input, fn)`：包装 async 函数，自动写入 startedAt/endedAt/output/error
  - `setTxSummary(summary: Partial<TracePayload["txSummary"]>)`
  - `finalizePayloadHash(): string`（计算 hash 并写入 `this.payloadHash`）
  - `buildTrace(): Trace`（生成 trace 对象；必须确保 payloadHash 已生成）
  - `attachOnChain(signature, info?)`（补充 onChain 字段）
- 注意：payloadHash 计算必须基于 **最终 payload**（txSummary 填完后再算）

#### `src/slotscribe/solana.ts`
提供 Solana 相关 helper：

- `getRpcUrl(cluster, overrideUrl?)`
- `buildMemoIx(memo: string): TransactionInstruction`
- `extractSlotscribeMemo(memoData: string): { payloadHash?: string; raw: string }`
- `findMemoInTransaction(txResponse): string | null`（从 getTransaction 返回中找 memo 指令数据）
- `summarizeTransaction(txResponse): { fee: number; programs: string[]; to?: string; lamports?: number }`（尽量从 parsed instructions 识别 transfer）

#### `src/slotscribe/index.ts`
统一 export

---

### 3.3 CLI Scripts（`scripts/*`）

#### `scripts/_shared.ts`
- 解析 cluster / rpcUrl / tracesDir 的工具函数
- `ensureTracesDir()`
- `writeTraceFile(hash, trace)` 写入 `data/traces/<hash>.json`
- `readTraceFile(hash)` 读取 trace

#### `scripts/demo-transfer.ts`
目标：跑通 demo 的“一键脚本”。

流程：
1) 解析参数（用简单的手写 parse 或 `process.argv`，不强制 commander）：
   - `--cluster` 默认 devnet
   - `--rpc` 可选
   - `--to` 可选（不传就随机 Keypair）
   - `--sol` 默认 0.01
2) 创建 `Connection`（confirmed）
3) 生成临时 `from` Keypair，向 devnet 请求 airdrop（>= 1 SOL），确认到账
4) 创建 `SlotscribeRecorder(intent=...)`
5) 写入 plan（简单 steps，例如：“检查余额→构建 transfer→附加 memo→发送→确认”）
6) 构建一笔 transfer 交易：
   - `SystemProgram.transfer({ fromPubkey, toPubkey, lamports })`
   - memo 指令：`BBX1 payload=<payloadHash>`（但 payloadHash 需先算！）
7) **重要：先填 txSummary 再 finalizePayloadHash**
   - txSummary 至少包含 feePayer/to/lamports/programIds/cluster
8) 计算 payloadHash
9) 把 memo 指令加入 transaction（memo 在 transfer 前后均可）
10) 可选：simulateTransaction 并记录（如果做了，就把结果写到 toolCalls 或 debug）
11) 发送交易，确认
12) `trace = recorder.buildTrace(); recorder.attachOnChain(signature, memo)`
13) 写入 trace 文件到 `data/traces/<payloadHash>.json`
14) 输出 signature、payloadHash、viewer link（按 query 参数写）

注意：
- 交易 memo 必须包含 payloadHash
- trace 文件名用 payloadHash（这样 viewer 只靠 hash 就能拿到 trace）

#### `scripts/verify.ts`
CLI 验证工具：

参数：
- `--cluster` 默认 devnet
- `--rpc` 可选
- `--sig` 必填
- `--hash` 可选（如果不传，则从链上 memo 解析出来）
- `--trace` 可选（传路径则从文件读；否则用 hash 到 tracesDir 找）

逻辑：
1) 拉取交易 `getTransaction(sig, { maxSupportedTransactionVersion: 0 })`
2) 解析 memo 得到 onChainHash
3) 加载 trace
4) 计算 computedHash
5) 输出：
   - ok/mismatch
   - onChainHash vs computedHash
   - mismatch 原因列表

---

### 3.4 Next.js Viewer（`app/*` + `lib/*`）

#### `app/layout.tsx`
最简 layout，显示标题“slotscribe”

#### `app/page.tsx`
首页：说明 + 一个输入框链接到 `/verify`

#### `lib/traceStore.ts`
实现 `TraceStore` 抽象：
- `get(hash): Promise<Trace|null>`
- `put(hash, trace): Promise<void>`

实现一个 `FileTraceStore`：
- dir 来自 env `TRACES_DIR`（默认 `./data/traces`）
- 用 `fs/promises` 读写

#### `app/api/trace/[hash]/route.ts`
实现：
- `GET`：返回对应 hash 的 trace.json（404 则返回错误 JSON）
- `POST`：写入 trace（用于未来扩展；MVP 也要实现）

#### `lib/solanaRpc.ts`
- `getConnection(cluster, rpcOverride?)`（服务端/客户端都能用）
- 默认 RPC 使用 cluster 官方地址（devnet/mainnet-beta/testnet）

#### `lib/verifier.ts`
实现 `verifyTxWithTrace({ cluster, signature, hash? })`：
- 拉链上 tx
- 解析 memo 获取 hash（或与传入 hash 对比）
- 从 TraceStore 读取 trace
- 计算 computedHash
- 返回 `VerifyResult` + 展示数据（txSummary、memo raw、trace 简要）

#### `app/verify/page.tsx`
做一个简单页面：
- 输入框：signature
- 可选输入：hash
- cluster 选择（devnet/mainnet-beta/testnet）
- 点击 Verify → 调用一个 **server action** 或 **route handler**：
  - 为了简单：在页面里 `fetch("/api/trace/...")` + 直接 RPC 在客户端拉 tx 也行
  - 但推荐：用 `lib/verifier.ts` 在服务器侧跑（避免 CORS/版本问题）
- 页面展示：
  - ✅ Verified / ❌ Not verified
  - on-chain memo 值
  - computed hash
  - trace intent / plan / tool calls 列表
  - 链上 tx 的关键信息（fee、to、lamports、programs）

---

## 4) 实现细节注意事项（你必须处理）

1) Memo 解码：
   - getTransaction 里 memo data 可能是 base58/base64/Buffer；要做健壮解析
   - 使用 `TextDecoder` 将 bytes 变成 string
2) 交易解析：
   - 尽量识别 `SystemProgram.transfer` 的 to/lamports（parsed instructions 通常可用）
3) Canonicalize：
   - 必须对 `trace.payload` canonicalize 后再 hash（不要 stringify 直接 hash）
4) 可靠性：
   - CLI demo 要等待 airdrop/confirm
   - `wait-on` 等 dev server ready 再跑 demo（demo 脚本不依赖 server 也行，但 demo script 结束后 viewer 必须能读到 trace file）
5) 错误提示要“人话”：
   - mismatch 时列出 reason（比如“on-chain memo missing payload hash”、“trace file not found”、“computed hash differs”）

---

## 5) 最终自测清单（你完成后自己跑）

- `pnpm install`
- `pnpm demo` 结束后：
  - data/traces 下出现 `<hash>.json`
  - 终端打印 signature + viewer link
- 打开 viewer link：
  - 显示 ✅ Verified
  - intent/plan/toolCalls 可见
- `pnpm verify -- --sig <sig> --cluster devnet` 输出 VERIFIED

---

## 6) 非目标（不要做）

- 不要做复杂多智能体/数据库/钱包登录
- 不要做 ZK 推理证明
- 不要引入复杂 UI 框架（Tailwind 可选，但不强制）
- 不要把私钥写到磁盘或提交到 repo

---

请严格按上述文件结构逐文件生成代码；生成后保证 `pnpm demo` 一键跑通。

## PROMPT END
