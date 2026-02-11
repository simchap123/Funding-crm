"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STAGES, type LeadStage } from "@/lib/db/schema/contacts";
import { STAGE_CONFIG } from "@/lib/constants";
import type { Tag } from "@/lib/types";

interface ContactsToolbarProps {
  tags: Tag[];
  selectedCount: number;
  onBulkDelete: () => void;
}

export function ContactsToolbar({
  tags,
  selectedCount,
  onBulkDelete,
}: ContactsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") || "";
  const stage = searchParams.get("stage") || "";
  const tag = searchParams.get("tag") || "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasFilters = q || stage || tag;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            defaultValue={q}
            onChange={(e) => {
              const timeout = setTimeout(() => {
                updateParams("q", e.target.value);
              }, 300);
              return () => clearTimeout(timeout);
            }}
          />
        </div>
        <Select
          value={stage}
          onValueChange={(value) => updateParams("stage", value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tag}
          onValueChange={(value) => updateParams("tag", value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
      {selectedCount > 0 && (
        <Button variant="destructive" size="sm" onClick={onBulkDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {selectedCount}
        </Button>
      )}
    </div>
  );
}
