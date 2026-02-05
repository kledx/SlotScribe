/**
 * 复杂交易示例
 * 展示如何使用 SlotScribe 记录各种 DeFi 操作
 */

import { SlotScribeRecorder, token, TOKENS } from '../src/slotscribe';

// ==================== 示例 1: Jupiter Swap ====================

async function exampleJupiterSwap() {
    const recorder = new SlotScribeRecorder({
        intent: '使用 Jupiter 将 1 SOL 兑换为 BONK',
        cluster: 'mainnet-beta',
    });

    recorder.addPlanSteps([
        '获取 Jupiter 最优路由',
        '构建 swap 交易',
        '添加 SlotScribe memo',
        '发送并确认交易',
    ]);

    // 模拟获取报价
    const quote = await recorder.recordToolCall(
        'jupiter.getQuote',
        { inputMint: TOKENS.SOL.mint, outputMint: TOKENS.BONK.mint, amount: '1000000000' },
        async () => ({
            inAmount: '1000000000',
            outAmount: '123456789012345',
            priceImpactPct: 0.05,
            routePlan: ['SOL → USDC → BONK'],
        })
    );

    // 设置 Swap 交易详情
    recorder.setSwapTx({
        feePayer: 'YourWalletPubkey...',
        swap: {
            protocol: 'jupiter',
            inputToken: TOKENS.SOL,
            outputToken: TOKENS.BONK,
            inputAmount: '1000000000',
            outputAmount: quote.outAmount,
            slippageBps: 50, // 0.5%
            priceImpactPct: quote.priceImpactPct,
            route: quote.routePlan,
        },
        programIds: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
    });

    const hash = recorder.finalizePayloadHash();
    console.log('[Jupiter Swap] Hash:', hash);
    console.log('[Jupiter Swap] Trace:', JSON.stringify(recorder.getPayload(), null, 2));
}

// ==================== 示例 2: Marinade 质押 ====================

