"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  X,
  User,
  CheckSquare,
  Building2,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type FieldPlacement = {
  id?: string;
  tempId?: string;
  type: "signature" | "date" | "text" | "name" | "email" | "initials" | "checkbox" | "company" | "title";
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
  recipientColors?: Record<string, string>; // recipientId -> color hex
  recipientData?: Record<string, { name: string; email: string }>; // recipientId -> data for previews
  highlightFieldId?: string; // field to highlight with pulse animation
}

const FIELD_COLORS: Record<string, string> = {
  signature: "border-blue-500 bg-blue-50/80",
  date: "border-green-500 bg-green-50/80",
  text: "border-orange-500 bg-orange-50/80",
  name: "border-purple-500 bg-purple-50/80",
  email: "border-cyan-500 bg-cyan-50/80",
  initials: "border-pink-500 bg-pink-50/80",
  checkbox: "border-amber-500 bg-amber-50/80",
  company: "border-indigo-500 bg-indigo-50/80",
  title: "border-teal-500 bg-teal-50/80",
};

const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  signature: Pen,
  date: Calendar,
  text: Type,
  name: User,
  email: Mail,
  initials: Pen,
  checkbox: CheckSquare,
  company: Building2,
  title: BadgeCheck,
};

const FIELD_LABELS: Record<string, string> = {
  signature: "Signature",
  date: "Date Signed",
  text: "Text",
  name: "Name",
  email: "Email",
  initials: "Initials",
  checkbox: "Checkbox",
  company: "Company",
  title: "Title",
};

const FIELD_SIZES: Record<string, { w: number; h: number }> = {
  signature: { w: 20, h: 6 },
  date: { w: 15, h: 4 },
  text: { w: 20, h: 4 },
  name: { w: 18, h: 4 },
  email: { w: 22, h: 4 },
  initials: { w: 8, h: 5 },
  checkbox: { w: 5, h: 5 },
  company: { w: 20, h: 4 },
  title: { w: 16, h: 4 },
};

/** Convert a hex color to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Get initials from a name */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Check if two field rects overlap */
function fieldsOverlap(a: FieldPlacement, b: FieldPlacement): boolean {
  if (a.page !== b.page) return false;
  const aRight = a.xPercent + a.widthPercent;
  const aBottom = a.yPercent + a.heightPercent;
  const bRight = b.xPercent + b.widthPercent;
  const bBottom = b.yPercent + b.heightPercent;
  return !(aRight <= b.xPercent || bRight <= a.xPercent || aBottom <= b.yPercent || bBottom <= a.yPercent);
}

const SNAP_THRESHOLD = 2; // percent

