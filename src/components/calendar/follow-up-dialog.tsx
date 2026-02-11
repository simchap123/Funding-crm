"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { createFollowUp } from "@/lib/actions/follow-ups";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
};

export function FollowUpDialog({
  open,
  onOpenChange,
  defaultDate,
  contacts,
  defaultContactId,
  lockContact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  contacts: Contact[];
  defaultContactId?: string;
  lockContact?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("reminder");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [dueTime, setDueTime] = useState("");
  const [contactId, setContactId] = useState(defaultContactId || "");
  const [loading, setLoading] = useState(false);

  // Reset form when date changes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDueDate(defaultDate);
      setTitle("");
      setDescription("");
      setType("reminder");
      setDueTime("");
      setContactId(defaultContactId || "");
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const result = await createFollowUp({
        title: title.trim(),
        description: description.trim() || undefined,
        type: type as any,
        dueDate,
        dueTime: dueTime || undefined,
        contactId: contactId || undefined,
      });

      if ("error" in result && (result as any).error) {
        toast.error((result as any).error);
        return;
      }

      toast.success("Follow-up scheduled");
      handleOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Follow-up</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call about loan status"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Time (optional)</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact</Label>
              {lockContact ? (
                <div className="flex h-9 w-full items-center rounded-md border bg-muted px-3 text-sm">
                  {(() => {
                    const c = contacts.find((c) => c.id === contactId);
                    return c ? `${c.firstName} ${c.lastName}` : "Unknown contact";
                  })()}
                </div>
              ) : (
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Scheduling..." : "Schedule"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
