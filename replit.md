# Synapse

Synapse turns raw team meeting notes into a focused list of actionable, domain-tagged ideas.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/synapse/src/pages/home.tsx` — the main team setup, notes, and extracted-plan flow
- `artifacts/synapse/src/index.css` — Synapse's visual language and responsive styling
- `lib/api-spec/openapi.yaml` — source of truth for the extraction request/response contract
- `artifacts/api-server/src/routes/extract-ideas.ts` — extraction transport and explicit provider error

## Architecture decisions

- Team members and notes remain local in the first version; no persistence layer is needed for this focused workflow.
- The extraction endpoint keeps the existing `extract_ideas` shape and fails explicitly when no provider is configured rather than returning fabricated ideas.
- The frontend uses generated API client types and hooks from the OpenAPI contract.

## Product

Users can add team members with domain roles, paste raw meeting notes, generate an extraction plan, and review each idea with its domain and source snippet.

## User preferences

Keep the product minimal and notes-app-like: generous whitespace, low clutter, and clear domain tags.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI contract.
- The extraction provider must be configured before Generate plan can return ideas.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
