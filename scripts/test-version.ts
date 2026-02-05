/**
 * 测试版本自动选择
 */
import { SlotScribeRecorder, TOKENS } from '../src/slotscribe';

// 简单转账 - 应该是 BBX1
const simple = new SlotScribeRecorder({ intent: 'Simple transfer', cluster: 'devnet' });
simple.setTransferTx({ feePayer: 'xxx', to: 'yyy', lamports: 1000 });
simple.finalizePayloadHash();
console.log('Simple transfer version:', simple.buildTrace().version);

// Swap 交易 - 应该是 BBX2
const swap = new SlotScribeRecorder({ intent: 'Swap SOL to BONK', cluster: 'mainnet-beta' });
swap.setSwapTx({
    feePayer: 'xxx',
    swap: {
        protocol: 'jupiter',
        inputToken: TOKENS.SOL,
        outputToken: TOKENS.BONK,
        inputAmount: '1000000000',
        outputAmount: '123456789',
    }
});
swap.finalizePayloadHash();
console.log('Swap version:', swap.buildTrace().version);

// Stake - 应该是 BBX2
const stake = new SlotScribeRecorder({ intent: 'Stake SOL', cluster: 'mainnet-beta' });
stake.setStakeTx({
    feePayer: 'xxx',
    stake: {
        protocol: 'marinade',
        amount: '10000000000',
    }
});
stake.finalizePayloadHash();
console.log('Stake version:', stake.buildTrace().version);

console.log('\n✅ 版本自动选择测试完成');
