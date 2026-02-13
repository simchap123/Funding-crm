import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmailAccounts } from "@/lib/db/queries/emails";
import { syncEmailAccount } from "@/lib/email/imap-sync";
import type { SyncResult } from "@/lib/email/imap-sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { accountId?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — sync all accounts
  }

  const accounts = await getEmailAccounts(session.user.id);

  const toSync = body.accountId
    ? accounts.filter((a) => a.id === body.accountId)
    : accounts;

  if (toSync.length === 0) {
    return NextResponse.json({ error: "No accounts found" }, { status: 404 });
  }

  const results: Record<string, SyncResult> = {};

  // Sync accounts sequentially to stay within timeout
  for (const account of toSync) {
    results[account.id] = await syncEmailAccount(account, session.user.id);
  }

  return NextResponse.json({ results });
}
