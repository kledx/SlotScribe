# SlotScribe 部署文档（Viewer + SDK）

## 1. 前置条件

- Node.js >= 20
- pnpm >= 10
- Docker（部署 Viewer）
- npm 账号（发布 SDK）
- GitHub 仓库已配置 `NPM_TOKEN`（Actions 发布 SDK 用）

---

## 2. Viewer 部署（Docker）

### 2.1 本地构建并运行

```bash
# 在仓库根目录
docker build -t slotscribe-viewer .
docker run -d --name slotscribe-viewer -p 3000:3000 --env-file .env slotscribe-viewer
```

访问：`http://localhost:3000`

### 2.2 使用 docker-compose 运行

```bash
docker compose up -d
```

停止：

```bash
docker compose down
```

### 2.3 使用 GHCR 镜像部署（服务器）

```bash
docker pull ghcr.io/<owner>/<repo>:latest
docker run -d --name slotscribe-viewer -p 3000:3000 --env-file .env ghcr.io/<owner>/<repo>:latest
```

### 2.4 Viewer CI/CD（已配置）

工作流：`.github/workflows/docker-publish.yml`

触发条件：

- push 到 `main`
- push tag `v*.*.*`
- PR 到 `main`（仅构建，不推送）

---

## 3. SDK 构建与发布（npm）

SDK 包位置：`packages/sdk`

### 3.1 本地构建 SDK
# 1) 把 SDK 版本改到 0.1.4
  npm version 0.1.4 --no-git-tag-version --workspace packages/sdk

```bash
pnpm install
pnpm build:sdk
```

或仅构建 SDK 包：

```bash
pnpm --filter slotscribe build
```

### 3.2 本地发布（手动）

```bash
# 1) 修改版本号（在 packages/sdk/package.json）
# 2) 构建
pnpm --filter slotscribe build

# 3) 发布
pnpm --filter slotscribe publish --access public --no-git-checks
```

### 3.3 GitHub Actions 自动发布 SDK（推荐）

工作流：`.github/workflows/sdk-publish.yml`

触发条件：

- 手动触发（workflow_dispatch）
- push tag：`sdk-v*.*.*`

发布步骤：

1. 修改 `packages/sdk/package.json` 的 `version`（如 `0.1.3`）
2. 提交并推送代码
3. 打 tag 并推送：

```bash
git tag sdk-v0.1.3
git push origin sdk-v0.1.3
```

说明：工作流会校验 tag 版本和 `packages/sdk/package.json` 的版本一致，不一致会失败。

---

## 4. 发布后验证

### 4.1 验证 SDK 可安装

```bash
npm i slotscribe@<version>
```

### 4.2 验证 Viewer 在线

- 打开首页：`/`
- 打开验证页：`/verify`
- 检查 API：`/api/trace/<hash>`

---

## 5. 常见问题

### 5.1 `pnpm install --frozen-lockfile` 失败

通常是 `package.json` 和 `pnpm-lock.yaml` 不一致。执行：

```bash
pnpm install --lockfile-only
```

然后重新构建。

### 5.2 npm 发布 403（版本已存在）

需要先升级版本再发布，例如从 `0.1.2` 升到 `0.1.3`。

### 5.3 Windows 本地 `next build` 出现 `EPERM symlink`

这是本机权限/策略问题，和流程本身无关。CI（Linux）通常可正常构建。


# 1) 确保代码已提交
  git add .
  git commit -m "Release sdk 0.1.4"

  # 2) 打 tag
  git tag sdk-v0.1.4

  # 3) 推送代码和 tag
  git push origin main
  git push origin sdk-v0.1.4

  如果 tag 已存在，要更新到当前提交：

  git tag -f sdk-v0.1.4
  git push origin sdk-v0.1.4 --force