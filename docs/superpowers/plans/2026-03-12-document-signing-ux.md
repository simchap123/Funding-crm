# Document Signing UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the document signing experience with resizable/draggable fields, reordered layout, auto-convert uploads, initials fix, email-verified signing, and admin email sending.

**Architecture:** Client-side document conversion (mammoth + jspdf + html2canvas), drag/resize in the PDF viewer via pointer events, email verification via codes stored in DB and sent through existing SMTP infrastructure.

**Tech Stack:** mammoth, jspdf, html2canvas (new deps); nodemailer (existing); Drizzle ORM + SQLite/Turso (existing)

**Spec:** `docs/superpowers/specs/2026-03-12-document-signing-ux-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/documents/pdf-viewer.tsx` | PDF rendering, field overlays, drag/resize logic |
| `src/components/documents/document-detail.tsx` | Document prep page — card reorder, upload conversion, banner UX |
| `src/components/documents/field-input-dialog.tsx` | Field input modal — fix initials handling |
| `src/components/documents/signing-page.tsx` | Public signing — email verification flow |
| `src/lib/actions/documents.ts` | Server actions — verification codes, email sending on send |
| `src/lib/actions/signing.ts` | **New** — verification code generation, validation, resend |
| `src/lib/db/schema/documents.ts` | Add `signingVerificationCodes` table |
| `src/lib/db/schema/relations.ts` | Add relations for verification codes |
| `src/lib/email/signing-emails.ts` | **New** — email templates for signing links + verification codes |
| `drizzle/` | Migration for new table |

---

## Task 1: Fix Initials Field Click Handler

**Files:**
- Modify: `src/components/documents/field-input-dialog.tsx:146-173`

The `handleSubmit` function checks `field.type === "signature"` but not `"initials"`. So when an initials field is submitted, it falls through to the text branch which expects `textValue` — but the UI shows the signature canvas. The fix: treat `initials` like `signature` in submit logic.

- [ ] **Step 1: Fix handleSubmit to handle initials type**

In `src/components/documents/field-input-dialog.tsx`, change line 150:

```tsx
// Before:
if (field.type === "signature") {
// After:
if (field.type === "signature" || field.type === "initials") {
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/field-input-dialog.tsx
git commit -m "Fix initials field submit handler — treat like signature type"
```

---

## Task 2: Reorder Document Detail Page Layout

**Files:**
- Modify: `src/components/documents/document-detail.tsx`

Move the Recipients card and Attachments card above the PDF viewer. Add a banner when no recipients exist in draft mode.

- [ ] **Step 1: Reorder the JSX sections**

In `src/components/documents/document-detail.tsx`, the current card order in the `return` statement is:
1. Header Card (~line 362-446)
2. PDF Viewer Card (~line 448-524)
3. Attachments Card (~line 526-610)
4. Recipients Card (~line 612-736)
5. Audit Trail (~line 738-796)

Cut and paste to reorder to:
1. Header Card (unchanged)
2. **Recipients Card** (moved from position 4)
3. **Attachments Card** (moved from position 3)
4. **PDF Viewer Card** (moved from position 2)
5. Audit Trail (unchanged)

- [ ] **Step 2: Add "add signer" banner in PDF viewer section**

Inside the PDF viewer card, before the `<Suspense>` block, add a conditional banner when draft has no recipients:

```tsx
{isDraft && doc.recipients.length === 0 && (
  <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/30">
    <p className="text-muted-foreground text-center">
      Add a signer above to start placing fields on the document.
    </p>
  </div>
)}
```

