import { notFound } from "next/navigation";
import { SigningPage } from "@/components/documents/signing-page";
import { getDocumentByToken } from "@/lib/db/queries/documents";

interface SignPageProps {
  params: Promise<{ token: string }>;
}

export default async function SignPage({ params }: SignPageProps) {
  const { token } = await params;
  const recipient = await getDocumentByToken(token);

  if (!recipient) return notFound();

  return <SigningPage data={recipient as any} />;
}
