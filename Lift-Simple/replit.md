# Lift Simple

A friendly strength training web app for complete beginners. Helps users log workouts, track progress over time, and lift more weight gradually.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/lift-simple run dev` — run the frontend (port 25541)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Replit-managed Clerk auth

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + Wouter routing + Recharts
- Auth: Replit-managed Clerk (email/password)
- API: Express 5 with Clerk session middleware
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — DB tables: users, exercises, workouts, workout_exercises, sets
- `artifacts/api-server/src/routes/` — Express route handlers (auth, exercises, workouts, sets, progress)
- `artifacts/api-server/src/lib/auth.ts` — Clerk `requireAuth` middleware + JIT user provisioning
- `artifacts/lift-simple/src/pages/` — Frontend pages: landing, dashboard, workouts, workout-active, workout-create, workout-complete, exercises, progress, settings, not-found

## Architecture decisions

- Clerk handles all browser auth (sessions via cookies, no Bearer tokens on web)
- Local `users` table maps Clerk IDs to app users (JIT provisioned on first API call)
- 1RM estimated using Epley formula: `weight × (1 + reps/30)`, labeled "estimate" in UI
- Free plan: progress shows last 7 days only; premium: all time + range picker
- Subscription toggle is a demo feature in Settings (no real payment integration)
- `format: date` in OpenAPI generates `zod.coerce.date()` — always convert to string with `toDateStr()` before DB inserts

## Product

- Landing page for unauthenticated users → sign up/sign in via Clerk
- Dashboard: primary "Start a Workout" CTA, recent workouts, top exercise PRs
- Workout logging: add exercises, log sets (weight + reps), see "Last time" reference sets
- Exercise library: 10 starter exercises + user-created custom exercises
- Progress charts: estimated 1RM trends per exercise (Recharts)
- Encouraging post-workout summary with personal record highlights
- Freemium: free = last week, premium = all time (demo toggle in Settings)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `format: date` in OpenAPI spec generates `zod.coerce.date()` (returns JS `Date`, not string). Use `toDateStr()` helper in route handlers before inserting into `date` columns.
- Clerk proxy middleware must be mounted BEFORE `express.json()` in `app.ts`
- Clerk dev key warning in browser console is expected and harmless
- The `VITE_CLERK_PROXY_URL` env var is intentionally empty in dev — do not gate it on NODE_ENV

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for auth customization and troubleshooting
