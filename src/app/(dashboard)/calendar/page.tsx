import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getFollowUpsByDateRange } from "@/lib/db/queries/follow-ups";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format,
} from "date-fns";

interface CalendarPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) - 1 : now.getMonth();
  const currentDate = new Date(year, month, 1);

  // Fetch follow-ups for a 3-month window (prev, current, next)
  const rangeStart = format(startOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(addMonths(currentDate, 1)), "yyyy-MM-dd");

  const [followUps, allContacts] = await Promise.all([
    getFollowUpsByDateRange(rangeStart, rangeEnd),
    db.query.contacts.findMany({
      orderBy: [desc(contacts.createdAt)],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Schedule and track follow-ups with prospects"
      />
      <CalendarView
        followUps={followUps as any}
        contacts={allContacts}
        currentYear={year}
        currentMonth={month}
      />
    </div>
  );
}
