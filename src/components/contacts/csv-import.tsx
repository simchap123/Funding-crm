"use client";

import { useState, useCallback } from "react";
import { Upload, FileUp, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { importContacts } from "@/lib/actions/import";

const CRM_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Job Title" },
  { key: "stage", label: "Stage" },
  { key: "source", label: "Source" },
] as const;

interface CsvImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImport({ open, onOpenChange }: CsvImportProps) {
  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState(0);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error("CSV file is empty");
          return;
        }
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data as Record<string, string>[]);

        // Auto-map columns
        const autoMap: Record<string, string> = {};
        for (const field of CRM_FIELDS) {
          const match = headers.find(
            (h) =>
              h.toLowerCase().replace(/[_\s]/g, "") ===
              field.key.toLowerCase().replace(/[_\s]/g, "")
          );
          if (match) autoMap[field.key] = match;
        }
        setMapping(autoMap);
        setStep("map");
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  }, []);

  const handleImport = async () => {
    if (!mapping.firstName || !mapping.lastName) {
      toast.error("First Name and Last Name are required");
      return;
    }

    setStep("importing");

    const rows = csvData.map((row) => {
      const mapped: Record<string, string> = {};
      for (const [crmField, csvField] of Object.entries(mapping)) {
        if (csvField && row[csvField]) {
          mapped[crmField] = row[csvField];
        }
      }
      return mapped;
    }).filter((row) => row.firstName && row.lastName);

    const result = await importContacts(rows as any);
    if (result.success) {
      setImportedCount(result.imported);
      setStep("done");
      toast.success(`Imported ${result.imported} contacts`);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({});
    setImportedCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Upload a CSV file with your contacts.
              <br />
              First Name and Last Name columns are required.
            </p>
            <label>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button asChild>
                <span>
                  <FileUp className="mr-2 h-4 w-4" />
                  Select CSV File
                </span>
              </Button>
            </label>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {csvData.length} rows. Map your CSV columns to CRM fields:
            </p>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {CRM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <Label className="w-28 shrink-0 text-right text-sm">
                    {field.label}
                    {"required" in field && field.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || ""}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Skip --</SelectItem>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!mapping.firstName || !mapping.lastName}
              >
                Import {csvData.length} Contacts
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">Importing contacts...</p>
            <Progress value={50} className="w-64" />
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">
              {importedCount} contacts imported
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
