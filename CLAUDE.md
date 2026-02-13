# Funding CRM

## Project Overview
Mortgage/loan CRM built with Next.js 16 + React 19 + Tailwind CSS + shadcn/ui + Drizzle ORM.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- **Database**: SQLite via `better-sqlite3` (local dev) / Turso `@libsql/client` (production)
- **ORM**: Drizzle ORM 0.45
- **Auth**: NextAuth v5 beta (Edge/Node split config)
- **Validation**: Zod 4 + react-hook-form + @hookform/resolvers v5
- **Hosting**: Vercel (deployed via Vercel CLI or dashboard)

## Environment Notes
- **No `gh` CLI installed** - use GitHub MCP tools or manual GitHub operations
- **No Vercel CLI installed** - deploy through Vercel dashboard or install first
- Windows environment (MINGW64/Git Bash)
- Node managed via nvm (v25.5.0)

## Commands
- `npm run dev` - Start dev server (Turbopack)
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - ESLint

## Database
- Local dev uses `file:local.db` (better-sqlite3)
- Production uses Turso (libsql)
- Migrations in `drizzle/` directory
- `drizzle.config.ts` for Drizzle Kit
- `scripts/seed.ts` for seeding test data

## Auth
- NextAuth v5 with Edge/Node split: `config.edge.ts` (middleware) and `config.ts` (server)
- Test user: `admin@example.com` / `password123`
- `/sign/[token]` route is public (no auth required)

## Known Type Issues
- Zod 4 `.default()` creates input/output type mismatch with `@hookform/resolvers` v5. Use `as any` cast on `zodResolver()` when needed.
- Server action return types with `{ error: string }` need `as string` cast when passed to `toast.error()`.

## Project Structure
```
src/
  app/
    (auth)/         - Login, register pages
    (dashboard)/    - All authenticated pages
    api/            - API routes (NextAuth, exports)
    sign/[token]/   - Public document signing
  components/       - UI components by module
  config/           - Site config, navigation
  hooks/            - Custom React hooks
  lib/
    actions/        - Server actions (CRUD operations)
    auth/           - NextAuth configuration
    db/             - Database connection, queries, schema
    validators/     - Zod schemas
drizzle/            - SQL migrations
scripts/            - Seed and setup scripts
```
