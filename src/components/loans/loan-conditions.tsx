"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addLoanCondition,
  updateConditionStatus,
} from "@/lib/actions/loans";
import type { LoanCondition } from "@/lib/types";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-700",
  },
  received: {
    label: "Received",
    icon: AlertCircle,
    color: "bg-blue-100 text-blue-700",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700",
  },
  waived: {
    label: "Waived",
    icon: XCircle,
    color: "bg-gray-100 text-gray-700",
  },
};

export function LoanConditions({
  loanId,
  conditions,
}: {
  loanId: string;
  conditions: LoanCondition[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleAdd = async () => {
    if (!title.trim()) return;
    const result = await addLoanCondition({
      loanId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
    });
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    toast.success("Condition added");
    setTitle("");
    setDescription("");
    setDueDate("");
    setOpen(false);
  };

  const handleStatusChange = async (
    id: string,
    status: "pending" | "received" | "approved" | "waived"
  ) => {
    const result = await updateConditionStatus(id, status);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    toast.success("Condition updated");
  };

  const pending = conditions.filter(
    (c) => c.status === "pending" || c.status === "received"
  );
  const cleared = conditions.filter(
    (c) => c.status === "approved" || c.status === "waived"
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Conditions ({pending.length} outstanding)
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Condition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Condition title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <Button onClick={handleAdd} className="w-full">
                Add Condition
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No conditions yet
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((condition) => {
              const statusConfig =
                STATUS_CONFIG[condition.status as keyof typeof STATUS_CONFIG];
              const Icon = statusConfig.icon;
              return (
                <div
                  key={condition.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{condition.title}</p>
                    {condition.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {condition.description}
                      </p>
                    )}
                    {condition.dueDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(new Date(condition.dueDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <Select
                    value={condition.status}
                    onValueChange={(val) =>
                      handleStatusChange(condition.id, val as any)
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="waived">Waived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            {cleared.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                  Cleared
                </p>
                {cleared.map((condition) => (
                  <div
                    key={condition.id}
                    className="flex items-center gap-3 p-3 rounded-lg border opacity-60"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm line-through">
                        {condition.title}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {condition.status}
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
