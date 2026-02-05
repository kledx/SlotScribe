# SlotScribe Integration Guide (2-minute setup)

SlotScribe is a **verifiable execution recorder** for Solana AI agents:
- Your agent runs normally (builds/signs/sends tx).
- SlotScribe records a trace **off-chain** and anchors a **payload hash** **on-chain** via Memo.
- Anyone can verify by tx signature: memo hash ↔ recomputed hash from trace.

This guide shows the **fastest** way to integrate.

---

## What you get

After integration, every transaction can output a shareable link like:

`https://<your-viewer-host>/verify?cluster=devnet&sig=<SIGNATURE>`

And the viewer displays:

✅ Verified — payload hash in Memo matches the trace payload.

---

## Install

```bash
pnpm add @slotscribe/sdk @solana/web3.js
# or
npm i @slotscribe/sdk @solana/web3.js
```

> If you’re using the demo repo from the hackathon, you can import from `src/blackbox` directly.

---

## Minimal Integration (≈10 lines)

```ts
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { SlotScribeRecorder, buildMemoIx } from "@slotscribe/sdk"; // adapt names to your repo

export async function runIntentTransfer({
  cluster,
  rpcUrl,
  from,
  to,
  lamports,
}: {
  cluster: "devnet" | "mainnet-beta" | "testnet";
  rpcUrl?: string;
  from: Keypair;
  to: string;
  lamports: number;
}) {
  const connection = new Connection(rpcUrl ?? "https://api.devnet.solana.com", "confirmed");

  // 1) Start a recorder session
  const recorder = new SlotScribeRecorder({ intent: `Transfer ${lamports} to ${to}`, cluster });

  // 2) Optional: plan steps
  recorder.addPlanSteps(["check balance", "build tx", "anchor memo", "send", "confirm"]);

  // 3) Build tx (your normal logic)
  const toPubkey = new PublicKey(to);
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey, lamports })
  );

  // 4) Fill txSummary BEFORE hashing
  recorder.setTxSummary({
    cluster,
    feePayer: from.publicKey.toBase58(),
    to,
    lamports,
    programIds: tx.instructions.map((ix) => ix.programId.toBase58()),
  });

  // 5) Finalize payload hash and anchor it on-chain
  const payloadHash = recorder.finalizePayloadHash(); // sha256(canonicalize(payload))
  const memo = `SS1 payload=${payloadHash}`;
  tx.add(buildMemoIx(memo));

  // 6) Sign + send (SlotScribe does NOT handle keys)
  tx.feePayer = from.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(from);

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction(sig, "confirmed");

  // 7) Build the final trace and store/upload it
  recorder.attachOnChain(sig, { memo, status: "confirmed" });
  const trace = recorder.buildTrace();

  // Store it by payloadHash (file/S3/db/IPFS—your choice)
  // await uploadTrace(payloadHash, trace);
  // or fs.writeFileSync(`./data/traces/${payloadHash}.json`, JSON.stringify(trace, null, 2));

  // 8) Share a viewer link
  const viewerUrl = `https://<your-viewer-host>/verify?cluster=${cluster}&sig=${sig}`;
  return { sig, payloadHash, viewerUrl, trace };
}
```

---

## Where to store traces

You need **content-addressable** retrieval by hash:

- File (hackathon easiest): `data/traces/<payloadHash>.json`
- HTTP API (recommended): `POST /trace/<hash>` and `GET /trace/<hash>`
- Object storage: S3/R2 with key `<hash>.json`
- IPFS/Arweave (optional later)

**Rule of thumb:** keep the chain lean (Memo hash only), store full trace off-chain.

---

## Verification (what your viewer/verifier does)

1) Fetch transaction by signature (RPC)
2) Find Memo instruction and parse `payload=<hash>`
3) Load `trace.json` by `<hash>`
4) Recompute `sha256(canonicalize(trace.payload))`
5) Compare
6) Optionally cross-check tx fields (to/lamports/programIds)

---

## Troubleshooting

- **No memo found**: ensure you added the Memo instruction to the same tx you sent.
- **Hash mismatch**: ensure you canonicalize `trace.payload` (not the full trace), and hash hex formatting is consistent.
- **Trace not found**: ensure upload/store step used the same `payloadHash` key.

---

## Best practices (for real agents)

- Record **tool calls** (inputs/outputs) but treat them as “evidence”, not truth.
- For multi-tx intents, include `sessionId` and `stepIndex` in payload.
- Add an optional **policy gate** before signing (limits, allowlists, slippage, etc.).
