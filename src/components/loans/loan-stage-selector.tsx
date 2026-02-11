"use client";

import { toast } from "sonner";
import { LOAN_STAGES, type LoanStage } from "@/lib/db/schema/loans";
import { LOAN_STAGE_CONFIG } from "@/lib/constants";
import { updateLoanStage } from "@/lib/actions/loans";
import { cn } from "@/lib/utils";

export function LoanStageSelector({
  loanId,
  currentStage,
}: {
  loanId: string;
  currentStage: LoanStage;
}) {
  const activeStages = LOAN_STAGES.filter(
    (s) => s !== "denied" && s !== "withdrawn"
  );
  const currentIndex = (activeStages as string[]).indexOf(currentStage);

  const handleStageClick = async (stage: LoanStage) => {
    if (stage === currentStage) return;
    const result = await updateLoanStage(loanId, stage);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    toast.success(`Stage updated to ${LOAN_STAGE_CONFIG[stage].label}`);
  };

  return (
    <div className="flex flex-wrap gap-1">
      {activeStages.map((stage, i) => {
        const config = LOAN_STAGE_CONFIG[stage];
        const isActive = stage === currentStage;
        const isPast = i < currentIndex;
        const isDenied =
          currentStage === "denied" || currentStage === "withdrawn";

        return (
          <button
            key={stage}
            onClick={() => handleStageClick(stage)}
            className={cn(
              "flex-1 min-w-[100px] px-3 py-2 text-xs font-medium rounded-md border transition-colors",
              isActive && !isDenied && `${config.bgColor} ${config.color} border-current`,
              isPast && !isDenied && "bg-muted text-muted-foreground",
              !isActive && !isPast && "hover:bg-muted/50",
              isDenied && "opacity-50"
            )}
          >
            {config.label}
          </button>
        );
      })}

      {/* Special buttons for denied/withdrawn */}
      <button
        onClick={() => handleStageClick("denied")}
        className={cn(
          "px-3 py-2 text-xs font-medium rounded-md border transition-colors",
          currentStage === "denied"
            ? "bg-red-100 text-red-700 border-red-300"
            : "hover:bg-red-50 text-red-600"
        )}
      >
        Denied
      </button>
      <button
        onClick={() => handleStageClick("withdrawn")}
        className={cn(
          "px-3 py-2 text-xs font-medium rounded-md border transition-colors",
          currentStage === "withdrawn"
            ? "bg-gray-100 text-gray-700 border-gray-300"
            : "hover:bg-gray-50 text-gray-600"
        )}
      >
        Withdrawn
      </button>
    </div>
  );
}
