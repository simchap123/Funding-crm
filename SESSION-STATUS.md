# CRM Session Status

## Last Updated: 2026-02-13

## Project
- **Location:** `C:\Users\SimchaPentelnik\Projects_global\crm`
- **Live URL:** https://funding-crm.vercel.app
- **Repo:** https://github.com/simchap123/Funding-crm (branch: master)
- **Stack:** Next.js 16 + Turso/SQLite + Drizzle + NextAuth v5 + shadcn/ui + Tailwind

## Login Credentials
- **Admin:** `admin@example.com` / `pentelnik2026`
- **User:** `Info@assetliftlending.com` (password unchanged from original seed)

## What Was Completed This Session

### 1. Real Email System (IMAP Sync + SMTP Send)
- **IMAP sync engine** (`src/lib/email/imap-sync.ts`) — connects to IMAP, fetches last 25 messages, deduplicates by messageId, matches senders to contacts, logs activities
- **SMTP send** (`src/lib/email/smtp-send.ts`) — real email sending via nodemailer
- **Sync API route** (`src/app/api/email/sync/route.ts`) — POST endpoint for triggering sync
- **Compose email** now actually sends via SMTP (was previously DB-only)
- **Auto-sync** on inbox page visit if >10 min since last sync (localStorage staleness check)
- **Sync button** with spinning icon, toast notifications
- **Contact matching** — inbound emails auto-link to existing contacts by email address
- **"Add as Contact"** button for emails from unknown senders
- **Unread badge** on sidebar Inbox nav item
- Packages: `imapflow`, `mailparser`, `nodemailer@^7`

### 2. Auth Lockdown
- **Registration removed entirely** — page deleted, routes blocked in middleware + edge config, server action disabled
- **Login page cleaned up** — removed "Sign in as Admin" auto-fill button, removed "Sign up" link
- **Password changed** in production Turso DB for `admin@example.com`

### 3. User Management (Admin-Only)
- **Change Password** form at `/settings/account` — any user can change their own password
- **Add User (Invite)** form at `/settings/account` — admin-only, creates users with name/email/password/role
- Server actions: `changePassword()`, `createUser()` in `src/lib/actions/auth.ts`

### 4. Inbox UI Redesign
- Compact Gmail-like rows with avatar circles (sender initials)
- Fixed-width sender column, inline stage badges + tag pills
- Hover-to-show action buttons (archive, delete, add contact)
- Smart date formatting (today→time, yesterday, etc.)
- Email detail page at `/inbox/[id]` with contact sidebar

## Current State of All Modules
| Module | Status | Notes |
|--------|--------|-------|
| Dashboard | Working | Stats + recent activity |
| Contacts | Working | Full CRUD, tags, custom fields, export |
| Pipeline | Working | Kanban drag-and-drop by stage |
| Loans | Working | Full loan tracking with conditions |
| Documents | Working | E-signatures via `/sign/[token]` (public) |
| Email Inbox | Working | Real IMAP sync + SMTP send, auto-sync |
| Calendar | Working | Follow-ups and activities |
| Settings > Tags | Working | Tag management with counts |
| Settings > Email | Working | IMAP/SMTP account config, auto-detect providers |
| Settings > Account | Working | Change password + admin invite |

## Database (Turso)
- **Production URL:** `libsql://funding-crm-simchap123.aws-us-east-2.turso.io`
- **Tables (18):** users, contacts, tags, contact_tags, notes, activities, custom_fields, follow_ups, loans, loan_activities, loan_conditions, documents, document_recipients, document_fields, document_audit_log, email_accounts, emails, email_attachments

## Known Issues / TODO
- Gmail/Google Workspace requires **App Passwords** (not regular password) when 2FA is enabled
- Vercel hobby plan: daily cron only, so auto-sync is client-side (on page visit)
- `middleware.ts` deprecation warning — Next.js 16 wants `proxy` convention (warning only, still works)
- Second user (`Info@assetliftlending.com`) password may need updating
- No "delete user" or "edit user" admin UI yet (only create)
- No email search/filter in inbox yet
- No email threading/conversation grouping yet

## Key Files Reference
```
src/lib/email/imap-sync.ts       — IMAP fetch engine
src/lib/email/smtp-send.ts       — SMTP send helper
src/app/api/email/sync/route.ts  — Sync API endpoint
src/lib/actions/auth.ts          — Login, changePassword, createUser
src/lib/actions/emails.ts        — composeEmail, createContactFromEmail, etc.
src/lib/auth/config.ts           — NextAuth config (Node, with DB)
src/lib/auth/config.edge.ts      — NextAuth config (Edge, no DB)
src/middleware.ts                 — Route protection
src/components/emails/inbox-list.tsx    — Inbox UI
src/components/emails/sync-button.tsx   — Sync + auto-sync
src/components/settings/change-password-form.tsx
src/components/settings/invite-user-form.tsx
src/app/(dashboard)/settings/account/page.tsx
```

## Latest Commit
```
7dd8dad Lock down auth, redesign inbox, add user management
```
