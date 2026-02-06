# --- Base Phase ---
FROM node:20-alpine AS base
RUN npm install -g pnpm

# --- Dependencies Phase ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sdk/package.json ./packages/sdk/package.json
RUN pnpm install --frozen-lockfile

# --- Builder Phase ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 接收构建参数并转为环境变量（Next.js 构建时需要）
ARG NEXT_PUBLIC_DEFAULT_CLUSTER
ENV NEXT_PUBLIC_DEFAULT_CLUSTER=${NEXT_PUBLIC_DEFAULT_CLUSTER}

# Next.js 遥测数据，禁用
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# --- Runner Phase ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 自动设置 standalone 文件夹的正确权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 从构建阶段利用 standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ==========================================
# 针对 Autonomous Agent 的增强：
# 1. 拷贝必要的脚本和文档文件
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/docs ./docs
COPY --from=builder --chown=nextjs:nodejs /app/CHANGELOG.md ./CHANGELOG.md
# 2. 安装 tsx 以支持在生产环境直接运行 ts 脚本
RUN npm install -g tsx typescript
# ==========================================

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

