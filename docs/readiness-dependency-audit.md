# Readiness tooling dependency checkpoint

November 10, 2026. This changes dependency snapshots on the infrastructure PR, not deployed production resources.

## Reproduction and narrow fixes

The existing `npm audit --audit-level=high` delivery gate failed on the original snapshot, with five high and thirteen moderate findings. The ordinary `npm run check:ci` does not include that separate privileged-workflow audit, so a passing ordinary check was not reported as a security pass.

Updated existing packages without a major-version migration:

- Vite 8.2.2 to 8.3.7, including its hoisted peer copy.
- Zod 4.5.4 and the older browser-tooling transitive copy to 4.6.6.
- Puppeteer Core 25.10.0 to 25.17.0 to remove the affected Chromium BiDi dependency chain.
- Express's compatible body-parser dependency from 2.3.0 to 2.4.0 in the lockfile.

No forced audit fix, framework migration or new dependency was added. Both the workspace and hoisted dependency trees were inspected so an old Vite peer copy was not left behind.

## Results and residuals

`npm ci`, the fresh audit and `npm run check:ci` pass. Audit result: **zero high, zero critical, twelve moderate**. The same **204 canonical cases** and existing test counts remain.

Residual moderate findings are the minimatch amplification advisory inherited through ESLint/TypeScript ESLint and the existing vendored CDK package, plus address-parser advisories in the legacy backend's Nodemailer snapshot. These are recorded exceptions for this checkpoint, not a statement that every dependency is vulnerability-free. The fresh app has its own audited Nodemailer version and imports no legacy application code. The legacy application remains undeployed by this work; its mailer issue must be considered before any later legacy-runtime promotion. Do not force a tooling downgrade or replace the vendored CDK artifact to conceal an audit finding.

The exact final fresh candidate still requires its own dependency/image scan. Reaudit before privileged delivery because advisory information can change.

Primary patch context: [body-parser advisory](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828), [Vite middleware advisory](https://github.com/vitejs/vite/security/advisories/GHSA-9jrq-w75r-8gcw). Zod/BiDi affected/fixed versions and final counts are from the captured npm audit and installed dependency tree.

## Alpine image build repair

The GitHub code gate passed, but the unprivileged image build exposed an obsolete exact zlib pin. Reproduced the same failure locally against the pinned official Caddy image: its Alpine repository now resolves zlib 1.4-r0, which conflicts with exactly 1.3.2-r1. Both runtime Dockerfiles now retain the security floor `zlib>=1.3.2-r1`, allowing a newer compatible package in each base's own repository. The pinned Caddy base digest and exact-image scan gates remain in place.

The package installation succeeds in temporary, automatically removed containers for both the pinned Caddy base and Node 24 Alpine. Existing canonical accounting and factory tests pass, with no new cases. GitHub's complete image build must still pass for the new commit before merging; the earlier code-gate pass alone is insufficient. No app stack or production image was deployed.

The subsequent exact ECR scan, after build success, blocked the inherited frontend base on eighteen high and eight critical OS-package findings. Refresh the official Caddy 2.11.4 Alpine digest without changing the Caddy version, and apply Alpine security upgrades in both runtime base families. Keep the scan gate unchanged; the new exact image must pass before admission or merge. This is not a claim that the earlier successful build was vulnerability-free.
