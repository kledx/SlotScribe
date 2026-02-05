# SlotScribe AI Agent Integration Guide

> **让你的 AI Agent 在 3 分钟内拥有链上可验证的操作记录**

---

## 🚀 Quick Start（完整集成）

```typescript
import { 
    SlotScribeRecorder, 
    buildMemoIx, 
    uploadTrace  // 上传辅助函数
} from 'slotscribe';

// 1. 创建 Recorder
const recorder = new SlotScribeRecorder({
    intent: '你的 Agent 要做什么',
    cluster: 'mainnet-beta',
});

// 2. 记录每个工具调用（自动记录时间和结果）
const result = await recorder.recordToolCall('工具名', { 输入参数 }, async () => {
    return await yourTool.execute();
});

// 3. 发送交易时附加 Memo
const hash = recorder.finalizePayloadHash();
tx.add(buildMemoIx(`BBX1 payload=${hash}`));

// 4. 发送交易
const signature = await connection.sendTransaction(tx, [wallet]);

// 5. 附加链上信息并上传 trace
recorder.attachOnChain(signature, { status: 'confirmed' });
const trace = recorder.buildTrace();

// 上传到 SlotScribe 公共服务
const uploadResult = await uploadTrace(trace, {
    baseUrl: 'https://slotscribe.io'  // 替换为你的服务地址
});

console.log('Viewer:', uploadResult.viewerUrl);
// → https://slotscribe.io/verify?sig=xxx&hash=xxx
```


---

## 📋 System Prompt（复制给你的 AI）

```markdown
# SlotScribe 集成指导

你是一个可以执行 Solana 交易的 AI Agent。为了让你的操作可被第三方验证，
你需要使用 SlotScribe 记录你的操作轨迹。

## 使用规则

1. **每次任务开始时**：创建 SlotScribeRecorder，写明 intent（你要做什么）
2. **每个工具调用**：使用 recorder.recordToolCall() 包装
3. **发送交易前**：
   - 调用 setSwapTx/setStakeTx/setTransferTx 设置交易详情
   - 调用 finalizePayloadHash() 获取 hash
   - 将 `BBX1 payload={hash}` 添加到交易 Memo
4. **交易确认后**：保存 trace 文件

## 代码模板

\`\`\`typescript
const recorder = new SlotScribeRecorder({ intent: "...", cluster: "mainnet-beta" });

// 记录工具调用
const quote = await recorder.recordToolCall('jupiter.quote', params, () => jupiter.getQuote(params));

// 设置交易详情（根据类型选择）
recorder.setSwapTx({ feePayer, swap: { protocol: 'jupiter', ... } });
// 或 recorder.setStakeTx({ feePayer, stake: { protocol: 'marinade', ... } });
// 或 recorder.setTransferTx({ feePayer, to, lamports });

// 获取 hash 并添加 Memo
const hash = recorder.finalizePayloadHash();
tx.add(buildMemoIx(\`BBX1 payload=\${hash}\`));

// 发送交易
const sig = await sendTransaction(tx);

// 保存 trace
recorder.attachOnChain(sig, { slot, status: 'confirmed' });
fs.writeFileSync(\`traces/\${hash}.json\`, JSON.stringify(recorder.buildTrace()));
\`\`\`
```

---

## 🔧 Function Calling / Tool Definition

### OpenAI Function Calling 格式

```json
{
  "name": "slotscribe_record_swap",
  "description": "记录一笔 Swap 交易到 SlotScribe，使其可被链上验证",
  "parameters": {
    "type": "object",
    "properties": {
      "intent": {
        "type": "string",
        "description": "交易意图描述，如 '将 1 SOL 兑换为 BONK'"
      },
      "protocol": {
        "type": "string",
        "enum": ["jupiter", "raydium", "orca", "pump_fun", "moonshot"],
        "description": "使用的 DEX 协议"
      },
      "inputToken": {
        "type": "object",
        "properties": {
          "mint": { "type": "string" },
          "symbol": { "type": "string" }
        }
      },
      "outputToken": {
        "type": "object",
        "properties": {
          "mint": { "type": "string" },
          "symbol": { "type": "string" }
        }
      },
      "inputAmount": { "type": "string" },
      "outputAmount": { "type": "string" }
    },
    "required": ["intent", "protocol", "inputToken", "outputToken", "inputAmount"]
  }
}
```

