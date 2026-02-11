# CRM Platform — Product Requirements Document

## Vision

Build a full-featured CRM platform comparable to GoHighLevel (GHL), starting with a lean MVP and scaling module by module. The platform will handle contact management, email tracking, pipeline management, automations, and eventually multi-tenant agency support.

---

## Technical Stack

### Core Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React — API routes, SSR, and frontend in one project |
| **Language** | TypeScript | Type safety across the entire codebase |
| **Database** | Turso (hosted SQLite) | Free tier, zero config, migrates to Postgres later |
| **ORM** | Drizzle ORM | Type-safe, lightweight, supports SQLite and Postgres |
| **Auth** | NextAuth.js (Auth.js v5) | Simple email/password now, OAuth/SAML later |
| **Styling** | Tailwind CSS + shadcn/ui | Clean component library, no vendor lock-in |
| **Email** | Resend (sending) + webhook ingestion | Modern email API with generous free tier |
| **Hosting** | Vercel (free tier) | Zero-config Next.js deployment |
| **File Storage** | Vercel Blob or Uploadthing | Simple file uploads for attachments |
| **Background Jobs** | Inngest or Trigger.dev | Serverless-friendly job queues for automations |
| **Real-time** | Ably or Pusher (free tier) | Live updates for pipeline boards and notifications |

### Why This Stack

- **Starts free**: Vercel free tier + Turso free tier + Resend free tier = $0/month to launch
- **Scales up**: Swap Turso → Postgres, Vercel → dedicated infra when needed
- **No throwaway code**: Drizzle schemas work across SQLite and Postgres with minimal changes
- **One deployment**: Everything lives in one Next.js project initially

---

## Database Schema (MVP — Module 1)

```
contacts
├── id              (text, primary key, cuid)
├── email           (text, unique, indexed)
├── first_name      (text)
├── last_name       (text)
├── phone           (text, nullable)
├── company         (text, nullable)
├── status          (text: lead | prospect | customer | churned)
├── source          (text: manual | email | form | api)
├── tags            (text, JSON array)
├── notes           (text, nullable)
├── created_at      (timestamp)
├── updated_at      (timestamp)

email_threads
├── id              (text, primary key)
├── contact_id      (text, foreign key → contacts)
├── subject         (text)
├── last_message_at (timestamp)
├── status          (text: open | replied | closed)
├── created_at      (timestamp)

email_messages
├── id              (text, primary key)
├── thread_id       (text, foreign key → email_threads)
├── contact_id      (text, foreign key → contacts)
├── direction       (text: inbound | outbound)
├── from_address    (text)
├── to_address      (text)
├── subject         (text)
├── body_text       (text)
├── body_html       (text, nullable)
├── raw_headers     (text, nullable, JSON)
├── message_id      (text, email Message-ID header)
├── in_reply_to     (text, nullable)
├── received_at     (timestamp)
├── created_at      (timestamp)

activities
├── id              (text, primary key)
├── contact_id      (text, foreign key → contacts)
├── type            (text: email_received | email_sent | note | status_change | tag_change)
├── description     (text)
├── metadata        (text, nullable, JSON)
├── created_at      (timestamp)
```

---

## Module Roadmap

### Phase 1 — Contacts & Email Tracking (MVP)

**Goal**: When an email comes in, automatically create or update a contact and log the interaction.

**Features**:

- Contact list with search, filter, and sort
- Contact detail page showing full activity timeline
- Inbound email webhook endpoint (receives forwarded emails or integrates with email provider)
- Auto-create contact from new email addresses
- Manual contact creation and editing
- Tagging system
- Activity feed per contact
- Simple dashboard with counts (total contacts, new today, emails today)

**Auth**: Single-user email/password login. No multi-tenancy yet.

**Pages**:

```
/                     → Dashboard (stats overview)
/contacts             → Contact list (table with search/filter)
/contacts/[id]        → Contact detail (info + activity timeline)
/settings             → Email integration setup, account settings
```

**API Routes**:

```
POST   /api/webhooks/email     → Receive inbound emails
GET    /api/contacts           → List contacts (with search/filter/pagination)
POST   /api/contacts           → Create contact
GET    /api/contacts/[id]      → Get contact with activities
PATCH  /api/contacts/[id]      → Update contact
DELETE /api/contacts/[id]      → Delete contact
GET    /api/activities         → List activities (filterable by contact)
POST   /api/activities         → Create activity (manual note)
```

---

### Phase 2 — Pipeline & Deals

- Kanban board for deal stages
- Drag-and-drop deal management
- Deal value tracking and forecasting
- Pipeline-level analytics
- Custom pipeline stages

