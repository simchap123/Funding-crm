"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsvImport } from "./csv-import";

export function ContactsActions() {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setImportOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Import
      </Button>
      <a href="/api/contacts/export" download>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </a>
      <CsvImport open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
