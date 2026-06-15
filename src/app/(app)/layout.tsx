import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex h-full">
          <Sidebar userEmail={user.email} />
          <div className="flex-1 flex flex-col min-h-0 md:ml-60">
            {children}
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
