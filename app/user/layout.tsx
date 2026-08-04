import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { UserBreadcrumb } from "./_components/user-breadcrumb";
import { UserSidebar } from "./_components/user-sidebar";

export default async function UserLayout({ children }: LayoutProps<"/user">) {
  // Sidebar writes its open/closed state to this cookie. Reading it here keeps
  // the server render in sync, so a collapsed sidebar doesn't flash open.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <UserSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          {/* Button size wins over the icon-sm variant via tailwind-merge, but
              the variant's icon rule is more specific — hence the `!` on the svg. */}
          <SidebarTrigger className="-ml-1 size-9 [&_svg]:size-5!" />
          <UserBreadcrumb />
          <div className="ml-auto flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full  text-[20px] font-semibold text-primary-foreground">
              🌸
            </span>
          </div>
        </header>

        <div className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
