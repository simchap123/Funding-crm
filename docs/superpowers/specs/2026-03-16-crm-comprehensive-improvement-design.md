# CRM Comprehensive Improvement — Design Spec

## Overview
Fix and improve the core CRM experience: email inbox redesign, reset password, pipeline stage interactivity, document/signing flow, and lead-to-close navigation.

## Workstream 1: Email Inbox Redesign (Hybrid CRM-first)

### Current Problems
- Dense flat layout, no visual hierarchy
- Snippet text overflows right edge
- "New Lead" badges clutter email rows
- No read/unread visual distinction
- Tiny generic avatars
- No reply capability in email detail
- No attachment display

### Design
**Inbox List (`inbox-list.tsx`):**
- **Read/unread**: Unread rows get `font-semibold` text + `border-l-2 border-primary` left accent
- **Better hierarchy**: Sender name bold, subject normal weight, snippet `text-muted-foreground text-sm` with `truncate`
- **Proper truncation**: Subject and snippet use `truncate` class, max-width constrained
- **Cleaner badges**: Replace large "New Lead" badge with small colored dot matching contact stage
- **Row spacing**: `py-3 px-4` padding, `hover:bg-muted/50` background
- **Avatar**: Colored circle based on sender initial, consistent sizing `h-9 w-9`
- **Date column**: Right-aligned, `text-xs text-muted-foreground`, relative format

**Email Detail (`email-detail.tsx`):**
- Show attachments list if present (icon + filename + size)
- Add Reply button that opens compose dialog pre-filled with `inReplyTo`
- Better HTML email rendering with responsive iframe

**Compose (`compose-email.tsx`):**
- Support `inReplyTo` prop for reply threading
- Pre-fill To/Subject when replying

## Workstream 2: Reset Password

### Design
- Add "Forgot password?" link on login page
- Admin reset: In Settings > Account, add "Reset Password" button per user row
- Server action `resetUserPassword(userId)` sets password to random 8-char string, returns it
- Show the new password in a dialog so admin can share it
- Also add "Change Password" form in Settings > Account for self-service

## Workstream 3: Pipeline Stage Buttons with Counts

### Current State
Dashboard already shows Broker Deal Flow with stage counts. Pipeline page has Kanban view.

### Design
- Make each stage card in Broker Deal Flow **clickable** → navigates to `/contacts?stage={stageName}`
- Add `cursor-pointer hover:shadow-md transition-shadow` to stage cards
- Contacts page already supports `?stage=` filter parameter
- Pipeline Summary percentage bars also clickable → same navigation

## Workstream 4: Document & Signing Flow Polish

### Design
- **Document detail**: Add "Back to Loan" button when `doc.loanId` exists
- **Recipient picker**: When adding recipient, show autocomplete from contacts list
- **Signing page**: SMTP fix already deployed (STARTTLS + prefer working account)
- **Audit log**: Ensure it's visible — add scroll-to if needed

## Workstream 5: Lead-to-Close Navigation

### Design
- Ensure all navigation links work bidirectionally:
  - Contact ↔ Loan (both directions)
  - Loan ↔ Document (both directions)
  - Document → Signing → Completion
- Add "View Loan" link on contact detail if loans exist
- Add "View Contact" breadcrumb on document detail
- Stage changes logged in activity feed with from/to metadata
