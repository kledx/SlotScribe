# Colosseum Agent Hackathon 提交草稿（SlotScribe）

> 用途：直接复制到 Colosseum 提交页，按需替换占位符。

## 1) Project Name
SlotScribe

## 2) One-liner
A verifiable execution flight recorder for Solana AI agents: anchor trace hash on-chain, upload trace off-chain, and let anyone independently verify behavior.

## 3) Problem
As autonomous agents execute real-value actions on Solana, users and other agents can only see final transactions, not the reasoning/process that produced them. This creates a trust bottleneck: no reliable way to audit what an agent actually did versus what it claims.

## 4) Solution
SlotScribe introduces a commit-reveal-verify loop for agent actions:
- Commit: hash canonicalized `trace.payload` with SHA-256.
- Anchor: write `SS1 payload=<hash>` into the same Solana transaction Memo.
- Reveal: upload full trace JSON to verifiable storage/API.
- Verify: recompute hash and compare with on-chain memo hash.

This turns agent claims into independently verifiable receipts.

## 5) What We Built
- SDK (`slotscribe` npm package)
  - `SlotScribeRecorder` for intent/plan/tool-call/tx-summary recording
  - memo anchoring helpers
  - upload helper (`uploadTrace`) with retry options
  - plugin integration path (`withSlotScribe`)
- Viewer (Next.js)
  - `/verify` and `/report/[sig]` verification UI
  - trace APIs: `POST /api/trace`, `GET /api/trace/{hash}`, `GET /api/verify`
- Production flow
  - real transfer -> trace upload -> public verify page/API check

## 6) Why It Matters for Agent Ecosystem
- Enables programmable trust gates (`if not verified => reject/manual review`)
- Improves accountability for agent marketplaces and copy-trading workflows
- Provides deterministic audit artifacts for incident response and compliance

## 7) Demo Links
- Live app: `https://slotscribe.xyz`
- Technical Demo: `https://slotscribe.xyz/docs`
- Presentation Video: `<YOUR_VIDEO_LINK_HERE>`
- Verify page example: `https://slotscribe.xyz/report/5DDLwWZBzF1ihPF7t7j1Cev9sqDkhmM9sGPaxtC1iuc59BzdLB5RL7eK2GwwxgAicf9MKEB1dcDUDXMqqY2sto5n?cluster=mainnet-beta&hash=bbdeb8e6231447bd4a37fbaa952a1fb448d75ceebe63b0f97fe706ce4c63126a`
- Trace API example: `https://slotscribe.xyz/api/trace/bbdeb8e6231447bd4a37fbaa952a1fb448d75ceebe63b0f97fe706ce4c63126a`
- Repo: `https://github.com/kledx/SlotScribe`
- SDK on npm: `https://www.npmjs.com/package/slotscribe`

## 8) How to Reproduce (Judge Steps)
1. Install SDK:
```bash
npm i slotscribe@latest 
```
2. Run one transfer flow (devnet or mainnet self-transfer).
3. Upload trace to `POST https://slotscribe.xyz/api/trace`.
4. Open verify URL:
```text
https://slotscribe.xyz/verify?cluster=<cluster>&sig=<signature>&hash=<payloadHash>
```
5. Confirm verification result and hash match.

## 9) Technical Highlights
- Hash source is strictly `trace.payload` (canonicalized) to keep deterministic verification.
- Server validates trace integrity on upload (recompute hash).
- Duplicate trace writes are non-destructive (no overwrite).
- Supports signature+hash verification and hash-only lookup messaging.

## 10) Agent-Built Statement (important)
Core implementation was generated and iterated via AI coding agents, with human actions limited to environment setup, running commands, and deployment operations. See the attached autonomy evidence checklist/logs.

## 11) Team / Contact
- Team: `<TEAM_NAME>`
- Contact: `<EMAIL_OR_X_HANDLE>`
- X post (optional): `<X_POST_URL>`

