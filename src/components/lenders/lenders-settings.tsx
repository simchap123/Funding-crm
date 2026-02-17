"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Mail, Phone, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LenderForm } from "./lender-form";
import { deleteLender, toggleLenderActive } from "@/lib/actions/lenders";

type Lender = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  notes: string | null;
  submissionGuidelines: string | null;
  isActive: boolean;
  sortOrder: number | null;
};

interface LendersSettingsProps {
  lenders: Lender[];
}

export function LendersSettings({ lenders }: LendersSettingsProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingLender, setEditingLender] = useState<Lender | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (lender: Lender) => {
    setEditingLender(lender);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingLender(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingLender(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteLender(deleteId);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
    } else {
      toast.success("Lender deleted");
      router.refresh();
    }
    setDeleteId(null);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const result = await toggleLenderActive(id, !current);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
    } else {
      toast.success(current ? "Lender deactivated" : "Lender activated");
      router.refresh();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Lenders</CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Lender
          </Button>
        </CardHeader>
        <CardContent>
          {lenders.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">No lenders yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add lenders to submit deals for quoting
              </p>
              <Button size="sm" className="mt-4" onClick={handleAdd}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Your First Lender
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {lenders.map((lender) => (
                <div
                  key={lender.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {lender.name}
                      </span>
                      {lender.company && (
                        <span className="text-xs text-muted-foreground truncate">
                          · {lender.company}
                        </span>
                      )}
                      {!lender.isActive && (
                        <Badge variant="outline" className="text-xs py-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lender.email}
                      </span>
                      {lender.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lender.phone}
                        </span>
                      )}
                    </div>
                    {lender.submissionGuidelines && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {lender.submissionGuidelines}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        handleToggleActive(lender.id, lender.isActive)
                      }
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title={lender.isActive ? "Deactivate" : "Activate"}
                    >
                      {lender.isActive ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(lender)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteId(lender.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <LenderForm
        open={formOpen}
        onOpenChange={handleFormClose}
        lender={editingLender}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lender?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lender. Existing submission
              records will keep the lender name but lose the link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
