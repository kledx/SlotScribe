# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages and API routes for the viewer (e.g., `app/verify/`).
- `src/slotscribe/`: core SDK (trace, hash, recorder, Solana helpers).
- `src/plugins/`: one-line integration plugins.
- `lib/`: trace storage and verification utilities.
- `scripts/`: CLI/demo utilities (e.g., `scripts/demo-transfer.ts`).
- `data/traces/`: local trace store used by demos and dev runs.
- `components/` and `uiux/`: shared UI pieces and design assets.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies (Node.js >= 20).
- `pnpm dev`: run the Next.js viewer at `http://localhost:3000`.
- `pnpm build`: production build for the viewer.
- `pnpm start`: start the production build.
- `pnpm lint`: run Next.js linting.
- `pnpm demo`: run the local demo (starts viewer + sends a devnet tx).
- `pnpm verify -- --cluster devnet --sig <tx>`: verify a trace by signature.
- `pnpm mcp`: start the MCP server.

## Coding Style & Naming Conventions
- Language: TypeScript/TSX, ES modules (`"type": "module"`).
- Indentation: 4 spaces (see `src/slotscribe/index.ts`).
- Quotes: single quotes in TS/TSX.
- Naming: `PascalCase` for React components, `camelCase` for variables/functions, `kebab-case` for route folders under `app/`.

## Testing Guidelines
- No formal test runner is configured.
- Use script-based checks in `scripts/test-*.ts` when validating flows.
- If you add a test framework, document the command here.

## Commit & Pull Request Guidelines
- Git history is not available in this workspace; no enforced commit convention found.
- Use concise, imperative commit subjects (e.g., ¡°Add trace uploader¡±).
- PRs should include: purpose, testing performed (`pnpm lint`, demo/verify steps), and screenshots for UI changes.

## Configuration & Secrets
- Copy `.env.example` to `.env` for local settings; never commit real keys.
- Demo scripts may generate temporary devnet keypairs; keep them out of source control.
