"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createEmailAccount,
  deleteEmailAccount,
} from "@/lib/actions/emails";
import type { EmailAccount } from "@/lib/types";

const KNOWN_PROVIDERS: Record<
  string,
  { imapHost: string; imapPort: number; smtpHost: string; smtpPort: number }
> = {
  "gmail.com": { imapHost: "imap.gmail.com", imapPort: 993, smtpHost: "smtp.gmail.com", smtpPort: 587 },
  "googlemail.com": { imapHost: "imap.gmail.com", imapPort: 993, smtpHost: "smtp.gmail.com", smtpPort: 587 },
  "outlook.com": { imapHost: "outlook.office365.com", imapPort: 993, smtpHost: "smtp.office365.com", smtpPort: 587 },
  "hotmail.com": { imapHost: "outlook.office365.com", imapPort: 993, smtpHost: "smtp.office365.com", smtpPort: 587 },
  "live.com": { imapHost: "outlook.office365.com", imapPort: 993, smtpHost: "smtp.office365.com", smtpPort: 587 },
  "msn.com": { imapHost: "outlook.office365.com", imapPort: 993, smtpHost: "smtp.office365.com", smtpPort: 587 },
  "yahoo.com": { imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 587 },
  "yahoo.co.uk": { imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 587 },
  "aol.com": { imapHost: "imap.aol.com", imapPort: 993, smtpHost: "smtp.aol.com", smtpPort: 587 },
  "icloud.com": { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587 },
  "me.com": { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587 },
  "mac.com": { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587 },
  "zoho.com": { imapHost: "imap.zoho.com", imapPort: 993, smtpHost: "smtp.zoho.com", smtpPort: 587 },
  "protonmail.com": { imapHost: "127.0.0.1", imapPort: 1143, smtpHost: "127.0.0.1", smtpPort: 1025 },
  "pm.me": { imapHost: "127.0.0.1", imapPort: 1143, smtpHost: "127.0.0.1", smtpPort: 1025 },
};

export function EmailAccountForm({
  accounts,
}: {
  accounts: EmailAccount[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [password, setPassword] = useState("");
  const [detectedProvider, setDetectedProvider] = useState("");

  function handleEmailChange(value: string) {
    setEmail(value);
    const domain = value.split("@")[1]?.toLowerCase();
    if (domain && KNOWN_PROVIDERS[domain]) {
      const p = KNOWN_PROVIDERS[domain];
      setImapHost(p.imapHost);
      setImapPort(String(p.imapPort));
      setSmtpHost(p.smtpHost);
      setSmtpPort(String(p.smtpPort));
      setDetectedProvider(domain);
    } else {
      setDetectedProvider("");
    }
  }

  const handleSubmit = async () => {
    // Auto-fill server settings at submit time if still empty
    let finalImapHost = imapHost;
    let finalImapPort = imapPort;
    let finalSmtpHost = smtpHost;
    let finalSmtpPort = smtpPort;
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && KNOWN_PROVIDERS[domain]) {
      const p = KNOWN_PROVIDERS[domain];
      if (!finalImapHost) finalImapHost = p.imapHost;
      if (!finalImapPort) finalImapPort = String(p.imapPort);
      if (!finalSmtpHost) finalSmtpHost = p.smtpHost;
      if (!finalSmtpPort) finalSmtpPort = String(p.smtpPort);
      // Also update state so UI reflects it
      setImapHost(finalImapHost);
      setImapPort(finalImapPort);
      setSmtpHost(finalSmtpHost);
      setSmtpPort(finalSmtpPort);
    }

    setLoading(true);
    try {
      const result = await createEmailAccount({
        email,
        name: name || undefined,
        imapHost: finalImapHost,
        imapPort: Number(finalImapPort),
        imapSecure: true,
        smtpHost: finalSmtpHost,
        smtpPort: Number(finalSmtpPort),
        smtpSecure: true,
        password,
      });

      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }

      toast.success("Email account connected");
      setOpen(false);
      setEmail("");
      setName("");
      setImapHost("");
      setSmtpHost("");
      setPassword("");
      setDetectedProvider("");
    } catch {
      toast.error("Failed to connect account");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteEmailAccount(id);
    if (result.success) toast.success("Account removed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Email Accounts</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Connect Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Email Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="you@example.com"
                />
                {detectedProvider && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Server settings auto-detected for {detectedProvider}
                  </p>
                )}
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div>
                <Label>Password / App Password *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="App-specific password"
                />
              </div>
              {!detectedProvider && email.includes("@") && email.split("@")[1]?.includes(".") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>IMAP Host *</Label>
                      <Input
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        placeholder="imap.example.com"
                      />
                    </div>
                    <div>
                      <Label>IMAP Port</Label>
                      <Input
                        value={imapPort}
                        onChange={(e) => setImapPort(e.target.value)}
                        placeholder="993"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>SMTP Host *</Label>
                      <Input
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div>
                      <Label>SMTP Port</Label>
                      <Input
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                      />
                    </div>
                  </div>
                </>
              )}
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? "Connecting..." : "Connect Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No email accounts connected yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    {account.name || account.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {account.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    IMAP: {account.imapHost}:{account.imapPort} | SMTP:{" "}
                    {account.smtpHost}:{account.smtpPort}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDelete(account.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
