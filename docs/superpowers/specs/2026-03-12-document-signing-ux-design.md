# Document Signing UX Improvements

## Overview

Improve the document preparation and signing experience with auto-conversion of uploads, better page layout, resizable/draggable fields, and email-verified signing.

## 1. Auto-Convert Uploads to PDF (Client-Side)

**Problem:** Only PDF files can have fields placed on them. Non-PDF uploads (.docx, .doc) sit in the attachments list with no viewer or field support.

**Solution:** Convert non-PDF documents to PDF on the client side at upload time.

- When a file is uploaded via `handleFileUpload` in `document-detail.tsx`:
  - If `mimeType === "application/pdf"` → store as-is (current behavior)
  - If `.docx` → use `mammoth` to convert to HTML, then `jsPDF` + `html2canvas` to render HTML→PDF
  - Store the resulting PDF base64 as the attachment's `fileData` with `mimeType: "application/pdf"`
- The original filename is preserved (e.g., `Tax_Summary.docx`) but the stored data is PDF
- Unsupported file types (images, etc.) are stored as-is for download but won't have field placement

**Dependencies:** `mammoth`, `jspdf`, `html2canvas` (all client-side, no server changes)

## 2. Reorder Document Detail Page Layout

**Problem:** Recipients section is at the bottom. Users must scroll past the PDF viewer to add signers before they can place fields. This creates a confusing workflow.

**Solution:** Restructure `document-detail.tsx` card order:

1. Header card (title, status, dates) — unchanged
2. **Recipients card** — moved from bottom to second position
3. **Attachments card** — moved up, third position
4. **PDF viewer card** — now fourth, after recipients and attachments are set up
5. Audit trail — stays at the bottom

**Additional UX:**
- When document is draft and has no recipients, show a banner inside the PDF viewer card: "Add a signer above to start placing fields"
- The "Assign to..." dropdown in the PDF toolbar already requires recipients — this makes the flow obvious

## 3. Resizable and Draggable Fields

**Problem:** Fields are placed at fixed sizes and positions. Users cannot adjust them after placement.

**Solution:** Add drag-to-move and resize handles to fields in `place-fields` mode.

### Drag to Reposition
- In `place-fields` mode, fields become draggable via `mousedown` → `mousemove` → `mouseup`
- During drag, show a semi-transparent preview at the new position
- On drop, update `xPercent` and `yPercent` in the fields array
- Constrain to page boundaries (0-100% minus field dimensions)

### Resize Handles
- Show small handles at the four corners and four edges when hovering a field in `place-fields` mode
- Dragging a handle updates `widthPercent` and `heightPercent`
- Minimum size: 5% width, 3% height (prevents fields from becoming invisible)
- Maintain aspect ratio for signature fields (optional, shift-key override)

### Implementation in `pdf-viewer.tsx`
- Add `onMouseDown` handler to field overlays for drag initiation
- Track drag state: `{ dragging: boolean, resizing: boolean, handle: string, startX, startY, field }`
- Use `useEffect` for global `mousemove`/`mouseup` listeners during drag
- Compute new percentages relative to the page container dimensions
- Call `onFieldsChange` with updated positions on drag end

## 4. Fix Initials Field Click Handler

**Problem:** The initials field type doesn't open the input dialog when clicked on the signing page.

**Root cause:** The `FieldInputDialog` component needs to handle the `initials` type. Check that:
- `field-input-dialog.tsx` recognizes `initials` as a valid type
- It renders an appropriate input (text input for typed initials, or small canvas for drawn)
- The signing page's `handleFieldClick` doesn't filter out `initials`

**Fix:** Ensure `initials` type is handled in `field-input-dialog.tsx` — treat it like a small signature (canvas + text input options, but smaller default size).

## 5. Email-Verified Signing Flow

**Problem:** Anyone with the signing link can sign. No identity verification.

**Solution:** Two-step verification before granting signing access.

### Step 1: Email Confirmation (Identity Check)
- When recipient opens `/sign/[token]`, show a landing page:
  - Document title
  - "Enter your email address to continue"
  - Email input + "Continue" button
- Compare entered email against `recipient.email` (case-insensitive)
- If mismatch: show error "This email doesn't match the recipient for this document"

### Step 2: Verification Code (Proof of Access)
- On email match, generate a 6-digit numeric code
- Store code in a new `signing_verification_codes` table:
  - `id`, `recipientId`, `code`, `expiresAt` (10 minutes), `createdAt`
- Send the code to the recipient's email using the existing email infrastructure
- Show input screen: "We sent a verification code to [email]. Enter it below."
- "Resend code" link (rate-limited to 1 per 60 seconds)
- On valid code: set a session cookie/token and grant access to the signing page
- On expired/invalid code: show error with option to resend

### Database Schema Addition
```sql
CREATE TABLE signing_verification_codes (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES document_recipients(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (current_timestamp)
);
```

### Session Management
- After successful verification, set an HTTP-only cookie: `signing_session_[token]`
- Cookie contains a signed JWT with `recipientId` and `expiry` (24 hours)
- Subsequent visits to the same signing link skip verification if cookie is valid

## 6. Admin Sends Signing Links via Email

**Problem:** Currently `sendDocument` updates statuses but doesn't actually email recipients.

**Solution:** When admin clicks "Send for Signing":
- For each recipient with role `signer`:
  - Compose email with:
    - Subject: "Please sign: {document title}"
    - Body: greeting, document description/message, signing link, sender info
  - Send via the existing email infrastructure
- Show toast with count: "Sent to 2 recipients"
- Recipients with role `cc`/`viewer` get a notification email (view-only link or just FYI)

**Email template:** Simple HTML email with:
- Document title
- Optional message from sender
- "Sign Document" CTA button linking to `/sign/[token]`
- Footer with app branding

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/documents/document-detail.tsx` | Reorder cards, add conversion logic, add drag/resize, banner UX |
| `src/components/documents/pdf-viewer.tsx` | Add drag-to-move, resize handles, state management |
| `src/components/documents/field-input-dialog.tsx` | Handle `initials` type |
| `src/components/documents/signing-page.tsx` | Add email verification flow, code entry UI |
| `src/lib/actions/documents.ts` | Add verification code actions, email sending in sendDocument |
| `src/lib/db/schema/documents.ts` | Add `signing_verification_codes` table |
| `src/lib/db/schema/relations.ts` | Add relations for verification codes |
| `drizzle/` | New migration for verification codes table |
| `package.json` | Add `mammoth`, `jspdf`, `html2canvas` |

## Testing Plan

1. Upload a .docx file → verify it converts to PDF and displays in viewer
2. Place fields → verify drag to reposition works
3. Resize a signature field → verify handles work and min size enforced
4. Click initials field on signing page → verify dialog opens
5. Open signing link → verify email entry screen appears
6. Enter correct email → verify code is sent
7. Enter valid code → verify signing access granted
8. Enter wrong code → verify error shown
9. Send document as admin → verify emails received by recipients
