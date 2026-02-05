/**
 * Demo Transfer Script
 * 
 * 在 Solana devnet 上执行一笔带 Memo 的转账交易
 * 用于演示 SlotScribe 的完整流程
 */

import {
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    SlotScribeRecorder,
    getConnection,
    buildMemoIx,
    SYSTEM_PROGRAM_ID,
    MEMO_PROGRAM_ID,
} from '../src/slotscribe/index';
import {
    getConfig,
    writeTraceFile,
    log,
    logError,
    logSuccess,
} from './_shared';

async function main() {
    const config = getConfig();

    log(`Starting demo on ${config.cluster}...`);
    log(`RPC: ${config.rpcUrl || '(default)'}`);

    // 创建 Connection
    const connection = getConnection(config.cluster, config.rpcUrl);

    // 生成临时钱包
    const fromKeypair = Keypair.generate();
    log(`Generated temporary wallet: ${fromKeypair.publicKey.toBase58()}`);

    // 目标地址（如果未指定，生成随机地址）
    const toKeypair = config.to ? null : Keypair.generate();
    const toPubkey = config.to
        ? await import('@solana/web3.js').then(m => new m.PublicKey(config.to!))
        : toKeypair!.publicKey;

    log(`Transfer target: ${toPubkey.toBase58()}`);

    // 初始化 Recorder
    const recorder = new SlotScribeRecorder({
        intent: `Transfer ${config.sol} SOL from temporary wallet to ${toPubkey.toBase58()}`,
        cluster: config.cluster,
    });

    // 添加计划步骤
    recorder.addPlanSteps([
        'Request airdrop from devnet faucet',
        'Wait for airdrop confirmation',
        'Check balance',
        'Build transfer transaction',
        'Attach BBX memo with payload hash',
        'Send and confirm transaction',
        'Save trace file',
    ]);

    // Step 1: Airdrop (带重试)
    const airdropLamports = LAMPORTS_PER_SOL; // 1 SOL
    log('Requesting airdrop...');

    const airdropSig = await recorder.recordToolCall(
        'requestAirdrop',
        { pubkey: fromKeypair.publicKey.toBase58(), lamports: airdropLamports },
        async () => {
            const maxRetries = 5;
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    log(`Airdrop attempt ${attempt}/${maxRetries}...`);
                    const sig = await connection.requestAirdrop(fromKeypair.publicKey, airdropLamports);
                    return sig;
                } catch (err) {
                    lastError = err as Error;
                    log(`Airdrop attempt ${attempt} failed: ${lastError.message}`);

                    if (attempt < maxRetries) {
                        // 等待后重试 (指数退避)
                        const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                        log(`Waiting ${waitMs}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitMs));
                    }
                }
            }

            throw new Error(`Airdrop failed after ${maxRetries} attempts. Last error: ${lastError?.message}. Devnet faucet may be busy, please try again later.`);
        }
    );

    log(`Airdrop signature: ${airdropSig}`);

    // 等待 airdrop 确认
    await recorder.recordToolCall(
        'confirmAirdrop',
        { signature: airdropSig },
        async () => {
            const latestBlockhash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                signature: airdropSig,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            });
            return { confirmed: true };
        }
    );

    log('Airdrop confirmed');

    // Step 2: 检查余额
    const balance = await recorder.recordToolCall(
        'getBalance',
        { pubkey: fromKeypair.publicKey.toBase58() },
        async () => {
            const bal = await connection.getBalance(fromKeypair.publicKey);
            return { lamports: bal, sol: bal / LAMPORTS_PER_SOL };
        }
    );

    log(`Balance: ${balance.sol} SOL`);

    // Step 3: 计算转账金额
    const transferLamports = Math.floor(config.sol * LAMPORTS_PER_SOL);

    // Step 4: 设置 txSummary（必须在 finalizePayloadHash 之前！）
    recorder.setTxSummary({
        cluster: config.cluster,
        feePayer: fromKeypair.publicKey.toBase58(),
        to: toPubkey.toBase58(),
        lamports: transferLamports,
        programIds: [SYSTEM_PROGRAM_ID.toBase58(), MEMO_PROGRAM_ID.toBase58()],
    });

    // Step 5: 计算 payloadHash
    const payloadHash = recorder.finalizePayloadHash();
    log(`PayloadHash: ${payloadHash}`);

    // Step 6: 构建交易
    const memoContent = `BBX1 payload=${payloadHash}`;

    const transaction = await recorder.recordToolCall(
        'buildTransaction',
        { to: toPubkey.toBase58(), lamports: transferLamports, memo: memoContent },
        async () => {
            const tx = new Transaction();

            // Transfer 指令
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: toPubkey,
                    lamports: transferLamports,
                })
            );

            // Memo 指令
            tx.add(buildMemoIx(memoContent));

            // 获取最新 blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.lastValidBlockHeight = lastValidBlockHeight;
            tx.feePayer = fromKeypair.publicKey;

            return {
                instructions: tx.instructions.length,
                blockhash,
            };
        }
    );

    log(`Transaction built with ${transaction.instructions} instructions`);

    // 重新构建交易用于发送
    const tx = new Transaction();
    tx.add(
        SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: toPubkey,
            lamports: transferLamports,
        })
    );
    tx.add(buildMemoIx(memoContent));

    // Step 7: 发送交易
    log('Sending transaction...');

    const signature = await recorder.recordToolCall(
        'sendAndConfirmTransaction',
        { feePayer: fromKeypair.publicKey.toBase58() },
        async () => {
            const sig = await sendAndConfirmTransaction(connection, tx, [fromKeypair], {
                commitment: 'confirmed',
            });
            return sig;
        }
    );

    logSuccess(`Transaction confirmed: ${signature}`);

    // 获取交易详情
    const txInfo = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
    });

    // 附加链上信息
    recorder.attachOnChain(signature, {
        slot: txInfo?.slot,
        status: 'confirmed',
        memo: memoContent,
    });

    // 构建并保存 trace
    const trace = recorder.buildTrace();
    const traceFilePath = await writeTraceFile(payloadHash, trace, config.tracesDir);

    logSuccess(`Trace saved: ${traceFilePath}`);

    // 输出结果
    console.log('\n' + '='.repeat(60));
    console.log('Demo Complete!');
    console.log('='.repeat(60));
    console.log(`Signature: ${signature}`);
    console.log(`PayloadHash: ${payloadHash}`);
    console.log(`Viewer: http://localhost:3000/verify?cluster=${config.cluster}&sig=${signature}&hash=${payloadHash}`);
    console.log('='.repeat(60) + '\n');

    // 等待一下让 Next.js 服务器有时间处理
    await new Promise(resolve => setTimeout(resolve, 1000));

    process.exit(0);
}

main().catch((err) => {
    logError(err.message || String(err));
    console.error(err);
    process.exit(1);
});
