# SlotScribe 鈥?Verifiable Execution Flight Recorder for Solana AI Agents

> Turn on-chain AI agents from 鈥渢rust me鈥?into 鈥渧erify me鈥?

SlotScribe is a **verifiable execution recorder**:
- Your agent runs normally (builds/signs/sends transactions). SlotScribe never touches private keys.
- SlotScribe records an off-chain trace (intent, plan, tool calls, tx summary).
- It computes a **SHA-256** over canonicalized **trace.payload**.
- It anchors that hash on-chain via a **Memo** instruction in the same transaction.
- Anyone can verify by tx signature:
  鉁?**on-chain memo hash == locally recomputed trace payload hash**

---

## 馃 AI Agent Ecosystem Compatible

SlotScribe supports multiple integration paths for modern AI Agents:
- **[MCP Server](./docs/MCP_Quick_Start.md)**: Native Model Context Protocol support for Claude Desktop and MCP-enabled agents.
- **[1-line SDK Plugin](./docs/AI_Agent_Quick_Start.md)**: Easy integration for TypeScript/Node.js agents.
- **[Production & Mainnet Testing](./docs/Production_Testing_and_Wallet_Import.md)**: Guide for mainnet verification and private key import.
- **[Public API](https://slotscribe.xyz/api/trace)**: REST API for agents in any language (Python, Rust, etc.).

---

## Why SlotScribe?

As agents start doing DeFi, staking, trading, and paid tasks, accountability becomes the bottleneck:
- What exactly happened?
- Can the agent change its story later?
- How do we audit and debug failures?

SlotScribe provides **verifiable execution receipts**.

---

## How does SlotScribe 鈥渧erify agent behavior鈥?

### 1) Turn 鈥渃laims鈥?into independently checkable evidence

Without SlotScribe, an agent can say:

> 鈥淚 bought that meme coin for you 鈥?trust me.鈥?

With SlotScribe, the agent must provide:
- the transaction signature
- a verifiable report (鉁?Verified)

Then users/judges/other agents can independently check:
- Did the buy actually happen? Which token? How much was spent/received? What was the outcome?
- Were there any hidden instructions (e.g., an extra transfer draining funds)?

This is behavior verification: from 鈥淚 said I did it鈥?to 鈥渙n-chain evidence shows it happened鈥?

### 2) Make trust a programmable gate (so other agents can decide)

This is SlotScribe鈥檚 real adoption flywheel:
- task markets/funders/copy-trading agents can enforce:
  - `if not SlotScribe verified -> refuse / require manual review`
- settlements can be conditioned on verification:
  - 鈥淥nly Verified transactions get paid / share revenue鈥?

---

## How it works (core)

### Hash rule
- `payloadHash = sha256Hex(canonicalize(trace.payload))`
- Memo must contain: `SS1 payload=<payloadHash>`

### Verification
1. Fetch tx by signature, parse Memo 鈫?`payloadHashOnChain`
2. Load `trace.json`
3. Recompute `payloadHashLocal`
4. Compare 鈫?鉁?Verified

Only `trace.payload` participates in the hash (not `trace.onChain`, etc.).

---

## Quickstart (Local demo)

### Requirements
- Node.js >= 20
- pnpm

### Install
```bash
pnpm install
```

### Run demo (devnet)
```bash
pnpm demo
```

You should see:
- `Signature: <tx_signature>`
- `PayloadHash: <sha256_hex>`
- `Viewer: http://localhost:3000/verify?cluster=devnet&sig=<tx_signature>&hash=<sha256_hex>`

Open the Viewer link:
- 鉁?Verified
- tx summary + trace timeline

> The demo airdrops a temporary devnet keypair and sends a transfer tx with a Memo anchor.

### Production Test (Online)
Test the full end-to-end flow with our production servers at `https://slotscribe.xyz`.

```bash
# 1. Devnet Test (safe, free)
pnpm tsx scripts/test-online-production.ts --on-chain

# 2. Mainnet Test (requires real SOL)
pnpm tsx scripts/test-online-production.ts --cluster mainnet-beta --on-chain
```

- **Custom Keypair**: Use `--keypair ./path.json` or `$env:SOLANA_PRIVATE_KEY`.
- **Self-Transfer**: If `--to` is omitted, funds are sent back to yourself (safest for mainnet).

---

## CLI Verify
```bash
pnpm verify -- --cluster devnet --sig <tx_signature>
```

Optional:
- `--hash <payloadHash>` (otherwise extracted from Memo)
- `--rpc <rpcUrl>`
- `--trace <path>`

---

## Viewer
```bash
pnpm dev
```

- Home: `http://localhost:3000/`
- Verify: `http://localhost:3000/verify`

The verify page:
- accepts a tx signature
- lets you choose cluster (devnet/mainnet-beta/testnet)
- returns 鉁?鉂?plus mismatch reasons

---

## 1-line integration (auto-recording plugins)

SlotScribe includes **auto-recording plugins** so other teams can integrate with minimal changes.

### Option A: wrap Connection (recommended)
```ts
import { Connection } from "@solana/web3.js";
import { withSlotScribe } from "slotscribe";

const connection = withSlotScribe(new Connection(rpcUrl, "confirmed"), {
  cluster: "devnet",
  autoUpload: true,
  baseUrl: "http://localhost:3000"
});

// Use the standard API directly:
const signature = await connection.sendTransaction(tx, [payer]);
```

### Option B: wrap Signer (best-effort)
Useful for frameworks that expose only a signer. Note: signers don鈥檛 broadcast, so this is 鈥減re-commit trace鈥?oriented.

---

## Plugin demo
```bash
pnpm examples
```

---

## Trace storage

Content-addressable by payload hash:
- File: `data/traces/<payloadHash>.json` (fastest for hackathons)
- HTTP: `POST/GET /api/trace/<hash>` (recommended for ecosystem usage)
- Extendable to S3/R2, IPFS/Arweave later

---

## Public API (for other agents)

SlotScribe provides a **public API** at `https://slotscribe.xyz` for other agents to upload and query traces.

### Upload trace
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

### Query trace
```bash
GET https://slotscribe.xyz/api/trace/<payloadHash>
```

### SDK helper
```typescript
import { SlotScribeRecorder, uploadTrace, buildMemoIx } from 'slotscribe';

// ... after transaction confirmed ...
const trace = recorder.buildTrace();
const result = await uploadTrace(trace, {
    baseUrl: 'https://slotscribe.xyz'
});

console.log('Viewer:', result.viewerUrl);
// 鈫?https://slotscribe.xyz/verify?sig=xxx&hash=xxx
```

### Features
- 鉁?CORS enabled (call from any domain)
- 鉁?Hash verification (recomputes & validates)
- 鉁?Duplicate protection (no overwrite)

---

## Repository structure

```
src/slotscribe/      # Core SDK (trace, canonicalize, hash, recorder, solana helpers)
src/plugins/         # Auto-recording plugins (1-line integration)
scripts/             # demo / verify CLI
app/                 # Next.js Viewer (verify page + trace API)
lib/                 # trace store / verifier
data/traces/         # local trace store (default)
```

---

## Security & scope

- SlotScribe does **not** custody keys, does **not** sign, and does **not** change transaction semantics (only adds Memo).
- SlotScribe verifies **integrity** (hash anchoring), not the truthfulness of off-chain tool outputs.
- Add a **policy gate** (limits/allowlists/slippage) for pre-execution safety in production.

---

## Agent ecosystem compatibility (MCP)

SlotScribe is designed to be compatible with the Solana Agent ecosystem, especially with the **Multi-Chain Protocol (MCP)**.

The `slotscribe-mcp` server provides an interactive agent that can:
- **Verify transactions**: Agents can query `verify_tx(signature)` to get a SlotScribe verification report.
- **Upload traces**: Agents can upload traces directly to SlotScribe for anchoring and verification.

This allows other agents to programmatically integrate SlotScribe's verification capabilities into their decision-making processes, enabling trust as a programmable gate.

---

## Roadmap

- [ ] Multi-tx sessions (one intent 鈫?multiple txs on a single timeline)
- [ ] DeFi decoders (Jupiter swap / staking / token deltas)
- [x] MCP Support: slotscribe-mcp server for interactive agents
- [ ] Commit鈥揜eveal (stronger non-repudiation)

---

## License
MIT

