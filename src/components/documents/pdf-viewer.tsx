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
  highlightFieldId?: string | null;
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
  highlightFieldId,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: "move" | "resize";
    fieldIndex: number;
    handle?: string; // "nw" | "ne" | "sw" | "se"
    startX: number;
    startY: number;
    startField: FieldPlacement;
  } | null>(null);

  const pdfData = `data:application/pdf;base64,${fileData}`;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  // Handle clicking on PDF page to place a field
  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragState) return;
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
    [dragState, mode, activeFieldType, currentPage, fields, onFieldsChange, recipientId]
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

  useEffect(() => {
    if (!dragState || !pageRef.current || !onFieldsChange) return;

    const pageEl = pageRef.current;
    const rect = pageEl.getBoundingClientRect();

    const handleMouseMove = (e: MouseEvent) => {
      const dxPercent = ((e.clientX - dragState.startX) / rect.width) * 100;
      const dyPercent = ((e.clientY - dragState.startY) / rect.height) * 100;
      const sf = dragState.startField;

      const updated = [...fields];

      if (dragState.type === "move") {
        updated[dragState.fieldIndex] = {
          ...sf,
          xPercent: Math.max(0, Math.min(100 - sf.widthPercent, sf.xPercent + dxPercent)),
          yPercent: Math.max(0, Math.min(100 - sf.heightPercent, sf.yPercent + dyPercent)),
        };
      } else if (dragState.type === "resize" && dragState.handle) {
        let newX = sf.xPercent;
        let newY = sf.yPercent;
        let newW = sf.widthPercent;
        let newH = sf.heightPercent;

        if (dragState.handle.includes("e")) newW = Math.max(5, sf.widthPercent + dxPercent);
        if (dragState.handle.includes("w")) {
          newW = Math.max(5, sf.widthPercent - dxPercent);
          newX = sf.xPercent + dxPercent;
        }
        if (dragState.handle.includes("s")) newH = Math.max(3, sf.heightPercent + dyPercent);
        if (dragState.handle.includes("n")) {
          newH = Math.max(3, sf.heightPercent - dyPercent);
          newY = sf.yPercent + dyPercent;
        }

        updated[dragState.fieldIndex] = {
          ...sf,
          xPercent: Math.max(0, newX),
          yPercent: Math.max(0, newY),
          widthPercent: newW,
          heightPercent: newH,
        };
      }

      onFieldsChange(updated);
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, fields, onFieldsChange]);

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
              const isHighlighted = highlightFieldId && (field.id === highlightFieldId || field.tempId === highlightFieldId);

              return (
                <div
                  key={field.id || field.tempId || idx}
                  data-field-id={field.id || field.tempId}
                  className={cn(
                    "absolute z-10 border-2 border-dashed rounded flex items-center justify-center transition-colors group",
                    colorClass,
                    isFilled && "border-solid bg-opacity-100",
                    mode === "sign" && !isFilled && "cursor-pointer hover:brightness-95",
                    mode === "place-fields" && "cursor-move",
                    isHighlighted && "ring-4 ring-blue-400 ring-offset-2 animate-pulse border-blue-600 z-20"
                  )}
                  style={{
                    left: `${field.xPercent}%`,
                    top: `${field.yPercent}%`,
                    width: `${field.widthPercent}%`,
                    height: `${field.heightPercent}%`,
                  }}
                  onMouseDown={(e) => {
                    if (mode !== "place-fields") return;
                    e.preventDefault();
                    e.stopPropagation();
                    const fieldIdx = fields.findIndex(
                      (f) => (f.id && f.id === field.id) || (f.tempId && f.tempId === field.tempId)
                    );
                    setDragState({
                      type: "move",
                      fieldIndex: fieldIdx,
                      startX: e.clientX,
                      startY: e.clientY,
                      startField: { ...field },
                    });
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

                  {/* Resize handles in place-fields mode */}
                  {mode === "place-fields" && ["nw", "ne", "sw", "se"].map((handle) => (
                    <div
                      key={handle}
                      className={cn(
                        "absolute w-3 h-3 bg-primary border border-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
                        handle === "nw" && "-top-1.5 -left-1.5 cursor-nw-resize",
                        handle === "ne" && "-top-1.5 -right-1.5 cursor-ne-resize",
                        handle === "sw" && "-bottom-1.5 -left-1.5 cursor-sw-resize",
                        handle === "se" && "-bottom-1.5 -right-1.5 cursor-se-resize",
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fieldIdx = fields.findIndex(
                          (f) => (f.id && f.id === field.id) || (f.tempId && f.tempId === field.tempId)
                        );
                        setDragState({
                          type: "resize",
                          fieldIndex: fieldIdx,
                          handle,
                          startX: e.clientX,
                          startY: e.clientY,
                          startField: { ...field },
                        });
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
