import { LOAN_STAGE_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { LoanStage } from "@/lib/db/schema/loans";

export function LoanStageBadge({ stage }: { stage: LoanStage }) {
  const config = LOAN_STAGE_CONFIG[stage];
  return (
    <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
      {config.label}
    </Badge>
  );
}
