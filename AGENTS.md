# Liceum Mastery

A test-taking platform for Ukrainian schools: NMT-format tests, school / class / student roles, anti-cheat, a materials bank. It is a demo on free tiers.

Read `PRODUCT.md` before any change. It holds every settled decision: stack, roles and permissions, data model, anti-cheat, demo scope and what is deferred. A change to a decision goes into `PRODUCT.md` in the same change.

- UI text is Ukrainian. Code, comments and docs are English.
- Correct answers, the timer and scoring live on the server only. Every school-owned query filters by the session's `school_id`.

## Setup

- `cp .env.example .env` and put a Neon connection string there. Use a separate Neon branch for local dev. The `neon-http` driver talks only to Neon, not to a plain local Postgres.
- After a schema change in `src/db/schema.ts`, run `pnpm db:generate` and commit the new file in `drizzle/`. `pnpm db:migrate` applies it.
- Check with `pnpm typecheck`, `pnpm lint` and `pnpm build`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
