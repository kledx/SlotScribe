# SlotScribe - Verifiable Execution Flight Recorder for Solana AI Agents

SlotScribe is a verifiable execution recorder:
- Your agent runs normally (build/sign/send). SlotScribe does not custody keys.
- It records an off-chain trace (`intent`, `plan`, `toolCalls`, `txSummary`).
- It computes `payloadHash = sha256(canonicalize(trace.payload))`.
- It anchors that hash on-chain via Memo: `SS1 payload=<hash>`.
- Anyone can independently verify by signature/hash.

## Why SlotScribe
As agents execute real-value actions, trust must be verifiable:
- What exactly happened?
- Can the agent rewrite the story later?
- How can users or other agents audit behavior?

SlotScribe turns claims into cryptographic receipts.

## Quick Links
- Docs page: `/docs`
- Verify page: `/verify`
- Public Trace API: `https://slotscribe.xyz/api/trace`
- AI Prompt guide: `./docs/AI_Agent_System_Prompt.md`

## Install (npm)
```bash
npm i slotscribe@latest @solana/web3.js
# or
pnpm add slotscribe@latest @solana/web3.js
```

Check latest version:
```bash
npm view slotscribe version
```

## Minimal Example
```ts
import { SlotScribeRecorder, getConnection } from 'slotscribe';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';

const cluster = 'devnet';
const connection = getConnection(cluster);
const payer = Keypair.generate();

const recorder = new SlotScribeRecorder({
    intent: 'Quickstart transfer test',
    cluster,
});

recorder.setTransferTx({
    feePayer: payer.publicKey.toBase58(),
    to: payer.publicKey.toBase58(),
    lamports: 1000,
});

const tx = new Transaction().add(
    SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 1000,
    })
);

const signature = await recorder.sendTransaction(connection, tx, [payer], {
    autoUpload: true,
    baseUrl: 'https://slotscribe.xyz',
});

const trace = recorder.buildTrace();
console.log('signature=', signature);
console.log('payloadHash=', trace.payloadHash);
console.log('verifyUrl=', `https://slotscribe.xyz/verify?cluster=${cluster}&sig=${signature}&hash=${trace.payloadHash}`);
```

## Local Run
```bash
pnpm install
pnpm dev
```

## Public APIs
- `GET /api/verify?cluster=...&signature=...&hash=...`
- `POST /api/trace`
- `GET /api/trace/{hash}`
- `POST /api/trace/{hash}`

## Security Notes
- SlotScribe verifies integrity (hash consistency), not business truthfulness of off-chain tools.
- Use policy gates (allowlists/limits/slippage checks) for production safety.

## Repository Structure
- `src/slotscribe/`: SDK core
- `app/`: Viewer UI + API routes
- `lib/`: verifier/storage helpers
- `scripts/`: demos and validation scripts
- `docs/`: guides and prompts

## License
MIT
