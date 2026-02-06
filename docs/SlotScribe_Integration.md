# SlotScribe Integration Guide (2-minute setup)

SlotScribe is a verifiable execution recorder for Solana AI agents:
- Your agent runs normally (builds/signs/sends tx).
- SlotScribe records a trace off-chain and anchors a payload hash on-chain via Memo.
- Anyone can verify by tx signature: memo hash -> recomputed hash from trace.

---

## What you get

After integration, every transaction can output a shareable link:

`https://<your-viewer-host>/verify?cluster=devnet&sig=<SIGNATURE>`

And the viewer shows:

`[OK] Verified` - payload hash in Memo matches the trace payload.

---

## Install

```bash
pnpm add slotscribe @solana/web3.js
# or
npm i slotscribe @solana/web3.js
```

> If you are working inside this repository, you can also import from `src/slotscribe` directly.

---

## Minimal Integration

```ts
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { SlotScribeRecorder, buildMemoIx } from 'slotscribe';

export async function runIntentTransfer({
    cluster,
    rpcUrl,
    from,
    to,
    lamports,
}: {
    cluster: 'devnet' | 'mainnet-beta' | 'testnet';
    rpcUrl?: string;
    from: Keypair;
    to: string;
    lamports: number;
}) {
    const connection = new Connection(rpcUrl ?? 'https://api.devnet.solana.com', 'confirmed');

    const recorder = new SlotScribeRecorder({ intent: `Transfer ${lamports} to ${to}`, cluster });
    recorder.addPlanSteps(['check balance', 'build tx', 'anchor memo', 'send', 'confirm']);

    const toPubkey = new PublicKey(to);
    const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey, lamports })
    );

    recorder.setTxSummary({
        cluster,
        feePayer: from.publicKey.toBase58(),
        to,
        lamports,
        programIds: tx.instructions.map((ix) => ix.programId.toBase58()),
    });

    const payloadHash = recorder.finalizePayloadHash();
    const memo = `SS1 payload=${payloadHash}`;
    tx.add(buildMemoIx(memo));

    tx.feePayer = from.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(from);

    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(sig, 'confirmed');

    recorder.attachOnChain(sig, { memo, status: 'confirmed' });
    const trace = recorder.buildTrace();

    // Store trace by payloadHash (file / S3 / DB)
    // await uploadTrace(trace, { baseUrl: 'https://slotscribe.xyz' });

    const viewerUrl = `https://<your-viewer-host>/verify?cluster=${cluster}&sig=${sig}`;
    return { sig, payloadHash, viewerUrl, trace };
}
```

---

## Where to store traces

Use content-addressable retrieval by hash:
- File: `data/traces/<payloadHash>.json`
- HTTP API: `POST /api/trace` and `GET /api/trace/<payloadHash>`
- Object storage: S3/R2 key `<payloadHash>.json`

Rule of thumb: keep chain data lean (Memo hash only), store full trace off-chain.

---

## Verification loop

1. Fetch tx by signature and parse Memo (`payload=<hash>`)
2. Load `trace.json` by hash
3. Recompute `sha256(canonicalize(trace.payload))`
4. Compare with on-chain hash

---

## Troubleshooting

- No memo found: ensure Memo was added to the same tx you sent.
- Hash mismatch: hash `trace.payload` only, not the whole trace object.
- Trace not found: ensure upload uses `payloadHash` as key.
