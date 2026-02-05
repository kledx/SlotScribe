# SlotScribe MCP Server Guide (For Claude/LLM Agents)

> **集成 SlotScribe 到你的 Claude 或其他模型中，实现可验证的 Agent 操作**

SlotScribe 实现了 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)，这意味着你可以将 SlotScribe 作为一个 "Skill" 直接安装到 Claude Desktop 或任何支持 MCP 的环境中。

## 🚀 快速开始

### 1. 启动 MCP 服务器
确保你已经安装了 SlotScribe 项目的依赖。

```bash
pnpm mcp
```

### 2. 在 Claude Desktop 中配置
打开你的 Claude Desktop 配置文件（通常在 `%APPDATA%/Claude/claude_desktop_config.json` 或 `~/Library/Application Support/Claude/claude_desktop_config.json`）。

添加以下配置：

```json
{
  "mcpServers": {
    "slotscribe": {
      "command": "node",
      "args": [
        "E:/work_space/SlotScribe/node_modules/tsx/dist/cli.mjs",
        "E:/work_space/SlotScribe/src/mcp/server.ts"
      ],
      "env": {
        "SLOTSCRIBE_API_URL": "http://localhost:3000"
      }
    }
  }
}
```
> [!NOTE]
> 请将上述路径替换为你本地 SlotScribe 项目的绝对路径。

---

## 🛠️ 提供的工具 (Tools)

集成后，Claude 将能够使用以下工具：

- **`start_recording`**: 开启一个记录任务，返回 `recorderId`。
- **`record_step`**: 记录一个具体的操作步骤（输入、输出、耗时等）。
- **`finalize_and_anchor`**: 完成记录，获取需要写入 Solana Memo 的内容。
- **`upload_and_verify`**: 交易发送后，上传 trace 文件。

---

## 🎭 示例对话 (Claude 入门)

**User**: "我想把 1 SOL 换成 USDC，请记录这个操作并帮我准备好 Solana 交易所需的 Memo 内容。"

**Claude**:
1. (调用 `start_recording`) -> 获取 `recorderId`
2. (调用 `jupiter.getQuote`) -> 获得报价
3. (调用 `record_step`) -> 记录报价结果
4. (调用 `finalize_and_anchor`) -> 获取 Memo 内容及 Hash
5. **Claude 响应**: "我已经为你准备好了操作记录。Hash 为 `f853...`。请在发送交易时添加 Memo: `BBX1 payload=f853...`。交易完成后请告诉我签名，我将为你完成最后的存证。"

**User**: "交易已发送，签名是 `sig_123...`"

**Claude**:
1. (调用 `upload_and_verify`) -> Trace 已上线。
2. **Claude 响应**: "验证成功！你可以在这里查看你的操作收据: `https://slotscribe.xyz/verify?sig=sig_123...`"

---

## 🏆 黑客松评委提示

MCP 的加入意味着 SlotScribe **不只是一个库，而是一个生态系统组件**。任何支持 MCP 的 Agent（即使不是用 Node.js 写的）都可以无缝接入 SlotScribe 的可验证能力。
