"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createLender, updateLender } from "@/lib/actions/lenders";
import { useRouter } from "next/navigation";

type Lender = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  notes: string | null;
  submissionGuidelines: string | null;
};

interface LenderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lender?: Lender | null;
}

export function LenderForm({ open, onOpenChange, lender }: LenderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: lender?.name || "",
    email: lender?.email || "",
    company: lender?.company || "",
    phone: lender?.phone || "",
    notes: lender?.notes || "",
    submissionGuidelines: lender?.submissionGuidelines || "",
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setForm({
        name: "",
        email: "",
        company: "",
        phone: "",
        notes: "",
        submissionGuidelines: "",
      });
    } else if (lender) {
      setForm({
        name: lender.name,
        email: lender.email,
        company: lender.company || "",
        phone: lender.phone || "",
        notes: lender.notes || "",
        submissionGuidelines: lender.submissionGuidelines || "",
      });
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }

    setLoading(true);
    try {
      const result = lender
        ? await updateLender(lender.id, form)
        : await createLender(form);

      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }

      toast.success(lender ? "Lender updated" : "Lender added");
      onOpenChange(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lender ? "Edit Lender" : "Add Lender"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lender-name">Name *</Label>
              <Input
                id="lender-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lender-email">Email *</Label>
              <Input
                id="lender-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@bank.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lender-company">Company</Label>
              <Input
                id="lender-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="First National Bank"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lender-phone">Phone</Label>
              <Input
                id="lender-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lender-guidelines">Submission Guidelines</Label>
            <Textarea
              id="lender-guidelines"
              value={form.submissionGuidelines}
              onChange={(e) =>
                setForm({ ...form, submissionGuidelines: e.target.value })
              }
              placeholder="Min credit score 680, max DTI 45%..."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lender-notes">Notes</Label>
            <Textarea
              id="lender-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes about this lender..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : lender ? "Update" : "Add Lender"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
