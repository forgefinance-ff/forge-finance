import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-h-screen bg-[#09090B]">
        <SiteHeader />

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}