### Claude MCP Tool 格式

```json
{
  "name": "slotscribe_record",
  "description": "记录 Agent 操作到 SlotScribe 飞行记录器",
  "input_schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string", "description": "Agent 的操作意图" },
      "txType": { 
        "type": "string", 
        "enum": ["transfer", "swap", "stake", "nft_buy", "lending"],
        "description": "交易类型"
      },
      "details": { "type": "object", "description": "交易详情" }
    },
    "required": ["intent", "txType", "details"]
  }
}
```

---

## 🎯 完整示例：Jupiter Swap Agent

```typescript
import { 
    SlotScribeRecorder, 
    buildMemoIx, 
    TOKENS 
} from 'slotscribe';
import { Connection, Keypair, Transaction } from '@solana/web3.js';

class JupiterSwapAgent {
    private connection: Connection;
    private wallet: Keypair;

    async executeSwap(inputToken: string, outputToken: string, amount: number) {
        // ========== Step 1: 初始化 SlotScribe ==========
        const recorder = new SlotScribeRecorder({
            intent: `Swap ${amount} ${inputToken} to ${outputToken}`,
            cluster: 'mainnet-beta',
        });

        recorder.addPlanSteps([
            'Get quote from Jupiter',
            'Build swap transaction',
            'Inject SlotScribe memo',
            'Send and confirm',
        ]);

        // ========== Step 2: 获取报价（自动记录） ==========
        const quote = await recorder.recordToolCall(
            'jupiter.getQuote',
            { inputMint: inputToken, outputMint: outputToken, amount },
            async () => {
                const response = await fetch(`https://quote-api.jup.ag/v6/quote?...`);
                return response.json();
            }
        );

        // ========== Step 3: 构建交易（自动记录） ==========
        const swapTx = await recorder.recordToolCall(
            'jupiter.buildSwap',
            { quoteResponse: quote },
            async () => {
                const response = await fetch('https://quote-api.jup.ag/v6/swap', { ... });
                return response.json();
            }
        );

        // ========== Step 4: 设置交易详情 ==========
        recorder.setSwapTx({
            feePayer: this.wallet.publicKey.toBase58(),
            swap: {
                protocol: 'jupiter',
                inputToken: TOKENS.SOL,
                outputToken: { mint: outputToken, symbol: 'BONK' },
                inputAmount: String(amount),
                outputAmount: quote.outAmount,
                slippageBps: 50,
            },
            programIds: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
        });

        // ========== Step 5: 计算 Hash 并添加 Memo ==========
        const hash = recorder.finalizePayloadHash();
        const tx = Transaction.from(Buffer.from(swapTx.swapTransaction, 'base64'));
        tx.add(buildMemoIx(`BBX1 payload=${hash}`));

        // ========== Step 6: 发送交易 ==========
        const signature = await recorder.recordToolCall(
            'sendTransaction',
            { feePayer: this.wallet.publicKey.toBase58() },
            async () => {
                return await this.connection.sendTransaction(tx, [this.wallet]);
            }
        );

        // ========== Step 7: 保存 Trace ==========
        recorder.attachOnChain(signature, { status: 'confirmed' });
        const trace = recorder.buildTrace();
        
        // 保存到文件或上传到服务器
        await fs.writeFile(`traces/${hash}.json`, JSON.stringify(trace, null, 2));

        return {
            signature,
            payloadHash: hash,
            viewerUrl: `https://slotscribe.io/verify?sig=${signature}&hash=${hash}`,
        };
    }
}
```

---

## 📦 NPM 安装

```bash
npm install slotscribe @solana/web3.js
# 或
pnpm add slotscribe @solana/web3.js
```

---

## ✅ 验证你的 Trace

```bash
# CLI 验证
npx slotscribe verify --sig <signature> --hash <payloadHash>

# 或访问 Viewer
https://slotscribe.io/verify?sig=<signature>&hash=<payloadHash>
```

---

## 🔗 相关链接

- [GitHub Repo](https://github.com/your-org/slotscribe)
- [Viewer Demo](https://slotscribe.io)
- [API Documentation](./API.md)
