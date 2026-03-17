import { SigningPage } from "@/components/documents/signing-page";
import { getDocumentByToken } from "@/lib/db/queries/documents";
import {
  FileX2,
  Ban,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SignPageProps {
  params: Promise<{ token: string }>;
}

function StatusPage({
  icon: Icon,
  iconClass,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-12">
          <Icon className={`h-16 w-16 mb-4 ${iconClass}`} />
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SignPage({ params }: SignPageProps) {
  const { token } = await params;
  const recipient = await getDocumentByToken(token);

  if (!recipient) {
    return (
      <StatusPage
        icon={AlertTriangle}
        iconClass="text-yellow-500"
        title="Invalid or Expired Link"
        description="This signing link is invalid or has expired. Please contact the sender to request a new link."
      />
    );
  }

  const docStatus = recipient.document.status;

  if (docStatus === "voided") {
    return (
      <StatusPage
        icon={Ban}
        iconClass="text-red-500"
        title="Document Voided"
        description="This document has been voided by the sender. No further action is needed."
      />
    );
  }

  if (docStatus === "draft") {
    return (
      <StatusPage
        icon={FileEdit}
        iconClass="text-muted-foreground"
        title="Document Not Ready"
        description="This document hasn't been sent yet. Please wait for the sender to finalize and send it."
      />
    );
  }

  if (docStatus === "completed") {
    return (
      <StatusPage
        icon={CheckCircle2}
        iconClass="text-green-600"
        title="Document Completed"
        description="This document has been completed. All parties have signed successfully."
      />
    );
  }

  // Only allow signing for sent, viewed, or partially_signed
  if (!["sent", "viewed", "partially_signed"].includes(docStatus)) {
    return (
      <StatusPage
        icon={FileX2}
        iconClass="text-muted-foreground"
        title="Signing Unavailable"
        description="This document is not currently available for signing. Please contact the sender for more information."
      />
    );
  }

  // Build contact data for auto-fill
  const contactData = recipient.contact
    ? {
        name: `${recipient.contact.firstName} ${recipient.contact.lastName}`.trim(),
        email: recipient.contact.email || undefined,
        company: recipient.contact.company || undefined,
        title: recipient.contact.jobTitle || undefined,
      }
    : undefined;

  return <SigningPage data={recipient as any} contactData={contactData} />;
}
