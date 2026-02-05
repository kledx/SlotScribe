/**
 * Full Flow Test Script
 * Records a transaction, uploads it to the local API, and prepares for UI verification.
 */

import { SlotScribeRecorder, TOKENS } from '../src/slotscribe';

async function testFullFlow() {
    console.log('🚀 Starting Full Flow Test...');

    // 1. Record an interaction
    const recorder = new SlotScribeRecorder({
        intent: 'Full Flow Test: Swap SOL for USDC on Devnet',
        cluster: 'devnet',
    });

    recorder.addPlanSteps([
        'Initialize recording',
        'Simulate tool calls',
        'Commit trace hash to API',
        'Verify in UI'
    ]);

    // Simulate a tool call
    await recorder.recordToolCall(
        'jupiter.quote',
        { input: 'SOL', output: 'USDC' },
        async () => ({ price: 150.5, amount: '150500000' })
    );

    // Set transaction summary
    recorder.setSwapTx({
        feePayer: 'G5qWz5rP...test',
        swap: {
            protocol: 'jupiter',
            inputToken: TOKENS.SOL,
            outputToken: TOKENS.USDC,
            inputAmount: '1000000000',
            outputAmount: '150500000',
        },
        programIds: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
    });

    const hash = recorder.finalizePayloadHash();
    const trace = recorder.buildTrace();

    console.log(`✅ Recording complete. Hash: ${hash}`);

    // 2. Upload to local API
    const apiUrl = `http://localhost:3000/api/trace/${hash}`;
    console.log(`上传中 to ${apiUrl}...`);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trace),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Upload successful!');
            console.log('Result:', JSON.stringify(result, null, 2));
            console.log('\n' + '='.repeat(50));
            console.log('NEXT STEPS FOR MANUAL VERIFICATION:');
            console.log(`1. Open: http://localhost:3000/explorer`);
            console.log(`2. Search for hash prefix: ${hash.slice(0, 8)}`);
            console.log(`3. Click verify to see the logic breakdown.`);
            console.log('='.repeat(50));
        } else {
            console.error('❌ Upload failed:', result);
        }
    } catch (err) {
        console.error('❌ Request error (is the server running?):', err);
    }
}

testFullFlow().catch(console.error);
