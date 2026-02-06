# SlotScribe 生产环境测试与私钥导入指南

本指南将介绍如何使用 SlotScribe 提供的工具进行生产环境集成测试，以及如何安全地导入你的私钥进行主网测试。

---

## 🚀 线上集成测试 (`test-online-production.ts`)

我们提供了一个完整的测试脚本 `scripts/test-online-production.ts`，用于模拟 Agent 的真实工作流并验证与 SlotScribe 线上服务的同步。

### 1. 基础运行 (Devnet)
默认情况下，脚本在 Solana Devnet 上运行，模拟一个 Swap 过程并将 Trace 同步到 `https://slotscribe.xyz`。

```bash
# 仅同步数据（不发送真实交易，免费）
pnpm tsx scripts/test-online-production.ts

# 发送真实交易（执行链上锚定，需 Devnet SOL）
pnpm tsx scripts/test-online-production.ts --on-chain
```

### 2. 主网测试 (Mainnet)
当你准备好在主网验证时，只需切换集群标识。

```bash
pnpm tsx scripts/test-online-production.ts --cluster mainnet-beta --on-chain
```

> [!TIP]
> **集群名称容错**: SDK 具备自动纠错功能。你输入 `mainnet`、`Devnet` 或 `localhost` 都会被自动识别并规范化。

---

## 🔑 私钥导入与身份管理

为了方便测试，脚本支持多种方式导入你的 Solana 身份。

### 方法 A：环境变量 (最安全、非持久化)
支持 Base58 格式（如 Phantom 导出）或 JSON 数组格式。

```bash
# Windows (PowerShell)
$env:SOLANA_PRIVATE_KEY="你的Base58私钥"; pnpm tsx scripts/test-online-production.ts --on-chain

# Linux/Mac
SOLANA_PRIVATE_KEY="你的Base58私钥" pnpm tsx scripts/test-online-production.ts --on-chain
```

### 方法 B：命令行参数使用指定文件
如果你有现成的 `.json` 私钥文件：

```bash
pnpm tsx scripts/test-online-production.ts --keypair ./path/to/id.json --on-chain
```

### 方法 C：自动生成 (默认)
如果没有提供上述信息，脚本会检查 `./scripts/test-wallet.json`。若不存在，则会自动创建一个新的测试钱包并提醒你充值。

---

## 🛡️ 安全主网测试：自转账模式 (Self-Transfer)

在主网测试时，你可能不想把 SOL 转给陌生地址。SlotScribe 脚本默认支持**自转账锚定**：

1.  **操作逻辑**：如果不指定 `--to` 参数，脚本会将 SOL 转回给发送者自己。
2.  **成本**：仅消耗约 0.000005 SOL 的主网手续费。
3.  **效果**：资金不出钱包，但在链上留下了完整的 Memo 锚定和 Trace 记录。

```bash
# 执行安全的自转账主网测试
pnpm tsx scripts/test-online-production.ts --cluster mainnet-beta --on-chain
```

如果需要转给特定人，请使用 `--to` 参数：
```bash
pnpm tsx scripts/test-online-production.ts --on-chain --to <接收者地址>
```

---

## 📊 查看测试结果

脚本运行成功后会输出三个关键链接：
1.  **Solana Explorer**: 查看链上的 Memo 锚定。
2.  **SlotScribe Explorer**: 在存证列表中找到你的 Trace。
3.  **Report URL**: 直接访问精美的、可分享的审计报告页面。

---

## 🛠️ 疑难解答

*   **RPC 限流**: 主网公共 RPC 经常报错。建议使用自己的 RPC 节点：
    `--rpc https://your-helius-url.com`
*   **格式错误**: 确保你的私钥字符串没有空格或引号包裹错误。SDK 支持自动识别。
*   **私钥优先级**: 环境变量 > 命令行参数 > 默认文件。
