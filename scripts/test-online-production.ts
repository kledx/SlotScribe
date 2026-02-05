/**
 * SlotScribe Online Production Test Script
 * 
 * 这是一个全链路集成测试脚本，旨在验证已部署的线上服务。
 * 它模拟 AI Agent 的行为，录制交互过程，并将其同步到云端。
 * 
 * 使用方式:
 * 1. 本地测试: pnpm tsx scripts/test-online-production.ts
 * 2. 线上测试: SLOTSCRIBE_URL=https://your-domain.com pnpm tsx scripts/test-online-production.ts
 */

import { SlotScribeRecorder, TOKENS, buildMemoIx, getConnection } from 'slotscribe';
import { Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import { log, logSuccess, logError, getConfig } from './_shared';
import fs from 'fs';
import bs58 from 'bs58';

// 配置
const KEYPAIR_PATH = './scripts/test-wallet.json';
const API_URL = 'https://slotscribe.xyz/';

/**
 * 获取或生成测试钱包记录
 * 支持: 
 * 1. 环境变量 SOLANA_PRIVATE_KEY (Base58 或 JSON 数组)
 * 2. 命令行参数 --keypair 或 -k
 * 3. 本地兜底文件 ./scripts/test-wallet.json
 */
function getOrGenerateKeypair() {
    // 1. 优先级最高：环境变量中的原始私钥
    const envKey = process.env.SOLANA_PRIVATE_KEY;
    if (envKey) {
        try {
            if (envKey.trim().startsWith('[')) {
                return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(envKey)));
            }
            return Keypair.fromSecretKey(bs58.decode(envKey.trim()));
        } catch (e) {
            logError(`环境变量 SOLANA_PRIVATE_KEY 解析失败: ${e}`);
        }
    }

    // 2. 优先级次之：命令行指定的 Keypair 文件
    const config = getConfig();
    const customPath = (config as any).keypair;
    if (customPath && fs.existsSync(customPath)) {
        try {
            const content = fs.readFileSync(customPath, 'utf-8').trim();
            if (content.startsWith('[')) {
                return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(content)));
            }
            return Keypair.fromSecretKey(bs58.decode(content));
        } catch (e) {
            logError(`读取指定的 Keypair 文件失败: ${e}`);
        }
    }

    // 3. 兜底：本地测试钱包
    if (fs.existsSync(KEYPAIR_PATH)) {
        return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))));
    }
    const kp = Keypair.generate();
    fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
}

