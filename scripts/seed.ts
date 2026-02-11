import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { nanoid } from "nanoid";
import { hash } from "bcryptjs";
import * as schema from "../src/lib/db/schema";

async function seed() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  console.log("Seeding database...");

  // Create test user
  const userId = nanoid();
  const passwordHash = await hash("password123", 12);
  await db.insert(schema.users).values({
    id: userId,
    name: "Admin User",
    email: "admin@example.com",
    passwordHash,
    role: "admin",
  });
  console.log("Created test user: admin@example.com / password123");

  // Create tags
  const tagData = [
    { name: "VIP", color: "#ef4444" },
    { name: "Hot Lead", color: "#f97316" },
    { name: "Enterprise", color: "#8b5cf6" },
    { name: "SMB", color: "#06b6d4" },
    { name: "Follow Up", color: "#eab308" },
    { name: "Referral", color: "#22c55e" },
  ];

  const tagIds: Record<string, string> = {};
  for (const tag of tagData) {
    const id = nanoid();
    tagIds[tag.name] = id;
    await db.insert(schema.tags).values({ id, ...tag, ownerId: userId });
  }
  console.log("Created tags");

  // Create sample contacts
  const contactsData = [
    { firstName: "John", lastName: "Smith", email: "john@acmecorp.com", phone: "+1-555-0101", company: "Acme Corp", jobTitle: "CEO", stage: "qualified" as const, source: "referral" as const, score: 85 },
    { firstName: "Sarah", lastName: "Johnson", email: "sarah@techstart.io", phone: "+1-555-0102", company: "TechStart", jobTitle: "CTO", stage: "proposal" as const, source: "website" as const, score: 92 },
    { firstName: "Mike", lastName: "Williams", email: "mike@globalinc.com", phone: "+1-555-0103", company: "Global Inc", jobTitle: "VP Sales", stage: "new" as const, source: "cold_call" as const, score: 45 },
    { firstName: "Emily", lastName: "Brown", email: "emily@designco.com", phone: "+1-555-0104", company: "DesignCo", jobTitle: "Director", stage: "contacted" as const, source: "social_media" as const, score: 60 },
    { firstName: "David", lastName: "Lee", email: "david@enterprise.com", phone: "+1-555-0105", company: "Enterprise Solutions", jobTitle: "CFO", stage: "negotiation" as const, source: "trade_show" as const, score: 95 },
    { firstName: "Lisa", lastName: "Chen", email: "lisa@innovate.co", phone: "+1-555-0106", company: "Innovate Co", jobTitle: "Founder", stage: "won" as const, source: "referral" as const, score: 100 },
    { firstName: "Robert", lastName: "Taylor", email: "robert@oldco.com", phone: "+1-555-0107", company: "OldCo", jobTitle: "Manager", stage: "lost" as const, source: "email_campaign" as const, score: 20 },
    { firstName: "Jennifer", lastName: "Davis", email: "jen@startupx.com", phone: "+1-555-0108", company: "StartupX", jobTitle: "COO", stage: "new" as const, source: "website" as const, score: 55 },
    { firstName: "Chris", lastName: "Martinez", email: "chris@bigdata.io", phone: "+1-555-0109", company: "BigData.io", jobTitle: "Head of Engineering", stage: "qualified" as const, source: "advertisement" as const, score: 78 },
    { firstName: "Amanda", lastName: "Wilson", email: "amanda@cloudly.com", phone: "+1-555-0110", company: "Cloudly", jobTitle: "VP Marketing", stage: "contacted" as const, source: "social_media" as const, score: 65 },
    { firstName: "Tom", lastName: "Anderson", email: "tom@saasify.io", phone: "+1-555-0111", company: "SaaSify", jobTitle: "Product Manager", stage: "proposal" as const, source: "referral" as const, score: 88 },
    { firstName: "Rachel", lastName: "Garcia", email: "rachel@fintech.co", phone: "+1-555-0112", company: "FinTech Co", jobTitle: "CEO", stage: "new" as const, source: "cold_call" as const, score: 40 },
  ];

  const contactIds: string[] = [];
  for (const contact of contactsData) {
    const id = nanoid();
    contactIds.push(id);
    await db.insert(schema.contacts).values({ id, ...contact, ownerId: userId });
  }
  console.log("Created sample contacts");

  // Assign tags to contacts
  const tagAssignments = [
    { contactIdx: 0, tags: ["VIP", "Enterprise"] },
    { contactIdx: 1, tags: ["Hot Lead", "SMB"] },
    { contactIdx: 2, tags: ["Follow Up"] },
    { contactIdx: 3, tags: ["SMB"] },
    { contactIdx: 4, tags: ["VIP", "Enterprise", "Hot Lead"] },
    { contactIdx: 5, tags: ["VIP", "Referral"] },
    { contactIdx: 8, tags: ["Enterprise", "Hot Lead"] },
    { contactIdx: 10, tags: ["Referral", "Hot Lead"] },
  ];

  for (const assignment of tagAssignments) {
    for (const tagName of assignment.tags) {
      await db.insert(schema.contactTags).values({
        contactId: contactIds[assignment.contactIdx],
        tagId: tagIds[tagName],
      });
    }
  }
  console.log("Assigned tags to contacts");

  // Create some notes
  const notesData = [
    { contactIdx: 0, content: "Had a great intro call. Very interested in our enterprise plan.", pinned: true },
    { contactIdx: 0, content: "Sent follow-up email with pricing details.", pinned: false },
    { contactIdx: 1, content: "Demo scheduled for next week. They need API integration.", pinned: true },
    { contactIdx: 4, content: "Negotiating contract terms. Legal review in progress.", pinned: true },
    { contactIdx: 4, content: "They want a 15% discount for annual commitment.", pinned: false },
    { contactIdx: 5, content: "Deal closed! Signed 2-year contract.", pinned: true },
  ];

  for (const note of notesData) {
    await db.insert(schema.notes).values({
      id: nanoid(),
      contactId: contactIds[note.contactIdx],
      content: note.content,
      pinned: note.pinned,
      authorId: userId,
    });
  }
  console.log("Created notes");

  // Create activity log
  const activitiesData = [
    { contactIdx: 0, type: "contact_created" as const, description: "Contact was created" },
    { contactIdx: 0, type: "stage_changed" as const, description: "Stage changed from new to contacted" },
    { contactIdx: 0, type: "stage_changed" as const, description: "Stage changed from contacted to qualified" },
    { contactIdx: 0, type: "note_added" as const, description: "Added a note" },
    { contactIdx: 1, type: "contact_created" as const, description: "Contact was created" },
    { contactIdx: 1, type: "stage_changed" as const, description: "Stage changed from new to proposal" },
    { contactIdx: 4, type: "contact_created" as const, description: "Contact was created" },
    { contactIdx: 4, type: "stage_changed" as const, description: "Stage changed from new to negotiation" },
    { contactIdx: 5, type: "contact_created" as const, description: "Contact was created" },
    { contactIdx: 5, type: "stage_changed" as const, description: "Stage changed from new to won" },
  ];

  for (const activity of activitiesData) {
    await db.insert(schema.activities).values({
      id: nanoid(),
      contactId: contactIds[activity.contactIdx],
      type: activity.type,
      description: activity.description,
      userId,
    });
  }
  console.log("Created activities");

  console.log("\nSeed complete!");
  process.exit(0);
}

seed().catch(console.error);
