/**
 * REAL ON-CHAIN TEST
 * 发起真实的 Devnet 交易并在链上锚定哈希
 */

import {
    Keypair,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
    PublicKey,
} from '@solana/web3.js';
import { SlotScribeRecorder, buildMemoIx, getConnection, TOKENS } from '../src/slotscribe';
import fs from 'fs';

const KEYPAIR_PATH = './scripts/test-wallet.json';

function getOrGenerateKeypair() {
    if (fs.existsSync(KEYPAIR_PATH)) {
        return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))));
    }
    const kp = Keypair.generate();
    fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
}

async function testRealOnChain() {
    console.log('🔥 启动“动真格”测试 (Solana Devnet)...');

    // 1. 准备钱包
    const payer = getOrGenerateKeypair();
    const conn = getConnection('devnet');

    console.log(`\n1. 钱包地址: ${payer.publicKey.toBase58()}`);

    let balance = await conn.getBalance(payer.publicKey);
    if (balance < 0.05 * LAMPORTS_PER_SOL) {
        console.log('余额不足 (需至少 0.05 SOL)，正在尝试 Airdrop...');
        try {
            const airdropSig = await conn.requestAirdrop(payer.publicKey, 0.1 * LAMPORTS_PER_SOL);
            await conn.confirmTransaction(airdropSig);
            console.log('✅ Airdrop 成功!');
        } catch (err) {
            console.log('\n❌ Airdrop 触发频率限制。');
            console.log(`请手动运行以下命令为钱包充值并重新运行此脚本:`);
            console.log(`solana airdrop 0.5 ${payer.publicKey.toBase58()} --url devnet`);
            console.log('或者从其他钱包转入少量 Devnet SOL。');
            return;
        }
    } else {
        console.log(`✅ 余额充足: ${balance / LAMPORTS_PER_SOL} SOL`);
    }

    // 允许通过命令行或环境变量指定网络
    const cluster = (process.argv.includes('--mainnet') ? 'mainnet-beta' :
        process.env.TEST_CLUSTER || 'devnet') as any;

    // 2. 录制 Agent 行为
    console.log(`\n2. 正在录制 Agent 行为 (目标网络: ${cluster})...`);
    const recorder = new SlotScribeRecorder({
        intent: `真实全链路测试: SOL 转账 [${new Date().toLocaleTimeString()}]`,
        cluster,
    });

    recorder.addPlanSteps([
        '申请测试代币 (Airdrop)',
        '构建转账交易',
        '锚定 SHA-256 哈希到 Memo',
        '在区块链上固化承诺'
    ]);

    // 模拟一个简单的“目标地址”
    const destination = new PublicKey('G5qWz5rP7pLdfMNP5GqWz5rP7pLdfMNP5GqWz5rP7pLd');

    // 设置交易详情
    recorder.setTransferTx({
        feePayer: payer.publicKey.toBase58(),
        to: destination.toBase58(),
        lamports: 1000000, // 0.001 SOL
        programIds: ['11111111111111111111111111111111']
    });

    const payloadHash = recorder.finalizePayloadHash();
    const trace = recorder.buildTrace();
    console.log(`✅ 录制完成。生成的哈希为: ${payloadHash}`);

    // 3. 构建并发送交易
    console.log('\n3. 正在发送交易并锚定哈希到区块链...');
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: destination,
            lamports: 1000000,
        }),
        buildMemoIx(`BBX1 payload=${payloadHash}`)
    );

    try {
        const signature = await sendAndConfirmTransaction(conn, tx, [payer]);
        console.log(`✅ 交易已在区块链上固化!`);
        console.log(`签名 (Signature): ${signature}`);

        // 更新 trace 以包含签名，这样 Explorer 就能链接到 Report
        recorder.attachOnChain(signature);
        const updatedTrace = recorder.buildTrace();

        // 4. 上传 Trace 到存储中心
        console.log('\n4. 正在同步存证 (Trace) 到数据中心...');
        const response = await fetch(`http://localhost:3000/api/trace/${payloadHash}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTrace),
        });

        if (response.ok) {
            console.log('✅ 存证同步成功!');
            console.log('\n' + '='.repeat(60));
            console.log('🏁 恭喜! 闭环测试已完成。');
            console.log('现在请执行以下操作验证最终结果:');
            console.log(`1. 打开: http://localhost:3000/verify`);
            console.log(`2. 粘贴签名: ${signature}`);
            console.log('3. 将网络选为: Devnet');
            console.log('4. 点击 VERIFY 按钮');
            console.log('结果: 您将看到一个完美的绿色 [ VERIFIED ] 报告! 🚀');
            console.log('='.repeat(60));
        } else {
            console.error('❌ 存证同步失败 (请确认 npm dev 正在运行):', await response.text());
        }
    } catch (err) {
        console.error('❌ 交易执行失败:', err);
    }
}

testRealOnChain().catch(console.error);
