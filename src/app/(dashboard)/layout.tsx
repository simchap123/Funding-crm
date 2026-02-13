import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/pwa/mobile-nav";
import { getUnreadCount } from "@/lib/db/queries/emails";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unreadCount = await getUnreadCount();

  return (
    <SidebarProvider>
      <AppSidebar unreadCount={unreadCount} />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </SidebarInset>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
