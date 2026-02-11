"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDocument } from "@/lib/actions/documents";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
};

type Loan = {
  id: string;
  loanType: string;
  contactId: string;
  contact: { firstName: string; lastName: string };
};

export function NewDocumentForm({
  contacts,
  loans,
  defaultContactId,
  defaultLoanId,
  lockContact,
}: {
  contacts: Contact[];
  loans: Loan[];
  defaultContactId?: string;
  defaultLoanId?: string;
  lockContact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [contactId, setContactId] = useState(defaultContactId || "");
  const [loanId, setLoanId] = useState(defaultLoanId || "");

  // When a loan is selected, auto-select its contact
  const handleLoanChange = (value: string) => {
    setLoanId(value);
    if (value) {
      const loan = loans.find((l) => l.id === value);
      if (loan) setContactId(loan.contactId);
    }
  };

  // Filter loans by selected contact
  const filteredLoans = useMemo(() => {
    if (!contactId) return loans;
    return loans.filter((l) => l.contactId === contactId);
  }, [contactId, loans]);

  // When contact changes, clear loan if it doesn't belong to new contact
  const handleContactChange = (value: string) => {
    setContactId(value);
    if (loanId) {
      const loan = loans.find((l) => l.id === loanId);
      if (loan && loan.contactId !== value) {
        setLoanId("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const result = await createDocument({
        title: title.trim(),
        description: description.trim() || undefined,
        message: message.trim() || undefined,
        contactId: contactId || undefined,
        loanId: loanId || undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }

      toast.success("Document created");
      if ("id" in result) {
        router.push(`/documents/${result.id}`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Loan Agreement"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Contact</Label>
              {lockContact ? (
                <div className="flex h-9 w-full items-center rounded-md border bg-muted px-3 text-sm">
                  {(() => {
                    const c = contacts.find((c) => c.id === contactId);
                    return c
                      ? `${c.firstName} ${c.lastName}${c.company ? ` — ${c.company}` : ""}`
                      : "Unknown contact";
                  })()}
                </div>
              ) : (
                <Select value={contactId} onValueChange={handleContactChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                        {c.company ? ` — ${c.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Loan</Label>
              <Select value={loanId} onValueChange={handleLoanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a loan..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredLoans.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      {contactId
                        ? "No loans for this contact"
                        : "No loans available"}
                    </SelectItem>
                  ) : (
                    filteredLoans.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.loanType} — {l.contact.firstName}{" "}
                        {l.contact.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div>
            <Label>Message to recipients</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please review and sign this document..."
              rows={3}
            />
          </div>
          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Document"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
