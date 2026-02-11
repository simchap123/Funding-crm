import { redirect } from "next/navigation";

interface CalendarPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const params = await searchParams;
  const queryParts = ["view=calendar"];
  if (params.month) queryParts.push(`month=${params.month}`);
  if (params.year) queryParts.push(`year=${params.year}`);
  redirect(`/pipeline?${queryParts.join("&")}`);
}