Only render the `<Suspense>/<PdfViewer>` when `doc.recipients.length > 0` OR `!isDraft`.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/document-detail.tsx
git commit -m "Reorder document detail layout — recipients and attachments above PDF viewer"
```

---

## Task 3: Resizable and Draggable Fields

**Files:**
- Modify: `src/components/documents/pdf-viewer.tsx`

Add drag-to-move and corner-resize handles to fields in `place-fields` mode.

- [ ] **Step 1: Add drag/resize state**

At the top of the `PdfViewer` component, add state for tracking drag and resize operations:

```tsx
const [dragState, setDragState] = useState<{
  type: "move" | "resize";
  fieldIndex: number;
  handle?: string; // "nw" | "ne" | "sw" | "se"
  startX: number;
  startY: number;
  startField: FieldPlacement;
} | null>(null);
```

- [ ] **Step 2: Add mousedown handlers for move and resize**

For each field overlay in `place-fields` mode, add:
- `onMouseDown` on the field div itself (for move)
- Four corner handle divs with `onMouseDown` (for resize)

```tsx
// Move handler — on the field div itself
onMouseDown={(e) => {
  if (mode !== "place-fields") return;
  e.preventDefault();
  e.stopPropagation();
  const idx = fields.findIndex(
    (f) => (f.id && f.id === field.id) || (f.tempId && f.tempId === field.tempId)
  );
  setDragState({
    type: "move",
    fieldIndex: idx,
    startX: e.clientX,
    startY: e.clientY,
    startField: { ...field },
  });
}}
```

For resize corners, add four small div handles inside each field overlay (visible on hover in place-fields mode):

```tsx
{mode === "place-fields" && ["nw", "ne", "sw", "se"].map((handle) => (
  <div
    key={handle}
    className={cn(
      "absolute w-3 h-3 bg-primary border border-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
      handle === "nw" && "-top-1.5 -left-1.5 cursor-nw-resize",
      handle === "ne" && "-top-1.5 -right-1.5 cursor-ne-resize",
      handle === "sw" && "-bottom-1.5 -left-1.5 cursor-sw-resize",
      handle === "se" && "-bottom-1.5 -right-1.5 cursor-se-resize",
    )}
    onMouseDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = fields.findIndex(
        (f) => (f.id && f.id === field.id) || (f.tempId && f.tempId === field.tempId)
      );
      setDragState({
        type: "resize",
        fieldIndex: idx,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startField: { ...field },
      });
    }}
  />
))}
```

- [ ] **Step 3: Add global mousemove/mouseup listeners**

Add a `useEffect` that attaches `mousemove` and `mouseup` to `document` when `dragState` is active:

```tsx
useEffect(() => {
  if (!dragState || !pageRef.current || !onFieldsChange) return;

  const pageEl = pageRef.current;
  const rect = pageEl.getBoundingClientRect();

  const handleMouseMove = (e: MouseEvent) => {
    const dxPercent = ((e.clientX - dragState.startX) / rect.width) * 100;
    const dyPercent = ((e.clientY - dragState.startY) / rect.height) * 100;
    const sf = dragState.startField;

    const updated = [...fields];

    if (dragState.type === "move") {
      updated[dragState.fieldIndex] = {
        ...sf,
        xPercent: Math.max(0, Math.min(100 - sf.widthPercent, sf.xPercent + dxPercent)),
        yPercent: Math.max(0, Math.min(100 - sf.heightPercent, sf.yPercent + dyPercent)),
      };
    } else if (dragState.type === "resize" && dragState.handle) {
      let newX = sf.xPercent;
      let newY = sf.yPercent;
      let newW = sf.widthPercent;
      let newH = sf.heightPercent;

      if (dragState.handle.includes("e")) newW = Math.max(5, sf.widthPercent + dxPercent);
      if (dragState.handle.includes("w")) {
        newW = Math.max(5, sf.widthPercent - dxPercent);
        newX = sf.xPercent + dxPercent;
      }
      if (dragState.handle.includes("s")) newH = Math.max(3, sf.heightPercent + dyPercent);
      if (dragState.handle.includes("n")) {
        newH = Math.max(3, sf.heightPercent - dyPercent);
        newY = sf.yPercent + dyPercent;
      }

      updated[dragState.fieldIndex] = {
        ...sf,
        xPercent: Math.max(0, newX),
        yPercent: Math.max(0, newY),
        widthPercent: newW,
        heightPercent: newH,
      };
    }

    onFieldsChange(updated);
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  return () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, [dragState, fields, onFieldsChange]);
```

- [ ] **Step 4: Prevent handlePageClick during drag**

At the top of `handlePageClick`, add:
```tsx
if (dragState) return;
```

- [ ] **Step 5: Verify build passes**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/pdf-viewer.tsx
git commit -m "Add drag-to-move and corner-resize handles for document fields"
```

---

## Task 4: Auto-Convert Uploads to PDF (Client-Side)

**Files:**
- Modify: `src/components/documents/document-detail.tsx`
- Modify: `package.json` (add deps)
- Create: `src/lib/convert-to-pdf.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install mammoth jspdf html2canvas
```

- [ ] **Step 2: Create conversion utility**

Create `src/lib/convert-to-pdf.ts`:

```tsx
import mammoth from "mammoth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function convertDocxToPdfBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // Create a hidden container to render HTML
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "816px"; // 8.5in at 96dpi
  container.style.padding = "48px";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.fontSize = "12pt";
  container.style.lineHeight = "1.5";
  container.style.background = "white";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "letter");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Handle multi-page if content is taller than one page
    let yOffset = 0;
    while (yOffset < imgHeight) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -yOffset, imgWidth, imgHeight);
      yOffset += pageHeight;
    }

    const base64 = pdf.output("datauristring").split(",")[1];
    return base64;
  } finally {
    document.body.removeChild(container);
  }
}

export function isConvertibleToDoc(mimeType: string, fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop();
  return (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    ext === "docx" ||
    ext === "doc"
  );
}
```

- [ ] **Step 3: Update handleFileUpload in document-detail.tsx**

Add import at the top of `document-detail.tsx`:
```tsx
import { convertDocxToPdfBase64, isConvertibleToDoc } from "@/lib/convert-to-pdf";
```

Update `handleFileUpload` to convert non-PDF docs before storing:

```tsx
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (isConvertibleToDoc(file.type, file.name)) {
      // Convert docx/doc to PDF client-side
      try {
        toast.info(`Converting ${file.name} to PDF...`);
        const pdfBase64 = await convertDocxToPdfBase64(file);
        const result = await addAttachment({
          documentId: doc.id,
          fileName: file.name,
          fileData: pdfBase64,
          fileSize: file.size,
          mimeType: "application/pdf",
          order: (doc.attachments?.length || 0) + i + 1,
        });
        if ("error" in result && result.error) {
          toast.error(result.error as string);
        } else {
          toast.success(`${file.name} converted and uploaded`);
        }
      } catch {
        toast.error(`Failed to convert ${file.name}`);
      }
    } else {
      // PDF or other — store as-is (existing logic)
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await addAttachment({
          documentId: doc.id,
          fileName: file.name,
          fileData: base64,
          fileSize: file.size,
          mimeType: file.type,
          order: (doc.attachments?.length || 0) + i + 1,
        });
        if ("error" in result && result.error) {
          toast.error(result.error as string);
        } else {
          toast.success(`${file.name} uploaded`);
        }
      };
      reader.readAsDataURL(file);
    }
  }
  e.target.value = "";
};
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/lib/convert-to-pdf.ts src/components/documents/document-detail.tsx package.json package-lock.json
git commit -m "Auto-convert docx uploads to PDF client-side"
```

---

## Task 5: Signing Verification — Schema + Actions

**Files:**
- Modify: `src/lib/db/schema/documents.ts`
- Modify: `src/lib/db/schema/relations.ts`
- Create: `src/lib/actions/signing.ts`
- Create: `src/lib/email/signing-emails.ts`
- Run migration

- [ ] **Step 1: Add signingVerificationCodes table**

In `src/lib/db/schema/documents.ts`, add after `documentAuditLog`:

```tsx
export const signingVerificationCodes = sqliteTable("signing_verification_codes", {
  id: text("id").primaryKey(),
  recipientId: text("recipient_id")
    .notNull()
    .references(() => documentRecipients.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  expiresAt: text("expires_at").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
```

Export it from `src/lib/db/schema/index.ts` alongside other document exports.

- [ ] **Step 2: Add relations**

In `src/lib/db/schema/relations.ts`, add:

```tsx
import { signingVerificationCodes } from "./documents";

export const signingVerificationCodesRelations = relations(
  signingVerificationCodes,
  ({ one }) => ({
    recipient: one(documentRecipients, {
      fields: [signingVerificationCodes.recipientId],
      references: [documentRecipients.id],
    }),
  })
);
```

- [ ] **Step 3: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 4: Create signing email templates**

Create `src/lib/email/signing-emails.ts`:

```tsx
export function verificationCodeEmail(opts: {
  recipientName: string;
  documentTitle: string;
  code: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your verification code for "${opts.documentTitle}"`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verification Code</h2>
      <p>Hi ${opts.recipientName},</p>
      <p>Your verification code to sign <strong>"${opts.documentTitle}"</strong> is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;">
        ${opts.code}
      </div>
      <p>This code expires in 10 minutes.</p>
      <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
  const text = `Your verification code for "${opts.documentTitle}" is: ${opts.code}. It expires in 10 minutes.`;
  return { subject, html, text };
}

export function signingInviteEmail(opts: {
  recipientName: string;
  documentTitle: string;
  senderName: string;
  message?: string | null;
  signingUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Please sign: ${opts.documentTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Document Ready for Signing</h2>
      <p>Hi ${opts.recipientName},</p>
      <p><strong>${opts.senderName}</strong> has sent you <strong>"${opts.documentTitle}"</strong> for your signature.</p>
      ${opts.message ? `<p style="padding: 12px; background: #f9fafb; border-left: 3px solid #6b7280; margin: 16px 0;">${opts.message}</p>` : ""}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${opts.signingUrl}" style="display: inline-block; padding: 12px 32px; background: #1a1a2e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Sign Document
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Or copy this link: ${opts.signingUrl}</p>
    </div>
  `;
  const text = `${opts.senderName} sent you "${opts.documentTitle}" to sign. Open: ${opts.signingUrl}`;
  return { subject, html, text };
}
```

- [ ] **Step 5: Create signing actions**

Create `src/lib/actions/signing.ts`:

```tsx
"use server";

import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  documentRecipients,
  signingVerificationCodes,
  documents,
} from "@/lib/db/schema";
import { emailAccounts } from "@/lib/db/schema";
import { sendEmailViaSMTP } from "@/lib/email/smtp-send";
import { verificationCodeEmail } from "@/lib/email/signing-emails";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestVerificationCode(accessToken: string, email: string) {
  // Find recipient by token
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
    with: { document: true },
  });

  if (!recipient) return { error: "Invalid link" };

  // Check email matches (case-insensitive)
  if (recipient.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "This email doesn't match the recipient for this document" };
  }

  // Rate limit: check last code created
  const lastCode = await db.query.signingVerificationCodes.findFirst({
    where: eq(signingVerificationCodes.recipientId, recipient.id),
    orderBy: [desc(signingVerificationCodes.createdAt)],
  });

  if (lastCode) {
    const elapsed = Date.now() - new Date(lastCode.createdAt).getTime();
    if (elapsed < 60000) {
      return { error: "Please wait 60 seconds before requesting a new code" };
    }
  }

  // Generate and store code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.insert(signingVerificationCodes).values({
    id: nanoid(),
    recipientId: recipient.id,
    code,
    expiresAt,
  });

  // Send code via email — use the first active email account
  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.isActive, true),
  });

  if (account) {
    try {
      const emailContent = verificationCodeEmail({
        recipientName: recipient.name,
        documentTitle: (recipient as any).document.title,
        code,
      });
      await sendEmailViaSMTP(account, {
        to: [recipient.email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (err) {
      console.error("[CRM] Failed to send verification code email:", err);
      // Still return success — code is stored, user can try again
    }
  }

  return { success: true, email: recipient.email };
}

export async function verifyCode(accessToken: string, code: string) {
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
  });

  if (!recipient) return { error: "Invalid link" };

  // Find matching unexpired code
  const storedCode = await db.query.signingVerificationCodes.findFirst({
    where: and(
      eq(signingVerificationCodes.recipientId, recipient.id),
      eq(signingVerificationCodes.code, code),
      eq(signingVerificationCodes.verified, false)
    ),
    orderBy: [desc(signingVerificationCodes.createdAt)],
  });

  if (!storedCode) return { error: "Invalid code" };

  if (new Date(storedCode.expiresAt) < new Date()) {
    return { error: "Code has expired. Please request a new one." };
  }

  // Mark as verified
  await db
    .update(signingVerificationCodes)
    .set({ verified: true })
    .where(eq(signingVerificationCodes.id, storedCode.id));

  return { success: true, recipientId: recipient.id };
}
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/documents.ts src/lib/db/schema/relations.ts src/lib/db/schema/index.ts src/lib/actions/signing.ts src/lib/email/signing-emails.ts drizzle/
git commit -m "Add signing verification codes schema, actions, and email templates"
```

---

## Task 6: Signing Page — Email Verification UI

**Files:**
- Modify: `src/components/documents/signing-page.tsx`

Add a multi-step flow: email entry → code entry → signing.

- [ ] **Step 1: Add verification state and steps**

At the top of the `SigningPage` component, add:

```tsx
const [verificationStep, setVerificationStep] = useState<"email" | "code" | "verified">("email");
const [emailInput, setEmailInput] = useState("");
const [codeInput, setCodeInput] = useState("");
const [verifying, setVerifying] = useState(false);
const [verificationError, setVerificationError] = useState("");
const [codeSentTo, setCodeSentTo] = useState("");
```

Import the new actions:
```tsx
import { requestVerificationCode, verifyCode } from "@/lib/actions/signing";
```

- [ ] **Step 2: Add email entry handler**

```tsx
const handleEmailSubmit = async () => {
  setVerifying(true);
  setVerificationError("");
  try {
    const result = await requestVerificationCode(data.accessToken, emailInput);
    if ("error" in result && result.error) {
      setVerificationError(result.error as string);
    } else {
      setCodeSentTo(result.email || emailInput);
      setVerificationStep("code");
    }
  } catch {
    setVerificationError("Something went wrong. Please try again.");
  } finally {
    setVerifying(false);
  }
};
```

- [ ] **Step 3: Add code verification handler**

```tsx
const handleCodeSubmit = async () => {
  setVerifying(true);
  setVerificationError("");
  try {
    const result = await verifyCode(data.accessToken, codeInput);
    if ("error" in result && result.error) {
      setVerificationError(result.error as string);
    } else {
      setVerificationStep("verified");
    }
  } catch {
    setVerificationError("Something went wrong. Please try again.");
  } finally {
    setVerifying(false);
  }
};

const handleResendCode = async () => {
  setVerifying(true);
  setVerificationError("");
  try {
    const result = await requestVerificationCode(data.accessToken, emailInput);
    if ("error" in result && result.error) {
      setVerificationError(result.error as string);
    } else {
      toast.success("New code sent!");
    }
  } catch {
    setVerificationError("Failed to resend code.");
  } finally {
    setVerifying(false);
  }
};
```

- [ ] **Step 4: Render verification screens before signing UI**

Wrap the existing signing page content. Before the return with the signing UI, add:

```tsx
// Show verification screens if not yet verified
if (verificationStep === "email") {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{data.document.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your email address to verify your identity.
          </p>
          <Input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="your@email.com"
            onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
          />
          {verificationError && (
            <p className="text-sm text-destructive">{verificationError}</p>
          )}
          <Button className="w-full" onClick={handleEmailSubmit} disabled={verifying || !emailInput}>
            {verifying ? "Verifying..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

if (verificationStep === "code") {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Enter Verification Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <strong>{codeSentTo}</strong>. Enter it below.
          </p>
          <Input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="text-center text-2xl tracking-widest"
            maxLength={6}
            onKeyDown={(e) => e.key === "Enter" && codeInput.length === 6 && handleCodeSubmit()}
          />
          {verificationError && (
            <p className="text-sm text-destructive">{verificationError}</p>
          )}
          <Button className="w-full" onClick={handleCodeSubmit} disabled={verifying || codeInput.length !== 6}>
            {verifying ? "Verifying..." : "Verify"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleResendCode} disabled={verifying}>
            Resend Code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

The existing signing UI only renders when `verificationStep === "verified"`.

- [ ] **Step 5: Add Input import if missing**

Make sure `Input` is imported from `@/components/ui/input`.

- [ ] **Step 6: Verify build passes**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/components/documents/signing-page.tsx
git commit -m "Add email verification flow to signing page"
```

---

## Task 7: Admin Email Sending on Document Send

**Files:**
- Modify: `src/lib/actions/documents.ts`

When `sendDocument` is called, send signing invite emails to all recipients.

- [ ] **Step 1: Update sendDocument to send emails**

In `src/lib/actions/documents.ts`, add imports:

```tsx
import { emailAccounts } from "@/lib/db/schema";
import { sendEmailViaSMTP } from "@/lib/email/smtp-send";
import { signingInviteEmail } from "@/lib/email/signing-emails";
```

After the existing status update logic and before `revalidatePath`, add email sending:

```tsx
// Send signing invite emails
const account = await db.query.emailAccounts.findFirst({
  where: eq(emailAccounts.isActive, true),
});

if (account) {
  const session = await auth();
  const senderName = session?.user?.name || "Document Sender";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const recipient of doc.recipients) {
    try {
      const emailContent = signingInviteEmail({
        recipientName: recipient.name,
        documentTitle: doc.title,
        senderName,
        message: doc.message,
        signingUrl: `${baseUrl}/sign/${recipient.accessToken}`,
      });
      await sendEmailViaSMTP(account, {
        to: [recipient.email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (err) {
      console.error(`[CRM] Failed to email recipient ${recipient.email}:`, err);
    }
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/documents.ts
git commit -m "Send signing invite emails when document is sent for signing"
```

---

## Task 8: Final Build Verification + Push

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Push all changes**

```bash
git push origin master
```
