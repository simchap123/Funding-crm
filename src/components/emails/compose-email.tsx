"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { composeEmail } from "@/lib/actions/emails";
import type { EmailAccount } from "@/lib/types";

type ComposeEmailProps = {
  accounts: EmailAccount[];
  children: React.ReactNode;
  replyTo?: string;
  replySubject?: string;
  replyInReplyTo?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ComposeEmail({
  accounts,
  children,
  replyTo,
  replySubject,
  replyInReplyTo,
  defaultOpen,
  onOpenChange,
}: ComposeEmailProps) {
  const [open, setOpen] = useState(defaultOpen || false);
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [to, setTo] = useState(replyTo || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(replySubject || "");
  const [body, setBody] = useState("");

  // Sync open state with parent
  useEffect(() => {
    if (defaultOpen !== undefined) {
      setOpen(defaultOpen);
    }
  }, [defaultOpen]);

  // Pre-fill fields when reply props change (e.g., dialog opened for reply)
  useEffect(() => {
    if (replyTo) setTo(replyTo);
    if (replySubject) setSubject(replySubject);
  }, [replyTo, replySubject]);

  const handleSend = async () => {
    if (!accountId || !to.trim() || !subject.trim() || !body.trim()) {
      toast.error("Fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const result = await composeEmail({
        accountId,
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        bodyHtml: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
      });

      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }

      toast.success("Email sent");
      setTo("");
      setCc("");
      setSubject("");
      setBody("");
      setOpen(false);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{replyInReplyTo ? "Reply" : "Compose Email"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {accounts.length > 1 && (
            <div>
              <Label>From</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name || a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>To *</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <Label>CC</Label>
            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
            />
          </div>

          <div>
            <Label>Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label>Message *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={8}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
