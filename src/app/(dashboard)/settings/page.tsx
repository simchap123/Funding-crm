import Link from "next/link";
import { Tags, Mail, Shield, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const settingsSections = [
  {
    title: "Account",
    description: "Change password and manage team members",
    href: "/settings/account",
    icon: Shield,
  },
  {
    title: "Tags",
    description: "Manage tags to organize your contacts",
    href: "/settings/tags",
    icon: Tags,
  },
  {
    title: "Email",
    description: "Configure email accounts and inbox settings",
    href: "/settings/email",
    icon: Mail,
  },
  {
    title: "Lenders",
    description: "Manage lender contacts for deal submissions",
    href: "/settings/lenders",
    icon: Building2,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your CRM configuration"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
