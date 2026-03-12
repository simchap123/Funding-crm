"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Pen,
  Calendar,
  Type,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type FieldPlacement = {
  id?: string;
  tempId?: string;
  type: "signature" | "date" | "text" | "name" | "email" | "initials";
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  label?: string;
  value?: string | null;
  filledAt?: string | null;
  recipientId?: string;
};

interface PdfViewerProps {
  fileData: string; // base64 encoded PDF
  fields?: FieldPlacement[];
  mode: "view" | "place-fields" | "sign";
  onFieldsChange?: (fields: FieldPlacement[]) => void;
  onFieldClick?: (field: FieldPlacement) => void;
  activeFieldType?: FieldPlacement["type"] | null;
  recipientId?: string;
}

const FIELD_COLORS: Record<string, string> = {
  signature: "border-blue-500 bg-blue-50/80",
  date: "border-green-500 bg-green-50/80",
  text: "border-orange-500 bg-orange-50/80",
  name: "border-purple-500 bg-purple-50/80",
  email: "border-cyan-500 bg-cyan-50/80",
  initials: "border-pink-500 bg-pink-50/80",
};

const FIELD_ICONS: Record<string, any> = {
  signature: Pen,
  date: Calendar,
  text: Type,
  name: Type,
  email: Mail,
  initials: Pen,
};

const FIELD_SIZES: Record<string, { w: number; h: number }> = {
  signature: { w: 20, h: 6 },
  date: { w: 15, h: 4 },
  text: { w: 20, h: 4 },
  name: { w: 18, h: 4 },
  email: { w: 22, h: 4 },
  initials: { w: 8, h: 5 },
};

export function PdfViewer({
  fileData,
  fields = [],
  mode,
  onFieldsChange,
  onFieldClick,
  activeFieldType,
  recipientId,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const pdfData = `data:application/pdf;base64,${fileData}`;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  // Handle clicking on PDF page to place a field
  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (mode !== "place-fields" || !activeFieldType || !onFieldsChange) return;

      const pageEl = e.currentTarget;
      const rect = pageEl.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const size = FIELD_SIZES[activeFieldType] || { w: 20, h: 5 };

      const newField: FieldPlacement = {
        tempId: `temp-${Date.now()}`,
        type: activeFieldType,
        page: currentPage,
        xPercent: Math.max(0, Math.min(100 - size.w, x - size.w / 2)),
        yPercent: Math.max(0, Math.min(100 - size.h, y - size.h / 2)),
        widthPercent: size.w,
        heightPercent: size.h,
        label: activeFieldType.charAt(0).toUpperCase() + activeFieldType.slice(1),
        recipientId,
      };

      onFieldsChange([...fields, newField]);
    },
    [mode, activeFieldType, currentPage, fields, onFieldsChange, recipientId]
  );

  const handleRemoveField = useCallback(
    (fieldToRemove: FieldPlacement) => {
      if (!onFieldsChange) return;
      onFieldsChange(
        fields.filter(
          (f) =>
            (f.id && f.id !== fieldToRemove.id) ||
            (f.tempId && f.tempId !== fieldToRemove.tempId)
        )
      );
    },
    [fields, onFieldsChange]
  );

  const pageFields = fields.filter((f) => f.page === currentPage);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2 min-w-[80px] text-center">
            Page {currentPage} of {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="overflow-auto border rounded-lg bg-gray-100 max-h-[75vh]"
      >
        <div className="flex justify-center p-4">
          <div
            ref={pageRef}
            className="relative shadow-lg"
            onClick={handlePageClick}
            style={{
              cursor:
                mode === "place-fields" && activeFieldType
                  ? "crosshair"
                  : "default",
            }}
          >
            <Document file={pdfData} onLoadSuccess={onDocumentLoadSuccess}>
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Field overlays */}
            {pageFields.map((field, idx) => {
              const FieldIcon = FIELD_ICONS[field.type] || Type;
              const isFilled = !!field.value || !!field.filledAt;
              const colorClass = FIELD_COLORS[field.type] || "border-gray-500 bg-gray-50/80";

              return (
                <div
                  key={field.id || field.tempId || idx}
                  className={cn(
                    "absolute z-10 border-2 border-dashed rounded flex items-center justify-center transition-colors group",
                    colorClass,
                    isFilled && "border-solid bg-opacity-100",
                    mode === "sign" && !isFilled && "cursor-pointer hover:brightness-95",
                    mode === "place-fields" && "cursor-move"
                  )}
                  style={{
                    left: `${field.xPercent}%`,
                    top: `${field.yPercent}%`,
                    width: `${field.widthPercent}%`,
                    height: `${field.heightPercent}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode === "sign" && !isFilled && onFieldClick) {
                      onFieldClick(field);
                    }
                  }}
                >
                  {isFilled ? (
                    field.type === "signature" && field.value?.startsWith("data:") ? (
                      <img
                        src={field.value!}
                        alt="Signature"
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-xs font-medium px-1 truncate">
                        {field.value}
                      </span>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FieldIcon className="h-3 w-3" />
                      <span>{field.label || field.type}</span>
                    </div>
                  )}

                  {/* Remove button in place-fields mode */}
                  {mode === "place-fields" && (
                    <button
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveField(field);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