**New Tables**: `pipelines`, `pipeline_stages`, `deals`, `deal_activities`

---

### Phase 3 — Email Sending & Templates

- Send emails directly from the CRM
- Email template builder (rich text)
- Template variables (first name, company, etc.)
- Email open/click tracking
- Scheduled sending
- Bulk email with rate limiting

**New Tables**: `email_templates`, `email_sends`, `email_events`

---

### Phase 4 — Automations & Workflows

- Visual workflow builder
- Triggers: new contact, email received, deal stage change, tag added
- Actions: send email, add tag, change status, move deal, wait/delay, notify
- Conditional branching (if/else)
- Workflow templates library

**New Tables**: `workflows`, `workflow_steps`, `workflow_runs`, `workflow_logs`

---

### Phase 5 — Calendar & Appointments

- Booking page (public link, like Calendly)
- Calendar sync (Google Calendar)
- Appointment types with custom duration/buffer
- Automated reminders
- Calendar view within CRM

**New Tables**: `appointment_types`, `appointments`, `availability_rules`

---

### Phase 6 — Forms & Landing Pages

- Drag-and-drop form builder
- Embeddable forms (iframe or JS snippet)
- Form submissions → auto-create contacts
- Basic landing page builder
- A/B testing for forms

**New Tables**: `forms`, `form_fields`, `form_submissions`, `landing_pages`

---

### Phase 7 — Multi-Tenant (Agency Mode)

- Organization/workspace model
- Role-based access control (owner, admin, member)
- Sub-accounts (like GHL)
- White-labeling (custom domain, logo)
- Billing per workspace (Stripe integration)
- API keys per workspace

**New Tables**: `organizations`, `memberships`, `roles`, `api_keys`, `billing`

---

## Project Structure

```
crm/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx          # Contact list
│   │   │   │   └── [id]/page.tsx     # Contact detail
│   │   │   ├── pipeline/page.tsx     # Phase 2
│   │   │   ├── emails/page.tsx       # Phase 3
│   │   │   ├── automations/page.tsx  # Phase 4
│   │   │   ├── calendar/page.tsx     # Phase 5
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── email/route.ts
│   │   │   ├── contacts/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   └── activities/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── contacts/
│   │   │   ├── contact-table.tsx
│   │   │   ├── contact-form.tsx
│   │   │   └── activity-timeline.tsx
│   │   ├── dashboard/
│   │   │   └── stats-cards.tsx
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   ├── db/
│   │   ├── index.ts                  # Drizzle client
│   │   ├── schema.ts                 # All table definitions
│   │   └── migrations/
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── email.ts                  # Email parsing utilities
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

---

## Key Technical Decisions

### Email Ingestion Strategy

**Option A — Forwarding (Simplest)**:
Set up email forwarding from your inbox to a webhook URL. Every forwarded email hits `/api/webhooks/email`, gets parsed, and logged.

**Option B — IMAP Polling (More Control)**:
Background job polls your inbox via IMAP every N minutes. More reliable but needs a job runner.

**Option C — Provider Webhooks (Best)**:
Use a transactional email provider (Resend, Postmark, SendGrid) that provides inbound webhooks. Best deliverability and parsing.

**Recommendation**: Start with Option A or C for MVP.

### Authentication Evolution

| Phase | Auth Method |
|-------|------------|
| MVP | Email/password (single user) |
| Phase 2-3 | Add magic link login |
| Phase 4-6 | Add Google OAuth |
| Phase 7 | SAML/SSO for enterprise, role-based access |

### Scaling Path

| Trigger | Action |
|---------|--------|
| > 10k contacts | Migrate Turso → Postgres (Neon or Supabase) |
| > 100 req/sec | Move off Vercel → Railway or dedicated VPS |
| Multi-tenant | Add connection pooling (PgBouncer) |
| Heavy automations | Dedicated job worker (Trigger.dev self-hosted) |

---

## MVP Success Criteria

- [ ] New inbound email automatically creates a contact if not exists
- [ ] All emails from a contact are threaded and visible on their profile
- [ ] Contacts searchable by name, email, company, tags
- [ ] Activity timeline shows complete interaction history
- [ ] Dashboard shows today's stats at a glance
- [ ] Auth protects all routes (single user)
- [ ] Deployed and accessible via public URL

---

## Non-Functional Requirements

- **Performance**: Contact list loads < 200ms for up to 10k contacts
- **Security**: All API routes authenticated, webhook endpoint validated with signature
- **Data**: Daily SQLite backup via Turso (automatic)
- **Mobile**: Responsive design, usable on phone for quick lookups
- **Accessibility**: Keyboard navigable, proper ARIA labels on interactive elements
