"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNote, deleteNote, toggleNotePin } from "@/lib/actions/notes";
import type { Note } from "@/lib/types";

interface NotesSectionProps {
  contactId: string;
  notes: Note[];
}

export function NotesSection({ contactId, notes }: NotesSectionProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    const result = await addNote(contactId, { content });
    if (result.success) {
      setContent("");
      toast.success("Note added");
    } else {
      toast.error(result.error as string);
    }
    setLoading(false);
  };

  const handleDelete = async (noteId: string) => {
    const result = await deleteNote(noteId, contactId);
    if (result.success) toast.success("Note deleted");
  };

  const handleTogglePin = async (noteId: string, pinned: boolean) => {
    await toggleNotePin(noteId, contactId, !pinned);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmit} disabled={loading || !content.trim()}>
              {loading ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleTogglePin(note.id, note.pinned)}
                  >
                    {note.pinned ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                {note.pinned && " · Pinned"}
              </p>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notes yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
