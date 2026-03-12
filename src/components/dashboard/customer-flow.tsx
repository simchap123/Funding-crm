"use client";

import { ArrowRight, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STAGES, type LeadStage } from "@/lib/db/schema/contacts";
import { STAGE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CustomerFlowProps {
  stageCounts: Record<string, number>;
}

const FLOW_STAGES = LEAD_STAGES.filter((s) => s !== "lost") as readonly Exclude<LeadStage, "lost">[];

export function CustomerFlow({ stageCounts }: CustomerFlowProps) {
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broker Deal Flow</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your lending pipeline from lead to funded
        </p>
      </CardHeader>
      <CardContent>
        {/* Desktop horizontal flow */}
        <div className="hidden lg:flex items-start gap-0 overflow-x-auto pb-2">
          {FLOW_STAGES.map((stage, i) => {
            const config = STAGE_CONFIG[stage];
            const count = stageCounts[stage] || 0;

            return (
              <div key={stage} className="flex items-start">
                <div className="flex flex-col items-center text-center min-w-[110px]">
                  <div
                    className={cn(
                      "flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold mb-2 border-2",
                      count > 0
                        ? `${config.bgColor} ${config.color} border-current`
                        : "bg-muted text-muted-foreground border-muted"
                    )}
                  >
                    {stage === "funded" && count > 0 ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      config.step
                    )}
                  </div>
                  <span className="text-xs font-semibold leading-tight">
                    {config.label}
                  </span>
                  <span className={cn("text-lg font-bold mt-0.5", config.color)}>
                    {count}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight max-w-[100px]">
                    {config.description}
                  </span>
                </div>
                {i < FLOW_STAGES.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-3.5 mx-0.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile vertical flow */}
        <div className="lg:hidden space-y-0">
          {FLOW_STAGES.map((stage, i) => {
            const config = STAGE_CONFIG[stage];
            const count = stageCounts[stage] || 0;

            return (
              <div key={stage}>
                <div className="flex items-center gap-3 py-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 border-2",
                      count > 0
                        ? `${config.bgColor} ${config.color} border-current`
                        : "bg-muted text-muted-foreground border-muted"
                    )}
                  >
                    {stage === "funded" && count > 0 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      config.step
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{config.label}</span>
                      <span className={cn("text-sm font-bold", config.color)}>
                        {count}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {config.description}
                    </p>
                  </div>
                </div>
                {i < FLOW_STAGES.length - 1 && (
                  <div className="ml-[18px] h-3 border-l-2 border-dashed border-muted" />
                )}
              </div>
            );
          })}
        </div>

        {/* Lost deals callout */}
        {(stageCounts["lost"] || 0) > 0 && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lost deals</span>
            <span className="font-bold text-red-600">{stageCounts["lost"]}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
