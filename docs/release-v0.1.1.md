# Release Checklist - v0.1.1

## 1. Preconditions
- Ensure npm account is logged in and has publish permission for `slotscribe`.
- Ensure working tree is clean except intended release files.

## 2. Verify Build and Tests
```bash
pnpm -s exec tsc --noEmit
pnpm -s build:sdk
pnpm -s tsx scripts/test-trace-integrity.ts
pnpm -s tsx scripts/test-trace-no-overwrite.ts
pnpm -s tsx scripts/test-sendtx-finalize-order.ts
pnpm -s tsx scripts/test-plugin-finalize-order.ts
pnpm -s tsx scripts/test-plugin-sendraw-no-buildtrace.ts
pnpm -s tsx scripts/test-versioned-sendtx-rejected.ts
pnpm -s tsx scripts/test-plugin-versioned-sendtx-rejected.ts
pnpm -s tsx scripts/test-verify-cluster-validation.ts
```

## 3. Review Package Contents
```bash
npm pack --dry-run
```
Expected key artifacts:
- `dist/index.cjs`
- `dist/index.js`
- `dist/index.d.ts`

## 4. Version Bump
Use a patch bump for this release.
```bash
npm version patch
```
This updates `package.json` and creates a tag (e.g. `v0.1.1`).

## 5. Commit and Tag (if `npm version` was not used)
If you manually updated version/changelog, use:
```bash
git add package.json CHANGELOG.md
git commit -m "release: v0.1.1"
git tag v0.1.1
```

## 6. Publish
```bash
npm login
npm whoami
npm publish --access public
```

## 7. Post-publish Verification
```bash
npm view slotscribe version
```
Optional smoke test in clean folder:
```bash
mkdir slotscribe-smoke && cd slotscribe-smoke
npm init -y
npm i slotscribe
node -e "import('slotscribe').then(m=>console.log(Object.keys(m).slice(0,10)))"
```

## 8. Push Git Metadata
```bash
git push
git push --tags
```

## Notes
- `prepublishOnly` is already configured to run `pnpm build:sdk`.
- If publish fails due to name ownership, switch to a scoped package name.
