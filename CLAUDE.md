# DreamWallet

Personal & business finance management SaaS.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 16 (App Router) + shadcn/ui + Tailwind CSS 4 + Recharts
- **API**: tRPC v11 (end-to-end type-safe, superjson transformer)
- **Auth**: Better Auth (email/password, Google OAuth)
- **ORM**: Prisma 7 with `@prisma/adapter-pg` (adapter-based, no `url` in schema)
- **DB**: PostgreSQL 16 (Docker, port 5437)
- **Cache**: Redis 7 (Docker, port 6384)
- **Background Jobs**: BullMQ (apps/worker)
- **Billing**: YuKassa (Russia) + Stripe (international)

## Workspace Packages

| Package | Path | Description |
|---------|------|-------------|
| @dreamwallet/web | apps/web | Next.js frontend + tRPC server |
| @dreamwallet/worker | apps/worker | BullMQ job processors |
| @dreamwallet/db | packages/db | Prisma schema, client, seeds |
| @dreamwallet/shared | packages/shared | Zod schemas, types, constants |
| @dreamwallet/bank-integrations | packages/bank-integrations | Bank API providers (Tochka) |

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @dreamwallet/db db:generate

# Push schema to local DB
pnpm --filter @dreamwallet/db db:push

# Seed database
cd packages/db && npx tsx prisma/seed.ts

# Dev (do NOT start without explicit user request — uses 2-4 GB RAM)
pnpm dev

# Build
pnpm build

# Type-check
pnpm --filter @dreamwallet/web typecheck
```

## Docker

```bash
docker compose up -d    # Start PostgreSQL + Redis
docker compose down     # Stop
```

- PostgreSQL: `localhost:5437` (user: dreamwallet, db: dreamwallet)
- Redis: `localhost:6384`

## Key Architecture Decisions

- **tRPC over GraphQL**: simpler for CRUD-heavy financial operations, full type safety
- **Better Auth over Clerk**: self-hosted, no per-MAU costs, full data ownership
- **Zod 4**: used across all packages (important: `z.record(keySchema, valueSchema)` needs 2 args)
- **Prisma 7 adapter pattern**: no `url` in `schema.prisma`, connection via `prisma.config.ts`
- **Row-level isolation**: userId/projectId on every record, enforced in tRPC middleware
- **Plan limits**: PLAN_LIMITS in `packages/shared/src/constants.ts`, enforced in routers

## Gotchas

- **Prisma 7 breaking changes**: `PrismaClient` constructor requires `adapter` parameter, `prisma.config.ts` for datasource URL
- **Zod 4 vs Zod 3**: `z.record()` requires 2 args (key, value schemas). `Object.entries()` returns `unknown` values — cast with `as [string, string][]`
- **Next.js 16 `useSearchParams()`**: must be wrapped in `<Suspense>` boundary
- **Standalone output**: `next.config.ts` has `output: 'standalone'` for Docker
- **shadcn/ui**: requires `@/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
- **tw-animate-css**: CSS animation library imported in globals.css

## Environment Variables

### apps/web/.env.local
```
DATABASE_URL=postgresql://dreamwallet:dreamwallet_dev@localhost:5437/dreamwallet
BETTER_AUTH_SECRET=<random>
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
NEXT_PUBLIC_APP_URL=http://localhost:3000
YUKASSA_SHOP_ID=<optional>
YUKASSA_SECRET_KEY=<optional>
STRIPE_SECRET_KEY=<optional>
STRIPE_WEBHOOK_SECRET=<optional>
```

### apps/worker/.env
```
DATABASE_URL=postgresql://dreamwallet:dreamwallet_dev@localhost:5437/dreamwallet
REDIS_URL=redis://localhost:6384
TOCHKA_CLIENT_ID=<optional>
TOCHKA_CLIENT_SECRET=<optional>
```

### packages/db/.env
```
DATABASE_URL=postgresql://dreamwallet:dreamwallet_dev@localhost:5437/dreamwallet
```

## Deploy

- Railway (planned) — web + worker + PostgreSQL + Redis
- CI: `.github/workflows/ci.yml` (typecheck + build)
- CD: `.github/workflows/deploy.yml` (Railway deploy on push to main)
