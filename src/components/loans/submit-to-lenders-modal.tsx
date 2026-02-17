"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Building2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitToLenders } from "@/lib/actions/submissions";
import { cn } from "@/lib/utils";

type Lender = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  isActive: boolean;
};

type EmailAccount = {
  id: string;
  email: string;
  name: string | null;
};

type Loan = {
  id: string;
  loanType: string;
  amount: number | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  creditScore: number | null;
  debtToIncomeRatio: number | null;
  annualIncome: number | null;
  estimatedValue: number | null;
  downPayment: number | null;
  contact: {
    firstName: string;
    lastName: string;
  };
};

interface SubmitToLendersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  lenders: Lender[];
  accounts: EmailAccount[];
}

function buildDealSheet(loan: Loan): string {
  const borrower = `${loan.contact.firstName} ${loan.contact.lastName}`;
  const amount = loan.amount
    ? `$${loan.amount.toLocaleString()}`
    : "TBD";
  const loanType = loan.loanType.toUpperCase();
  const address = [loan.propertyAddress, loan.propertyCity, loan.propertyState]
    .filter(Boolean)
    .join(", ");
  const ltv =
    loan.amount && loan.estimatedValue
      ? `${Math.round((loan.amount / loan.estimatedValue) * 100)}%`
      : "TBD";

  return `<div style="font-family: Arial, sans-serif; max-width: 600px;">
<h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Deal Submission</h2>
<table style="width: 100%; border-collapse: collapse;">
  <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Borrower</td><td style="padding: 6px 0; font-weight: 500;">${borrower}</td></tr>
  <tr><td style="padding: 6px 0; color: #6b7280;">Loan Type</td><td style="padding: 6px 0; font-weight: 500;">${loanType}</td></tr>
  <tr><td style="padding: 6px 0; color: #6b7280;">Loan Amount</td><td style="padding: 6px 0; font-weight: 500;">${amount}</td></tr>
  ${address ? `<tr><td style="padding: 6px 0; color: #6b7280;">Property Address</td><td style="padding: 6px 0; font-weight: 500;">${address}</td></tr>` : ""}
  ${loan.estimatedValue ? `<tr><td style="padding: 6px 0; color: #6b7280;">Property Value</td><td style="padding: 6px 0; font-weight: 500;">$${loan.estimatedValue.toLocaleString()}</td></tr>` : ""}
  ${loan.downPayment ? `<tr><td style="padding: 6px 0; color: #6b7280;">Down Payment</td><td style="padding: 6px 0; font-weight: 500;">$${loan.downPayment.toLocaleString()}</td></tr>` : ""}
  <tr><td style="padding: 6px 0; color: #6b7280;">LTV</td><td style="padding: 6px 0; font-weight: 500;">${ltv}</td></tr>
  ${loan.creditScore ? `<tr><td style="padding: 6px 0; color: #6b7280;">Credit Score</td><td style="padding: 6px 0; font-weight: 500;">${loan.creditScore}</td></tr>` : ""}
  ${loan.debtToIncomeRatio ? `<tr><td style="padding: 6px 0; color: #6b7280;">DTI</td><td style="padding: 6px 0; font-weight: 500;">${loan.debtToIncomeRatio}%</td></tr>` : ""}
  ${loan.annualIncome ? `<tr><td style="padding: 6px 0; color: #6b7280;">Annual Income</td><td style="padding: 6px 0; font-weight: 500;">$${loan.annualIncome.toLocaleString()}</td></tr>` : ""}
</table>
<p style="margin-top: 16px; color: #6b7280; font-size: 14px;">Please provide your best rate quote at your earliest convenience. Thank you.</p>
</div>`;
}

export function SubmitToLendersModal({
  open,
  onOpenChange,
  loan,
  lenders,
  accounts,
}: SubmitToLendersModalProps) {
  const router = useRouter();
  const activeLenders = lenders.filter((l) => l.isActive);

  const defaultSubject = `Deal Submission: ${loan.contact.firstName} ${loan.contact.lastName} – ${loan.loanType.toUpperCase()} – ${loan.amount ? `$${loan.amount.toLocaleString()}` : "TBD"}`;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(buildDealSheet(loan));
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [loading, setLoading] = useState(false);

  const toggleLender = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === activeLenders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeLenders.map((l) => l.id)));
    }
  };

  const handleSubmit = async () => {
    if (!selectedIds.size) {
      toast.error("Select at least one lender");
      return;
    }
    if (!accountId) {
      toast.error("No email account selected");
      return;
    }

    setLoading(true);
    try {
      const result = await submitToLenders({
        loanId: loan.id,
        lenderIds: Array.from(selectedIds),
        subject,
        message,
        accountId,
      });

      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }

      toast.success(`Sent to ${selectedIds.size} lender${selectedIds.size !== 1 ? "s" : ""}`);
      onOpenChange(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const allSelected = selectedIds.size === activeLenders.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Submit to Lenders
          </DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-[220px_1fr] gap-4">
          {/* Left panel: lender checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Lenders
              </Label>
              <Badge variant="outline" className="text-xs">
                {selectedIds.size}/{activeLenders.length}
              </Badge>
            </div>

            {activeLenders.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No lenders configured.{" "}
                <a href="/settings/lenders" className="underline">
                  Add lenders
                </a>
              </div>
            ) : (
              <div className="border rounded-md divide-y overflow-hidden">
                {/* Select All */}
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
                >
                  {allSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                {activeLenders.map((lender) => (
                  <button
                    key={lender.id}
                    onClick={() => toggleLender(lender.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 w-full hover:bg-muted/50 transition-colors text-left",
                      selectedIds.has(lender.id) && "bg-primary/5"
                    )}
                  >
                    {selectedIds.has(lender.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {lender.name}
                      </div>
                      {lender.company && (
                        <div className="text-xs text-muted-foreground truncate">
                          {lender.company}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: email editor */}
          <div className="space-y-3">
            {accounts.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Send from</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name ? `${a.name} <${a.email}>` : a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Message (HTML)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={12}
                className="text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedIds.size}
          >
            <Send className="mr-2 h-4 w-4" />
            {loading
              ? "Sending..."
              : `Send to ${selectedIds.size} Lender${selectedIds.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
