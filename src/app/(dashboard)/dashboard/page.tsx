import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { CustomerFlow } from "@/components/dashboard/customer-flow";
import { PipelineSummary } from "@/components/dashboard/pipeline-summary";
import { RecentContacts } from "@/components/dashboard/recent-contacts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDashboardMetrics,
  getContactsByStageCount,
  getRecentContacts,
  getRecentActivities,
} from "@/lib/db/queries/dashboard";

async function MetricsSection() {
  const metrics = await getDashboardMetrics();
  return <StatsCards {...metrics} />;
}

async function CustomerFlowSection() {
  const stageCounts = await getContactsByStageCount();
  return <CustomerFlow stageCounts={stageCounts} />;
}

async function PipelineSection() {
  const stageCounts = await getContactsByStageCount();
  return <PipelineSummary stageCounts={stageCounts} />;
}

async function RecentContactsSection() {
  const contacts = await getRecentContacts();
  return <RecentContacts contacts={contacts} />;
}

async function ActivitySection() {
  const activities = await getRecentActivities();
  return <ActivityFeed activities={activities as any} />;
}

function CardSkeleton() {
  return <Skeleton className="h-[120px] w-full rounded-lg" />;
}

function LargeCardSkeleton() {
  return <Skeleton className="h-[400px] w-full rounded-lg" />;
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your lending pipeline"
      />

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MetricsSection />
      </Suspense>

      <Suspense fallback={<LargeCardSkeleton />}>
        <CustomerFlowSection />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<LargeCardSkeleton />}>
          <PipelineSection />
        </Suspense>
        <Suspense fallback={<LargeCardSkeleton />}>
          <RecentContactsSection />
        </Suspense>
      </div>

      <Suspense fallback={<LargeCardSkeleton />}>
        <ActivitySection />
      </Suspense>
    </div>
  );
}
