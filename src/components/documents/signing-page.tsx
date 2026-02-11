"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Pen, CheckCircle2, Type, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signField, markDocumentViewed } from "@/lib/actions/documents";

type Field = {
  id: string;
  type: string;
  label: string | null;
  required: boolean;
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  value: string | null;
  filledAt: string | null;
};

type RecipientData = {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  status: string;
  document: {
    id: string;
    title: string;
    description: string | null;
    message: string | null;
    status: string;
  };
  fields: Field[];
};

export function SigningPage({ data }: { data: RecipientData }) {
  const [sigPad, setSignature] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of data.fields) {
      if (f.value) initial[f.id] = f.value;
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    markDocumentViewed(data.accessToken);
  }, [data.accessToken]);

  const allSigned = data.status === "signed";
  const docCompleted = data.document.status === "completed";

  const pendingFields = data.fields.filter(
    (f) => f.required && !f.filledAt && !fieldValues[f.id]
  );

  // Signature pad drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const handleSubmitField = async (fieldId: string, value: string) => {
    setSubmitting(true);
    try {
      const result = await signField(fieldId, value, data.accessToken);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }
      setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
      toast.success("Field completed");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignAll = async () => {
    setSubmitting(true);
    try {
      for (const field of data.fields) {
        if (field.filledAt) continue;

        let value = fieldValues[field.id] || "";

        if (field.type === "signature" && sigPad) {
          value = sigPad;
        } else if (field.type === "date") {
          value = value || new Date().toISOString().split("T")[0];
        } else if (field.type === "name") {
          value = value || data.name;
        } else if (field.type === "email") {
          value = value || data.email;
        }

        if (value) {
          await handleSubmitField(field.id, value);
        }
      }
      toast.success("All fields signed!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (allSigned || docCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold">
              {docCompleted ? "Document Completed" : "Already Signed"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {docCompleted
                ? "All parties have signed this document."
                : "You have already completed your signature for this document."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{data.document.title}</CardTitle>
            {data.document.message && (
              <p className="text-sm text-muted-foreground">
                {data.document.message}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="text-muted-foreground">Signing as: </span>
              <span className="font-medium">
                {data.name} ({data.email})
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        {data.fields.some((f) => f.type === "signature" && !f.filledAt) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pen className="h-5 w-5" />
                Draw Your Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-white">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="w-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Fields */}
        {data.fields
          .filter((f) => f.type !== "signature" && !f.filledAt)
          .map((field) => (
            <Card key={field.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {field.type === "date" ? (
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Type className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">
                      {field.label || field.type}
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </p>
                    <Input
                      type={field.type === "date" ? "date" : "text"}
                      value={fieldValues[field.id] || ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${field.type}`}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!fieldValues[field.id] || submitting}
                    onClick={() =>
                      handleSubmitField(field.id, fieldValues[field.id])
                    }
                  >
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* Completed Fields */}
        {data.fields.filter((f) => f.filledAt || fieldValues[f.id]).length >
          0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Completed Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.fields
                  .filter((f) => f.filledAt)
                  .map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="capitalize">{f.type}</span>
                      <span className="text-muted-foreground">- Completed</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit All Button */}
        {pendingFields.length > 0 && (
          <Button
            size="lg"
            className="w-full"
            disabled={submitting}
            onClick={handleSignAll}
          >
            {submitting ? "Signing..." : "Complete & Sign"}
          </Button>
        )}
      </div>
    </div>
  );
}
