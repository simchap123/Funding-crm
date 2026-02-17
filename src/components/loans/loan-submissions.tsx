"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveQuote } from "@/lib/actions/submissions";
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/db/schema/lenders";

type Quote = {
  id: string;
  lenderName: string;
  status: QuoteStatus;
  rate: number | null;
  points: number | null;
  fees: number | null;
  loanAmount: number | null;
  termMonths: number | null;
  notes: string | null;
  receivedAt: string | null;
};

type Submission = {
  id: string;
  subject: string | null;
  sentAt: string | null;
  createdAt: string;
  lenderIds: string;
  quotes: Quote[];
};

interface LoanSubmissionsProps {
  submissions: Submission[];
}

const statusConfig: Record<
  QuoteStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-yellow-600 bg-yellow-50 border-yellow-200",
  },
  received: {
    label: "Received",
    icon: CheckCircle,
    className: "text-green-600 bg-green-50 border-green-200",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    className: "text-red-600 bg-red-50 border-red-200",
  },
};

function QuoteRow({ quote }: { quote: Quote }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: quote.status as QuoteStatus,
    rate: quote.rate?.toString() || "",
    points: quote.points?.toString() || "",
    fees: quote.fees?.toString() || "",
    loanAmount: quote.loanAmount?.toString() || "",
    termMonths: quote.termMonths?.toString() || "",
    notes: quote.notes || "",
  });

  const cfg = statusConfig[quote.status];
  const Icon = cfg.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveQuote(quote.id, {
        status: form.status,
        rate: form.rate ? parseFloat(form.rate) : null,
        points: form.points ? parseFloat(form.points) : null,
        fees: form.fees ? parseFloat(form.fees) : null,
        loanAmount: form.loanAmount ? parseFloat(form.loanAmount) : null,
        termMonths: form.termMonths ? parseInt(form.termMonths) : null,
        notes: form.notes || null,
      });
      if ("error" in result && result.error) {
        toast.error(result.error as string);
      } else {
        toast.success("Quote saved");
        setExpanded(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 text-sm font-medium">{quote.lenderName}</span>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full border flex items-center gap-1",
            cfg.className
          )}
        >
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
        {quote.rate && (
          <span className="text-sm font-semibold text-green-700">
            {quote.rate}%
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as QuoteStatus })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rate (%)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                step="0.001"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                placeholder="6.875"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                step="0.125"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                placeholder="0.5"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fees ($)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={form.fees}
                onChange={(e) => setForm({ ...form, fees: e.target.value })}
                placeholder="2500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Loan Amount ($)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={form.loanAmount}
                onChange={(e) =>
                  setForm({ ...form, loanAmount: e.target.value })
                }
                placeholder="500000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Term (months)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={form.termMonths}
                onChange={(e) =>
                  setForm({ ...form, termMonths: e.target.value })
                }
                placeholder="360"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              className="text-xs"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Lender notes, conditions, etc."
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Quote"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState(false);

  const lenderCount = submission.quotes.length;
  const receivedCount = submission.quotes.filter(
    (q) => q.status === "received"
  ).length;
  const pendingCount = submission.quotes.filter(
    (q) => q.status === "pending"
  ).length;

  // Best rate from received quotes
  const receivedQuotes = submission.quotes.filter(
    (q) => q.status === "received" && q.rate
  );
  const bestQuote =
    receivedQuotes.length > 0
      ? receivedQuotes.reduce((best, q) =>
          (q.rate ?? 999) < (best.rate ?? 999) ? q : best
        )
      : null;

  const sentDate = submission.sentAt || submission.createdAt;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            Sent to {lenderCount} lender{lenderCount !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(sentDate), "MMM d, yyyy 'at' h:mm a")}
            {submission.subject && (
              <span className="ml-2 text-muted-foreground/60">
                · {submission.subject}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bestQuote && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-700">
              <TrendingDown className="h-3.5 w-3.5" />
              Best: {bestQuote.rate}% from {bestQuote.lenderName}
            </span>
          )}
          <Badge variant="outline" className="text-xs">
            {receivedCount} received · {pendingCount} pending
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="border-t">
          {submission.quotes.map((quote) => (
            <QuoteRow key={quote.id} quote={quote} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LoanSubmissions({ submissions }: LoanSubmissionsProps) {
  if (submissions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lender Submissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.map((submission) => (
          <SubmissionRow key={submission.id} submission={submission} />
        ))}
      </CardContent>
    </Card>
  );
}
