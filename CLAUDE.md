# Working agreement

All work starts with Cucumber. Read `packages/cucumber/features` first. Add or change the relevant application or factory behavior, including meaningful adverse cases. Implement backend and frontend steps, or explicitly justified layer no-ops. Run the relevant tests and observe failures before implementing. This sequence is a working instruction; CI does not attest to editing history.

Structured application contracts come from `@app/schemas`; infer types from Zod. Features in `@app/behaviors` are canonical. Never copy them into a second source. Every scenario/example must be represented once in both backend and frontend reports. A justified no-op is represented, not exercised. Undefined, skipped, missing or uncertain outcomes cannot pass.

Use TypeScript, strict types and the prescribed folders. No explicit any, non-null assertions, ESLint disables or TypeScript suppression directives. Large files are allowed. One production use stays local; two remain duplicated; three distinct production callers justify extraction only when all can exercise the entire same input/output behavior. Tests do not count. Same-file reuse stays in that file. Infrastructure is exempt from this reuse rule.

Backend config constructs external connections. Routes register versioned HTTP endpoints; controllers validate transport and call services. Services own business logic and data access. Middleware owns transport and identity concerns. Models re-export shared schemas. Utilities are pure and must qualify for reuse. Acceptance executes the real stack and substitutes only outbound database/provider connections.

Frontend pages own top-level layouts and local behavior. Services perform API transport and schema validation only. Shared components, context and hooks require the exact reuse rule. Auth acceptance uses the real TriCo auth domain, DynamoDB Local, Mailpit, and the real backend. Playwright supports development and CI; deployed preview verification independently evaluates canonical features.

Compose is the dependency source. CDK owns permanent infrastructure only; ordinary PR previews use dynamic scripts. CDK also owns dedicated dev and production application stacks. Never commit personal account/domain values or real credentials. `.env.example` uses generic fixtures/placeholders. Owners may change these rules; generated repositories are independent snapshots.

Read each area's paired `CLAUDE.md` / `AGENTS.md` before edits and the corresponding `.claude/skills` concept skill when present. Copies in `.agents/skills` are generated mirrors. The root coordinator owns manifest/lockfile and shared configuration changes during initial construction.

Commands are declared in root package.json. During construction an unfinished command is not a pass. Run the relevant checks, report actual results and leave known gaps explicit. The factory is complete only after clean local onboarding and the separate generated reference proves its required live lifecycle.
