"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFollowUp } from "@/lib/actions/follow-ups";

interface QuickFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
}

export function QuickFollowUpDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
}: QuickFollowUpDialogProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>("call");

  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const [dueDate, setDueDate] = useState(defaultDate);
  const [dueTime, setDueTime] = useState("10:00");
  const [title, setTitle] = useState("");

  const quickOptions = [
    { label: "In 1 hour", getDate: () => {
      const d = new Date();
      d.setHours(d.getHours() + 1);
      return { date: d.toISOString().split("T")[0], time: d.toTimeString().slice(0, 5) };
    }},
    { label: "Tomorrow", getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return { date: d.toISOString().split("T")[0], time: "10:00" };
    }},
    { label: "In 3 days", getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return { date: d.toISOString().split("T")[0], time: "10:00" };
    }},
    { label: "Next week", getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return { date: d.toISOString().split("T")[0], time: "10:00" };
    }},
  ];

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await createFollowUp({
        title: title || `Follow up with ${contactName}`,
        type: type as any,
        dueDate,
        dueTime,
        contactId,
      });
      if (result.success) {
        toast.success("Follow-up reminder created");
        onOpenChange(false);
        // Reset
        setTitle("");
        setType("call");
        setDueDate(defaultDate);
        setDueTime("10:00");
      }
    } catch {
      toast.error("Failed to create reminder");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Follow up with {contactName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick pick buttons */}
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((opt) => (
              <Button
                key={opt.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  const { date, time } = opt.getDate();
                  setDueDate(date);
                  setDueTime(time);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              placeholder={`Follow up with ${contactName}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Set Reminder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
