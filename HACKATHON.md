# SlotScribe: The Trust Layer for Solana AI Agents

> **Colosseum AI Agent Hackathon Submission**

## 1. Vision & Problem Statement

As AI Agents transition from "chatbots" to "autonomous economic actors" on Solana, the industry faces a critical bottleneck: **The Trust Gap**. 

Users are hesitant to authorize agents with significant funds because agent execution is a "black box." When an agent makes a trade or manages a vault, there is no immutable, independently verifiable record of **why** and **how** it executed those actions. 

**SlotScribe solves this by turning "Trust me" into "Verify me".**

SlotScribe is a verifiable execution "Flight Recorder" that anchors off-chain agent cognition (intent, planning, tool outputs) into on-chain Solana transactions via SHA-256 state-commitment and Memo instructions.

---

## 2. Key Features

### 🛠️ Verifiable Execution Receipts
Every transaction sent by a SlotScribe-enabled agent carries a cryptographic commitment to its internal state (intent, plan, and every tool call result).

### ⚡ Tailored for Solana
Leveraging Solana’s performance and low-cost Memo instructions, SlotScribe enables continuous, high-fidelity logging that would be cost-prohibitive on other chains.

### 🔌 Seamless Integration (1-line SDK & MCP)
- **SDK**: A wrapper for Solana `Connection` that automatically records transaction context.
- **MCP Server**: Native support for **Model Context Protocol**, allowing Claude, ChatGPT, and other LLMs to use SlotScribe as a first-class skill.

### 🔍 Unified Audit Dashboard
A specialized viewer that parses on-chain Memos, fetches off-chain traces, and performs cryptographic verification to show a "Verified" badge for honest agents.

---

## 3. How it Works (The "State-to-Anchor" Loop)

1.  **Recording**: The agent records its `intent` and `tool_calls` (e.g., fetching a price from Jupiter).
2.  **Canonicalization**: The JSON payload is canonicalized to ensure deterministic hashing.
3.  **Anchoring**: A SHA-256 hash of the payload is injected into the Solana transaction as a Memo instruction.
4.  **Verification**: Auditors read the on-chain hash and compare it with the agent's published trace. If they match, the execution is mathematically proven to be untampered.

---

## 4. Why it Wins in the Agentic Economy

SlotScribe isn't just a debugger; it's a **settlement primitive**. 
- **Task Markets**: Pay agents only for "Verified" executions.
- **Copy-Trading**: Users can verify if an agent followed the advertised strategy.
- **DAO Governance**: Record the reasoning behind an agent's vote on-chain.

**SlotScribe defines the standard for accountable autonomous agents on Solana.**

---

## 5. Repository Structure
- `src/slotscribe/`: Core hashing and recording logic.
- `src/plugins/`: Auto-recording wrappers for Solana Connection.
- `src/mcp/`: MCP Server implementation for ecosystem compatibility.
- `app/`: Next.js Auditor/Viewer dashboard.

---

**Built for the Colosseum AI Agent Hackathon.**
**Website**: [https://slotscribe.xyz](https://slotscribe.xyz) (Demo)
**Twitter**: [@SlotScribe](https://twitter.com/SlotScribe)
