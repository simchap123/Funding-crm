import { DOCUMENT_STATUS_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/db/schema/documents";

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = DOCUMENT_STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} border-0`}
    >
      {config.label}
    </Badge>
  );
}
