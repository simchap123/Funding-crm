import { cn } from "@/lib/utils";
import { STAGE_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { LeadStage } from "@/lib/db/schema/contacts";

interface StageBadgeProps {
  stage: LeadStage;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage];

  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, "border-0", className)}
    >
      {config.label}
    </Badge>
  );
}
