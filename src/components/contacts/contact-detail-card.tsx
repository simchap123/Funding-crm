"use client";

import { Mail, Phone, Building2, Globe, MapPin, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/shared/stage-badge";
import { SOURCE_LABELS } from "@/lib/constants";
import type { ContactWithDetails } from "@/lib/types";
import type { LeadStage, LeadSource } from "@/lib/db/schema/contacts";

interface ContactDetailCardProps {
  contact: ContactWithDetails;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export function ContactDetailCard({ contact }: ContactDetailCardProps) {
  const address = [contact.address, contact.city, contact.state, contact.zip, contact.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Contact Details</CardTitle>
          <StageBadge stage={contact.stage as LeadStage} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DetailRow icon={Mail} label="Email" value={contact.email} />
        <DetailRow icon={Phone} label="Phone" value={contact.phone} />
        <DetailRow icon={Building2} label="Company" value={contact.company} />
        <DetailRow icon={Briefcase} label="Job Title" value={contact.jobTitle} />
        <DetailRow icon={Globe} label="Website" value={contact.website} />
        <DetailRow icon={MapPin} label="Address" value={address || null} />

        {contact.source && (
          <div className="flex items-start gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="text-sm">{SOURCE_LABELS[contact.source as LeadSource]}</p>
            </div>
          </div>
        )}

        {(contact.score ?? 0) > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Lead Score</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${contact.score}%` }}
                />
              </div>
              <span className="text-sm font-medium">{contact.score}</span>
            </div>
          </div>
        )}

        {contact.contactTags.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {contact.contactTags.map(({ tag }) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
