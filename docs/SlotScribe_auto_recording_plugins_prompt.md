# SlotScribe Auto-Recording Plugins — Coding Agent Prompt (Minimal Diff, 1-line Integration)

> Copy **everything** from “PROMPT START” to “PROMPT END” into your coding agent.
> Goal: add **automatic SlotScribe recording** with **1-line integration** for other teams:
> - `withSlotScribeConnection(connection, opts)` wraps `sendTransaction` / `sendRawTransaction`
> - `withSlotScribeSigner(signer, opts)` wraps `signTransaction` / `signAllTransactions` (best-effort)
>
> Works with the existing SlotScribe repo scaffold you already have (trace hashing + memo anchoring + trace store + viewer).

---

## PROMPT START

You are an autonomous coding agent. You are working inside the existing repository `sealevel-blackbox` (branding name: **SlotScribe**).
Your task: implement **auto-recording plugins** that let other agents integrate SlotScribe by changing **one line**.

### Definition of Done

After your changes:

1) Existing `pnpm demo` still works.
2) A new example script `pnpm demo:plugin` runs and prints a tx signature and viewer link.
3) A consumer agent can integrate by doing ONE of these:

**Option A: wrap the Solana connection**
```ts
const connection = withSlotScribeConnection(new Connection(rpc, "confirmed"), {
  cluster: "devnet",
  traceUpload: { kind: "http", baseUrl: "http://localhost:3000/api/trace" }, // or file store
});
```

**Option B: wrap a signer/wallet**
```ts
const wallet = withSlotScribeSigner(myWallet, { cluster: "devnet", traceUpload: ... });
```

### Constraints

- Must not handle or store private keys.
- Must not change transaction semantics (only adds a Memo ix).
- Must be safe-by-default: if SlotScribe fails, the tx still sends (but plugin returns `slotScribe: { ok:false, reasons:[...] }`).
- Must work for:
  - `Transaction` (legacy)
  - `VersionedTransaction` (best-effort; if memo injection is hard, log and continue)
- Hash rule remains: `payloadHash = sha256Hex(canonicalize(trace.payload))`, memo must contain `SS1 payload=<payloadHash>`.

---

## 1) Add files (must create) — keep repo structure

Create these files:

```
src/plugins/
  types.ts
  withSlotScribeConnection.ts
  withSlotScribeSigner.ts
```

And this script:

```
scripts/
  demo-plugin.ts
```

Update:

- `package.json` add script: `"demo:plugin": "tsx scripts/demo-plugin.ts"`

---

## 2) Plugin API design

### 2.1 `src/plugins/types.ts`

Define minimal types:

- `TraceUploadConfig`:
  - `{ kind: "file"; dir?: string }`
  - `{ kind: "http"; baseUrl: string }`   // expects POST/GET {baseUrl}/{hash} (compatible with Next route)
- `SlotScribePluginOptions`:
  - `cluster: "devnet"|"mainnet-beta"|"testnet"`
  - `rpcUrl?: string`
  - `traceUpload: TraceUploadConfig`
  - `intent?: string` (default a generated string)
  - `planSteps?: string[]` (optional)
  - `softFail?: boolean` (default true)
- `PluginResult`:
  - `ok: boolean`
  - `payloadHash?: string`
  - `memo?: string`
  - `tracePathOrUrl?: string`
  - `reasons: string[]`

---

## 3) Implement upload helper (shared)

Inside `src/plugins/types.ts` (or as a helper imported by both plugins):
- `uploadTrace(hash, trace, uploadConfig) -> { tracePathOrUrl }`
  - file: write to `<dir>/<hash>.json` (default `./data/traces`)
  - http: POST JSON to `${baseUrl}/${hash}`

Note: Your existing Next API route is `/api/trace/[hash]`. The http baseUrl should be `http://localhost:3000/api/trace`.

---

## 4) `withSlotScribeConnection` (main value)

### File: `src/plugins/withSlotScribeConnection.ts`

Export:

```ts
export function withSlotScribeConnection(connection: Connection, opts: SlotScribePluginOptions): Connection & {
  __slotScribe?: { opts: SlotScribePluginOptions };
  sendTransactionWithSlotScribe: (tx: any, signers?: any, options?: any) => Promise<{ signature: string; slotScribe: PluginResult }>;
};
```

Behavior:
- Return an object that delegates all properties/methods to the original connection, **but overrides**:
  - `sendTransaction(tx, signers?, options?)`
  - (Optional) `sendRawTransaction(rawTx, options?)` — for MVP you may just delegate.