async function exampleMarinadeStake() {
    const recorder = new SlotScribeRecorder({
        intent: '质押 10 SOL 到 Marinade Finance',
        cluster: 'mainnet-beta',
    });

    recorder.addPlanSteps([
        '检查 mSOL 汇率',
        '构建质押交易',
        '发送并确认',
    ]);

    // 模拟质押
    await recorder.recordToolCall(
        'marinade.stake',
        { amount: 10_000_000_000 },
        async () => ({ msolReceived: '9850000000', exchangeRate: 1.0152 })
    );

    // 设置质押交易详情
    recorder.setStakeTx({
        feePayer: 'YourWalletPubkey...',
        stake: {
            protocol: 'marinade',
            amount: '10000000000',
            lstToken: { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL', decimals: 9 },
            lstAmount: '9850000000',
        },
        programIds: ['MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD'],
    });

    const hash = recorder.finalizePayloadHash();
    console.log('[Marinade Stake] Hash:', hash);
}

// ==================== 示例 3: Pump.fun 购买 Meme 币 ====================

async function examplePumpFunBuy() {
    const recorder = new SlotScribeRecorder({
        intent: '在 Pump.fun 上用 0.5 SOL 购买 $DOGWIFHAT',
        cluster: 'mainnet-beta',
    });

    recorder.addPlanSteps([
        '获取 bonding curve 信息',
        '计算预期 token 数量',
        '构建购买交易',
        '发送并确认',
    ]);

    // 模拟获取 bonding curve
    const curve = await recorder.recordToolCall(
        'pump.getBondingCurve',
        { tokenMint: 'DOGWIFHAT...' },
        async () => ({
            virtualSolReserves: '30000000000000',
            virtualTokenReserves: '1000000000000000000',
            realTokenReserves: '800000000000000000',
        })
    );

    // 模拟购买
    const buyResult = await recorder.recordToolCall(
        'pump.buy',
        { solAmount: 500_000_000, minTokens: '1000000000000' },
        async () => ({
            tokensReceived: '1234567890000',
            pricePerToken: 0.0000004,
        })
    );

    // 设置 Meme 币交易详情
    recorder.setMemeCoinTx({
        feePayer: 'YourWalletPubkey...',
        meme: {
            protocol: 'pump_fun',
            action: 'buy',
            token: token('DOGWIFHAT...', 'DOGWIFHAT', 6),
            solAmount: '500000000',
            tokenAmount: buyResult.tokensReceived,
            bondingCurve: 'BondingCurveAddress...',
            graduated: false,
        },
        programIds: ['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'],
    });

    const hash = recorder.finalizePayloadHash();
    console.log('[Pump.fun Buy] Hash:', hash);
}

// ==================== 示例 4: Tensor NFT 购买 ====================

async function exampleTensorNftBuy() {
    const recorder = new SlotScribeRecorder({
        intent: '在 Tensor 上购买 Mad Lads #1234',
        cluster: 'mainnet-beta',
    });

    recorder.addPlanSteps([
        '获取 NFT 列表信息',
        '验证价格和所有权',
        '构建购买交易',
        '发送并确认',
    ]);

    // 模拟获取 listing
    await recorder.recordToolCall(
        'tensor.getListing',
        { mint: 'MadLadNftMint...' },
        async () => ({
            price: 50_000_000_000, // 50 SOL
            seller: 'SellerPubkey...',
            name: 'Mad Lads #1234',
        })
    );

    // 设置 NFT 购买详情
    recorder.setNftBuyTx({
        feePayer: 'YourWalletPubkey...',
        nft: {
            protocol: 'tensor',
            mint: 'MadLadNftMint...',
            name: 'Mad Lads #1234',
            collection: 'MadLadsCollection...',
            collectionName: 'Mad Lads',
            price: '50000000000',
            seller: 'SellerPubkey...',
            buyer: 'YourWalletPubkey...',
        },
        programIds: ['TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'],
    });

    const hash = recorder.finalizePayloadHash();
    console.log('[Tensor NFT Buy] Hash:', hash);
}

// ==================== 示例 5: MarginFi 借贷 ====================

async function exampleMarginFiLending() {
    const recorder = new SlotScribeRecorder({
        intent: '在 MarginFi 存入 100 USDC 并借出 0.5 SOL',
        cluster: 'mainnet-beta',
    });

    recorder.addPlanSteps([
        '存入 USDC 作为抵押品',
        '借出 SOL',
    ]);

    // 存入 USDC
    await recorder.recordToolCall(
        'marginfi.deposit',
        { token: 'USDC', amount: 100_000_000 },
        async () => ({ success: true, healthFactor: 2.5 })
    );

    // 借出 SOL
    await recorder.recordToolCall(
        'marginfi.borrow',
        { token: 'SOL', amount: 500_000_000 },
        async () => ({ success: true, healthFactor: 1.8 })
    );

    // 设置借贷详情
    recorder.setLendingTx({
        feePayer: 'YourWalletPubkey...',
        lending: {
            protocol: 'marginfi',
            action: 'borrow',
            token: TOKENS.SOL,
            amount: '500000000',
            collateral: TOKENS.USDC,
            collateralAmount: '100000000',
        },
        programIds: ['MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA'],
    });

    const hash = recorder.finalizePayloadHash();
    console.log('[MarginFi Lending] Hash:', hash);
}

// ==================== 运行示例 ====================

async function main() {
    console.log('='.repeat(60));
    console.log('SlotScribe 复杂交易示例');
    console.log('='.repeat(60));
    console.log();

    await exampleJupiterSwap();
    console.log();

    await exampleMarinadeStake();
    console.log();

    await examplePumpFunBuy();
    console.log();

    await exampleTensorNftBuy();
    console.log();

    await exampleMarginFiLending();
    console.log();

    console.log('='.repeat(60));
    console.log('所有示例完成！');
    console.log('='.repeat(60));
}

main().catch(console.error);