export function PdfViewer({
  fileData,
  fields = [],
  mode,
  onFieldsChange,
  onFieldClick,
  activeFieldType,
  recipientId,
  recipientColors,
  recipientData,
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
  const [resizeDimensions, setResizeDimensions] = useState<{ w: number; h: number } | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});

  const pdfData = `data:application/pdf;base64,${fileData}`;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  // Compute overlap set for current page fields
  const overlappingFieldIds = useMemo(() => {
    const ids = new Set<string>();
    const pageFields = fields.filter((f) => f.page === currentPage);
    for (let i = 0; i < pageFields.length; i++) {
      for (let j = i + 1; j < pageFields.length; j++) {
        if (fieldsOverlap(pageFields[i], pageFields[j])) {
          ids.add(pageFields[i].id || pageFields[i].tempId || `idx-${i}`);
          ids.add(pageFields[j].id || pageFields[j].tempId || `idx-${j}`);
        }
      }
    }
    return ids;
  }, [fields, currentPage]);

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

  // Snapping logic: find snap targets for a field being moved
  const computeSnap = useCallback(
    (movingField: FieldPlacement, fieldIndex: number) => {
      const otherFields = fields.filter((_, i) => i !== fieldIndex && _.page === movingField.page);
      let snapX: number | undefined;
      let snapLineX: number | undefined;
      let snapY: number | undefined;
      let snapLineY: number | undefined;

      const movingLeft = movingField.xPercent;
      const movingRight = movingField.xPercent + movingField.widthPercent;
      const movingCenterX = movingField.xPercent + movingField.widthPercent / 2;

      for (const other of otherFields) {
        const otherLeft = other.xPercent;
        const otherRight = other.xPercent + other.widthPercent;
        const otherCenterX = other.xPercent + other.widthPercent / 2;

        // Left to left
        if (Math.abs(movingLeft - otherLeft) < SNAP_THRESHOLD) {
          snapX = otherLeft;
          snapLineX = otherLeft;
        }
        // Right to right
        else if (Math.abs(movingRight - otherRight) < SNAP_THRESHOLD) {
          snapX = otherRight - movingField.widthPercent;
          snapLineX = otherRight;
        }
        // Center to center
        else if (Math.abs(movingCenterX - otherCenterX) < SNAP_THRESHOLD) {
          snapX = otherCenterX - movingField.widthPercent / 2;
          snapLineX = otherCenterX;
        }
        // Left to right
        else if (Math.abs(movingLeft - otherRight) < SNAP_THRESHOLD) {
          snapX = otherRight;
          snapLineX = otherRight;
        }
        // Right to left
        else if (Math.abs(movingRight - otherLeft) < SNAP_THRESHOLD) {
          snapX = otherLeft - movingField.widthPercent;
          snapLineX = otherLeft;
        }

        if (snapX !== undefined) break;
      }

      return {
        snappedX: snapX,
        snapLineX: snapLineX,
      };
    },
    [fields]
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
        let newX = Math.max(0, Math.min(100 - sf.widthPercent, sf.xPercent + dxPercent));
        const newY = Math.max(0, Math.min(100 - sf.heightPercent, sf.yPercent + dyPercent));

        const candidate: FieldPlacement = {
          ...sf,
          xPercent: newX,
          yPercent: newY,
        };

        // Apply snapping
        const { snappedX, snapLineX } = computeSnap(candidate, dragState.fieldIndex);
        if (snappedX !== undefined) {
          newX = Math.max(0, Math.min(100 - sf.widthPercent, snappedX));
          setSnapLines({ x: snapLineX });
        } else {
          setSnapLines({});
        }

        updated[dragState.fieldIndex] = {
          ...sf,
          xPercent: newX,
          yPercent: newY,
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

        setResizeDimensions({ w: Math.round(newW * 10) / 10, h: Math.round(newH * 10) / 10 });
      }

      onFieldsChange(updated);
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeDimensions(null);
      setSnapLines({});
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, fields, onFieldsChange, computeSnap]);

  const pageFields = fields.filter((f) => f.page === currentPage);

  /** Get preview text for an unfilled field */
  const getPreviewText = (field: FieldPlacement): string | null => {
    if (!recipientData || !field.recipientId) return null;
    const data = recipientData[field.recipientId];
    if (!data) return null;

    switch (field.type) {
      case "name":
        return data.name;
      case "email":
        return data.email;
      case "date":
        return new Date().toLocaleDateString();
      case "initials":
        return getInitials(data.name);
      case "signature":
        return "Signature";
      case "text":
        return "Text input";
      default:
        return null;
    }
  };

  /** Get recipient name for display below label */
  const getRecipientName = (field: FieldPlacement): string | null => {
    if (!recipientData || !field.recipientId) return null;
    return recipientData[field.recipientId]?.name || null;
  };

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

            {/* Snap guide lines */}
            {snapLines.x !== undefined && (
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none"
                style={{
                  left: `${snapLines.x}%`,
                  width: "1px",
                  backgroundColor: "#3b82f6",
                }}
              />
            )}

            {/* Field overlays */}
            {pageFields.map((field, idx) => {
              const FieldIcon = FIELD_ICONS[field.type] || Type;
              const isFilled = !!field.value || !!field.filledAt;
              const fieldKey = field.id || field.tempId || `idx-${idx}`;
              const isOverlapping = mode === "place-fields" && overlappingFieldIds.has(fieldKey);
              const recipientColor = recipientColors && field.recipientId
                ? recipientColors[field.recipientId]
                : null;
              const colorClass = !recipientColor
                ? FIELD_COLORS[field.type] || "border-gray-500 bg-gray-50/80"
                : "";
              const previewText = !isFilled && mode === "place-fields" ? getPreviewText(field) : null;
              const recipientName = mode === "place-fields" ? getRecipientName(field) : null;
              const isBeingResized = dragState?.type === "resize" && dragState.fieldIndex === fields.indexOf(field);

              return (
                <div
                  key={fieldKey}
                  className={cn(
                    "absolute z-10 border-2 border-dashed rounded flex flex-col items-center justify-center transition-colors group overflow-hidden",
                    colorClass,
                    isFilled && "border-solid bg-opacity-100",
                    isOverlapping && "ring-2 ring-red-500 ring-offset-1",
                    mode === "sign" && !isFilled && "cursor-pointer hover:brightness-95",
                    mode === "place-fields" && "cursor-move"
                  )}
                  style={{
                    left: `${field.xPercent}%`,
                    top: `${field.yPercent}%`,
                    width: `${field.widthPercent}%`,
                    height: `${field.heightPercent}%`,
                    ...(recipientColor
                      ? {
                          borderColor: recipientColor,
                          backgroundColor: hexToRgba(recipientColor, 0.12),
                        }
                      : {}),
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
                    <div className="flex flex-col items-center justify-center gap-0 w-full h-full px-1">
                      {/* Type label */}
                      <div className="flex items-center gap-1 leading-tight">
                        <FieldIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span
                          className="font-semibold truncate text-foreground"
                          style={{ fontSize: "clamp(8px, 1.2vw, 12px)" }}
                        >
                          {FIELD_LABELS[field.type] || field.type}
                        </span>
                      </div>
                      {/* Recipient name below label */}
                      {recipientName && (
                        <span
                          className="text-muted-foreground truncate w-full text-center"
                          style={{ fontSize: "clamp(6px, 1vw, 10px)" }}
                        >
                          {recipientName}
                        </span>
                      )}
                      {/* Preview value */}
                      {previewText && (
                        <span
                          className="italic text-muted-foreground/60 truncate w-full text-center mt-0.5"
                          style={{ fontSize: "clamp(7px, 1vw, 10px)" }}
                        >
                          {previewText}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Resize dimension tooltip */}
                  {isBeingResized && resizeDimensions && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                      {resizeDimensions.w}% x {resizeDimensions.h}%
                    </div>
                  )}

                  {/* Delete button - always visible in place-fields mode */}
                  {mode === "place-fields" && (
                    <button
                      className="absolute -top-2.5 -right-2.5 z-20 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm transition-colors"
                      style={{ width: "20px", height: "20px", minWidth: "20px", minHeight: "20px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveField(field);
                      }}
                    >
                      <X className="h-3 w-3" strokeWidth={3} />
                    </button>
                  )}

                  {/* Resize handles in place-fields mode */}
                  {mode === "place-fields" && ["nw", "ne", "sw", "se"].map((handle) => (
                    <div
                      key={handle}
                      className={cn(
                        "absolute rounded-sm bg-white border-2 z-20 transition-opacity",
                        "opacity-60 group-hover:opacity-100",
                        handle === "nw" && "-top-[5px] -left-[5px] cursor-nw-resize",
                        handle === "ne" && "-top-[5px] -right-[5px] cursor-ne-resize",
                        handle === "sw" && "-bottom-[5px] -left-[5px] cursor-sw-resize",
                        handle === "se" && "-bottom-[5px] -right-[5px] cursor-se-resize",
                      )}
                      style={{
                        width: "10px",
                        height: "10px",
                        borderColor: recipientColor || (field.type === "signature" ? "#3b82f6" : field.type === "date" ? "#22c55e" : field.type === "text" ? "#f97316" : field.type === "name" ? "#a855f7" : field.type === "email" ? "#06b6d4" : "#ec4899"),
                      }}
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