For `sendTransactionWithSlotScribe(tx, signers, options)`:
1) Create a `BlackboxRecorder` (your existing class) with:
   - intent: `opts.intent ?? "SlotScribe auto-recorded tx"`
   - cluster: `opts.cluster`
2) Add `opts.planSteps` if provided, otherwise a default like:
   - ["build tx (external)", "inject memo", "send", "confirm", "store trace"]
3) Fill `txSummary` from tx **best-effort**:
   - feePayer: `tx.feePayer?.toBase58()` or if missing, derive from first signer if available
   - programIds:
     - legacy: `tx.instructions.map(ix => ix.programId.toBase58())`
     - versioned: best-effort from `tx.message` (if hard, leave empty and add a reason)
   - to/lamports:
     - if legacy includes a SystemProgram transfer, parse it when possible (best-effort)
4) If tx is `VersionedTransaction`:
   - For MVP, **skip memo injection** with reason: "versioned tx memo injection not supported yet"
   - Set `ok=false` (cannot be verified on-chain) but continue to send tx.
5) If tx is legacy `Transaction`:
   - finalize payloadHash
   - memo string: `SS1 payload=<payloadHash>`
   - inject memo instruction (last ix) using your helper `buildMemoIx(memo)`
6) Delegate to original `connection.sendTransaction(...)` to sign/send.
7) After signature:
   - `recorder.attachOnChain(signature, { memo, status: "unknown" })` (memo may be undefined for versioned)
   - `trace = recorder.buildTrace()`
   - `uploadTrace(payloadHash, trace, opts.traceUpload)` (if no payloadHash because versioned, compute it anyway from payload and store; but note it won’t match chain)
8) Return `{ signature, slotScribe: PluginResult }`.

Also override original `sendTransaction` to preserve behavior:
- call `sendTransactionWithSlotScribe` and return `signature` only.

Soft-fail:
- If any SlotScribe step errors and `opts.softFail !== false`, do:
  - delegate original sendTransaction WITHOUT injection
  - return signature
  - but in `sendTransactionWithSlotScribe`, include `slotScribe.ok=false` and `reasons`.

Dedup memo:
- If legacy tx already contains an instruction to Memo program that includes substring `SS1 payload=`, do not add another.

---

## 5) `withSlotScribeSigner` (secondary)

### File: `src/plugins/withSlotScribeSigner.ts`

Export:

```ts
export function withSlotScribeSigner<T extends { publicKey: PublicKey; signTransaction?: any; signAllTransactions?: any }>(
  signer: T,
  opts: SlotScribePluginOptions
): T & {
  __slotScribe?: { opts: SlotScribePluginOptions };
  signTransactionWithSlotScribe?: (tx: any) => Promise<{ tx: any; slotScribe: PluginResult }>;
};
```

Behavior (best-effort):
- If signer exposes `signTransaction(tx)`, create `signTransactionWithSlotScribe(tx)`:
  - legacy tx: build recorder, fill txSummary, finalize hash, inject memo, call original signTransaction, upload trace, return signed tx + result
  - versioned tx: skip injection with reason; still sign and return
- Do not break original signTransaction; keep it delegating.

---

## 6) Add example script

### File: `scripts/demo-plugin.ts`

- Create `Connection` (confirmed) to devnet
- Wrap it with `withSlotScribeConnection(connection, { cluster:"devnet", traceUpload:{kind:"file"} })`
- Generate temp `from` keypair, airdrop on devnet
- Build a simple legacy `Transaction` transfer (0.01 SOL)
- Call `sendTransactionWithSlotScribe(tx, [from])`
- Print:
  - signature
  - payloadHash
  - viewer url: `http://localhost:3000/verify?cluster=devnet&sig=<sig>`
  - store path/url
- Ensure trace is saved to `./data/traces/<payloadHash>.json`

---

## 7) Documentation updates

Update `README.md` to include a new section:

### “1-line integration”
- show code snippet for wrapping connection and calling `sendTransactionWithSlotScribe`
- explain that this auto-injects memo and stores trace by payload hash

---

## 8) Quality + safety

- Never throw raw errors without context; always add to `reasons`.
- Ensure memo injection only happens once.
- Keep functions small and commented.
- Ensure TypeScript builds.

Generate the full code for each file. Ensure `pnpm demo:plugin` runs.

## PROMPT END