async function runProductionTest() {
    log(`🚀 启动线上生产环境集成测试...`);
    log(`目标 API: ${API_URL}`);

    const config = getConfig();
    const cluster = config.cluster || 'devnet';
    const payer = getOrGenerateKeypair();
    const conn = getConnection(cluster);

    log(`使用钱包: ${payer.publicKey.toBase58()} (${cluster})`);

    // --- 1. 录制 Agent 行为 ---
    log(`1. 模拟 Agent 行为录制中...`);
    const recorder = new SlotScribeRecorder({
        intent: `生产环境集成测试: 跨链交换与转账 [${new Date().toISOString()}]`,
        cluster: cluster,
    });

    recorder.addPlanSteps([
        '初始化测试上下文',
        '模拟跨链 Dex 报价获取',
        '执行 SOL -> USDC 模拟交换',
        '在区块链上发送 Memo 交易进行锚定',
        '同步存证到云端数据中心',
        '从云端反向检索校验'
    ]);

    // 模拟工具调用 1: Quote
    await recorder.recordToolCall(
        'jupiter.get_quote',
        { inputMint: 'So11111111111111111111111111111111111111112', outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 1000000000 },
        async () => ({
            inAmount: '1000000000',
            outAmount: '145200000',
            priceImpactPct: 0.001,
            routePlan: [{ poolId: 'pool-1', percent: 100 }]
        })
    );

    // 模拟工具调用 2: Swap Execution
    await recorder.recordToolCall(
        'jupiter.swap',
        { quoteResponse: '{...}', userPublicKey: payer.publicKey.toBase58() },
        async () => ({
            txid: 'SIMULATED_TX_ID_' + Math.random().toString(36).slice(2),
            status: 'success'
        })
    );

    // 设置摘要
    recorder.setSwapTx({
        feePayer: payer.publicKey.toBase58(),
        swap: {
            protocol: 'jupiter',
            inputToken: TOKENS.SOL,
            outputToken: TOKENS.USDC,
            inputAmount: '1000000000',
            outputAmount: '145200000',
        },
        programIds: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4']
    });

    const payloadHash = recorder.finalizePayloadHash();
    log(`哈希已生成: ${payloadHash}`);

    // --- 2. 链上锚定 (真实交易) ---
    let signature = '';
    const shouldOnChain = process.argv.includes('--on-chain');

    if (shouldOnChain) {
        log(`2. 正在执行真实的链上锚定交易 (Devnet)...`);
        try {
            const balance = await conn.getBalance(payer.publicKey);
            if (balance < 1000000) {
                log(`余额不足 (${balance / 1e9} SOL)，请确保至少有 0.001 SOL。`);
            } else {
                const destination = config.to ? new PublicKey(config.to) : payer.publicKey;
                log(`锚定目标: ${destination.toBase58()}${destination.equals(payer.publicKey) ? ' (自转账)' : ''}`);

                const randomAmount = Math.floor(Math.random() * 45000) + 10000; // 10,000 - 55,000
                const tx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: destination,
                        lamports: randomAmount,
                    }),
                    buildMemoIx(`BBX1 payload=${payloadHash}`)
                );

                signature = await sendAndConfirmTransaction(conn, tx, [payer]);
                logSuccess(`交易已确认: ${signature}`);
                recorder.attachOnChain(signature);
            }
        } catch (err) {
            logError(`链上转账失败: ${err instanceof Error ? err.message : String(err)}`);
        }
    } else {
        log(`2. 跳过链上锚定 (使用 --on-chain 开启)`);
    }

    const finalTrace = recorder.buildTrace();

    // --- 3. 同步至云端 ---
    log(`3. 正在同步存证到云端...`);
    // 移除末尾斜杠以防双斜杠
    const normalizedApiUrl = API_URL.replace(/\/$/, '');
    const uploadUrl = `${normalizedApiUrl}/api/trace/${payloadHash}`;

    try {
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalTrace),
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status ${uploadResponse.status}: ${await uploadResponse.text()}`);
        }

        const uploadResult = await uploadResponse.json();
        logSuccess(`存证已同步! S3 存储桶: ${uploadResult.location || '已存储'}`);

        // --- 4. 云端校验 ---
        log(`4. 正在从 API 验证存证持久化状态...`);
        // 等待一秒确保异步存储完成（如果是异步模型）
        await new Promise(r => setTimeout(r, 1000));

        const verifyResponse = await fetch(uploadUrl);
        if (verifyResponse.ok) {
            const remoteTrace = await verifyResponse.json();
            if (remoteTrace.payloadHash === payloadHash) {
                logSuccess(`[ ALL PASSED ] 线上全链路验证成功!`);
            } else {
                throw new Error('哈希不匹配，检索到的数据可能有误。');
            }
        } else {
            throw new Error(`无法从 API 检索到存证: ${verifyResponse.status}`);
        }

        // 打印最终结果
        console.log('\n' + '='.repeat(60));
        console.log('🏁 线上测试报告');
        console.log(`- 目标环境: ${normalizedApiUrl}`);
        console.log(`- Trace Hash: ${payloadHash}`);
        if (signature) console.log(`- On-chain Sig: ${signature}`);
        console.log(`- Explorer URL: ${normalizedApiUrl}/explorer?q=${payloadHash.slice(0, 10)}`);
        if (signature) console.log(`- Verify URL: ${normalizedApiUrl}/verify?sig=${signature}&cluster=${cluster}`);
        console.log('='.repeat(60));

    } catch (err) {
        logError(`测试过程出错: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
}

runProductionTest().catch(err => {
    logError(`未捕获异常: ${err}`);
    process.exit(1);
});
