"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteContact } from "@/lib/actions/contacts";

interface ContactDeleteButtonProps {
  contactId: string;
}

export function ContactDeleteButton({ contactId }: ContactDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    const result = await deleteContact(contactId);
    if (result.success) {
      toast.success("Contact deleted");
      router.push("/contacts");
    }
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
