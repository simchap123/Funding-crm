"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncButton({ accountIds }: { accountIds: string[] }) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    let totalSynced = 0;
    let totalErrors: string[] = [];

    try {
      for (const accountId of accountIds) {
        const res = await fetch("/api/email/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });

        if (!res.ok) {
          totalErrors.push(`Account sync failed: ${res.statusText}`);
          continue;
        }

        const data = await res.json();
        for (const result of Object.values(data.results) as any[]) {
          totalSynced += result.synced;
          totalErrors.push(...result.errors);
        }
      }

      if (totalErrors.length > 0) {
        toast.error(`Sync errors: ${totalErrors[0]}`);
      } else if (totalSynced === 0) {
        toast.info("No new emails");
      } else {
        toast.success(`Synced ${totalSynced} new email${totalSynced === 1 ? "" : "s"}`);
      }

      router.refresh();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing..." : "Sync"}
    </Button>
  );
}
