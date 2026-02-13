"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const LAST_SYNC_KEY = "crm-inbox-last-sync";

export function SyncButton({ accountIds }: { accountIds: string[] }) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const hasAutoSynced = useRef(false);

  const doSync = async (silent = false) => {
    if (syncing) return;
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
          totalErrors.push(`Sync failed: ${res.statusText}`);
          continue;
        }

        const data = await res.json();
        for (const result of Object.values(data.results) as any[]) {
          totalSynced += result.synced;
          totalErrors.push(...result.errors);
        }
      }

      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

      if (!silent) {
        if (totalErrors.length > 0) {
          toast.error(`Sync errors: ${totalErrors[0]}`);
        } else if (totalSynced === 0) {
          toast.info("No new emails");
        } else {
          toast.success(`Synced ${totalSynced} new email${totalSynced === 1 ? "" : "s"}`);
        }
      } else if (totalSynced > 0) {
        toast.success(`Synced ${totalSynced} new email${totalSynced === 1 ? "" : "s"}`);
      }

      router.refresh();
    } catch {
      if (!silent) toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync on page load if stale (> 10 min since last sync)
  useEffect(() => {
    if (hasAutoSynced.current || accountIds.length === 0) return;
    hasAutoSynced.current = true;

    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    const elapsed = lastSync ? Date.now() - parseInt(lastSync, 10) : Infinity;

    if (elapsed > AUTO_SYNC_INTERVAL_MS) {
      doSync(true);
    }
  }, [accountIds]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => doSync(false)}
      disabled={syncing}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing..." : "Sync"}
    </Button>
  );
}
