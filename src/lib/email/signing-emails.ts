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
