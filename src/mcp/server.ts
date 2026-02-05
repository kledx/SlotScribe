import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SlotScribeRecorder } from "../slotscribe/recorder.js";
import { uploadTrace } from "../slotscribe/upload.js";
import { buildMemoIx } from "../slotscribe/solana.js";
import { z } from "zod";

/**
 * SlotScribe MCP Server
 * 
 * 为 AI Agent (如 Claude) 提供可验证的记录能力
 */

// 简单的内存存储，用于跨工具调用保留 Recorder 状态
// 注意：在实际的多用户生产环境，这里需要基于 session 的存储
const activeRecorders = new Map<string, SlotScribeRecorder>();

const server = new Server(
    {
        name: "slotscribe",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * 定义工具列表
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "start_recording",
                description: "开始记录一个新的 Agent 操作任务。返回 recorderId。",
                inputSchema: {
                    type: "object",
                    properties: {
                        intent: { type: "string", description: "操作意图描述" },
                        cluster: { type: "string", enum: ["devnet", "mainnet-beta"], default: "mainnet-beta" },
                    },
                    required: ["intent"],
                },
            },
            {
                name: "record_step",
                description: "记录一个已执行的工具调用或操作步骤。",
                inputSchema: {
                    type: "object",
                    properties: {
                        recorderId: { type: "string" },
                        toolName: { type: "string" },
                        input: { type: "object" },
                        output: { type: "object" },
                        error: { type: "string" },
                    },
                    required: ["recorderId", "toolName", "input"],
                },
            },
            {
                name: "finalize_and_anchor",
                description: "完成记录，生成交易所需的 Memo 指令。返回 hash 和指令详情。",
                inputSchema: {
                    type: "object",
                    properties: {
                        recorderId: { type: "string" },
                        txDetails: {
                            type: "object",
                            properties: {
                                type: { type: "string" },
                                feePayer: { type: "string" },
                                swap: { type: "object" },
                                stake: { type: "object" },
                                npc: { type: "object" },
                                lending: { type: "object" },
                                meme: { type: "object" },
                            }
                        },
                    },
                    required: ["recorderId"],
                },
            },
            {
                name: "upload_and_verify",
                description: "在交易发送后，将 trace 上传到 SlotScribe 服务以供验证。",
                inputSchema: {
                    type: "object",
                    properties: {
                        recorderId: { type: "string" },
                        signature: { type: "string", description: "Solana 交易签名" },
                    },
                    required: ["recorderId", "signature"],
                },
            },
        ],
    };
});

/**
 * 处理工具调用
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "start_recording": {
                const { intent, cluster = "mainnet-beta" } = args as { intent: string, cluster: string };
                const recorder = new SlotScribeRecorder({ intent, cluster: cluster as any });
                const recorderId = Math.random().toString(36).substring(7);
                activeRecorders.set(recorderId, recorder);

                return {
                    content: [{ type: "text", text: `已启动记录器。ID: ${recorderId}` }],
                };
            }

            case "record_step": {
                const { recorderId, toolName, input, output, error } = args as any;
                const recorder = activeRecorders.get(recorderId);
                if (!recorder) throw new Error("无效的 recorderId");

                // 我们手动模拟 recordToolCall 的记录部分
                await recorder.recordToolCall(toolName, input, async () => {
                    if (error) throw new Error(error);
                    return output;
                });

                return {
                    content: [{ type: "text", text: `已记录步骤: ${toolName}` }],
                };
            }

            case "finalize_and_anchor": {
                const { recorderId, txDetails } = args as any;
                const recorder = activeRecorders.get(recorderId);
                if (!recorder) throw new Error("无效的 recorderId");

                if (txDetails) {
                    recorder.setTxSummary(txDetails);
                }

                const hash = recorder.finalizePayloadHash();
                const memoContent = `BBX1 payload=${hash}`;

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            hash,
                            memoInstruction: memoContent,
                            hint: "请在你的 Solana 交易中添加一个 Memo 指令，内容为上述 memoInstruction。"
                        }, null, 2)
                    }],
                };
            }

            case "upload_and_verify": {
                const { recorderId, signature } = args as any;
                const recorder = activeRecorders.get(recorderId);
                if (!recorder) throw new Error("无效的 recorderId");

                recorder.attachOnChain(signature, { status: "confirmed" });
                const trace = recorder.buildTrace();

                // 使用默认本地或配置的服务 URL
                const result = await uploadTrace(trace, {
                    baseUrl: process.env.SLOTSCRIBE_API_URL || "http://localhost:3000"
                });

                activeRecorders.delete(recorderId);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: result.success,
                            viewerUrl: result.viewerUrl,
                            message: "Trace 已上传，现在可以全球验证。"
                        }, null, 2)
                    }],
                };
            }

            default:
                throw new Error(`未知工具: ${name}`);
        }
    } catch (error) {
        return {
            content: [{ type: "text", text: `错误: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});

/**
 * 启动服务器
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("SlotScribe MCP Server 正在运行 (stdio)");
}

main().catch((error) => {
    console.error("致命错误:", error);
    process.exit(1);
});
