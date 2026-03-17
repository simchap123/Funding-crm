import nodemailer from "nodemailer";
import { decrypt } from "@/lib/crypto";
import type { InferSelectModel } from "drizzle-orm";
import type { emailAccounts } from "@/lib/db/schema";

type EmailAccount = InferSelectModel<typeof emailAccounts>;

export async function sendEmailViaSMTP(
  account: EmailAccount,
  options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
    inReplyTo?: string;
  }
): Promise<{ messageId: string }> {
  if (!account.password || !account.smtpHost || !account.smtpPort) {
    throw new Error("SMTP not configured for this account");
  }

  // Port 465 = implicit TLS (secure: true)
  // Port 587 = STARTTLS (secure: false, upgrades after connect)
  const isImplicitTLS = account.smtpPort === 465;

  const transport = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: isImplicitTLS,
    auth: {
      user: account.email,
      pass: decrypt(account.password),
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
  });

  const info = await transport.sendMail({
    from: account.name
      ? `"${account.name}" <${account.email}>`
      : account.email,
    to: options.to.join(", "),
    cc: options.cc?.join(", "),
    bcc: options.bcc?.join(", "),
    subject: options.subject,
    html: options.html,
    text: options.text,
    inReplyTo: options.inReplyTo,
  });

  return { messageId: info.messageId };
}
