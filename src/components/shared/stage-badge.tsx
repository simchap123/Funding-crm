import { cn } from "@/lib/utils";
import { STAGE_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { LeadStage } from "@/lib/db/schema/contacts";

interface StageBadgeProps {
  stage: string;
  className?: string;
}

const FALLBACK = { label: "Unknown", color: "text-gray-700", bgColor: "bg-gray-100" };

export function StageBadge({ stage, className }: StageBadgeProps) {
  const config = (stage && STAGE_CONFIG[stage as LeadStage]) || FALLBACK;

  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, "border-0", className)}
    >
      {config.label}
    </Badge>
  );
}
