import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { desc } from "drizzle-orm";
import Papa from "papaparse";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allContacts = await db.query.contacts.findMany({
    orderBy: [desc(contacts.createdAt)],
  });

  const csvData = allContacts.map((c) => ({
    "First Name": c.firstName,
    "Last Name": c.lastName,
    Email: c.email || "",
    Phone: c.phone || "",
    Company: c.company || "",
    "Job Title": c.jobTitle || "",
    Stage: c.stage,
    Source: c.source || "",
    Score: c.score || 0,
    Address: c.address || "",
    City: c.city || "",
    State: c.state || "",
    Zip: c.zip || "",
    Country: c.country || "",
    Website: c.website || "",
    "Created At": c.createdAt,
  }));

  const csv = Papa.unparse(csvData);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
