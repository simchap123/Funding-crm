"use client";

import { useState, useRef, useEffect } from "react";
import { Pen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FieldPlacement } from "./pdf-viewer";

interface FieldInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FieldPlacement | null;
  signerName?: string;
  signerEmail?: string;
  onSubmit: (fieldId: string, value: string) => void;
}

export function FieldInputDialog({
  open,
  onOpenChange,
  field,
  signerName = "",
  signerEmail = "",
  onSubmit,
}: FieldInputDialogProps) {
  const [textValue, setTextValue] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (open && field) {
      setTextValue("");
      setSignatureData("");
      setTypedSignature("");
      // Pre-fill based on type
      if (field.type === "date") {
        setTextValue(new Date().toISOString().split("T")[0]);
      } else if (field.type === "name") {
        setTextValue(signerName);
      } else if (field.type === "email") {
        setTextValue(signerEmail);
      }
    }
  }, [open, field, signerName, signerEmail]);

  // Clear canvas when opening
  useEffect(() => {
    if (open && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [open]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(
      (e.clientX - rect.left) * (canvas.width / rect.width),
      (e.clientY - rect.top) * (canvas.height / rect.height)
    );
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(
      (e.clientX - rect.left) * (canvas.width / rect.width),
      (e.clientY - rect.top) * (canvas.height / rect.height)
    );
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(
      (touch.clientX - rect.left) * (canvas.width / rect.width),
      (touch.clientY - rect.top) * (canvas.height / rect.height)
    );
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(
      (touch.clientX - rect.left) * (canvas.width / rect.width),
      (touch.clientY - rect.top) * (canvas.height / rect.height)
    );
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
  };

  const handleSubmit = () => {
    if (!field) return;
    const fieldId = field.id || field.tempId || "";

    if (field.type === "signature") {
      // Use drawn signature or generate from typed name
      if (signatureData) {
        onSubmit(fieldId, signatureData);
      } else if (typedSignature) {
        // Generate signature from typed text using canvas
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 150;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = "italic 48px 'Georgia', serif";
          ctx.fillStyle = "#1a1a2e";
          ctx.textBaseline = "middle";
          ctx.fillText(typedSignature, 20, 75);
          onSubmit(fieldId, canvas.toDataURL());
        }
      }
    } else {
      if (textValue) {
        onSubmit(fieldId, textValue);
      }
    }
    onOpenChange(false);
  };

  if (!field) return null;

  const isSignature = field.type === "signature" || field.type === "initials";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {field.type === "signature"
              ? "Add Your Signature"
              : field.type === "initials"
              ? "Add Your Initials"
              : field.type === "date"
              ? "Select Date"
              : `Enter ${field.label || field.type}`}
          </DialogTitle>
        </DialogHeader>

        {isSignature ? (
          <Tabs defaultValue="draw">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw">Draw</TabsTrigger>
              <TabsTrigger value="type">Type</TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="space-y-3">
              <div className="border-2 border-dashed rounded-lg bg-white">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  Clear
                </Button>
                <Button onClick={handleSubmit} disabled={!signatureData}>
                  Apply Signature
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="type" className="space-y-3">
              <Input
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your full name"
                className="text-lg"
              />
              {typedSignature && (
                <div className="border rounded-lg p-4 bg-white text-center">
                  <span
                    className="text-3xl italic"
                    style={{ fontFamily: "Georgia, serif", color: "#1a1a2e" }}
                  >
                    {typedSignature}
                  </span>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={!typedSignature}>
                  Apply Signature
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            <Input
              type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={`Enter ${field.type}`}
              autoFocus
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!textValue}>
                Apply
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
