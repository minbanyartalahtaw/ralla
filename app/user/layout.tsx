import { cookies } from "next/headers";

import { adminUsername } from "@/lib/session";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AssistantSheet } from "./_components/assistant-sheet";
import { ScrollHeader } from "./_components/scroll-header";
import { UserBreadcrumb } from "./_components/user-breadcrumb";
import { UserSidebar } from "./_components/user-sidebar";

export default async function UserLayout({ children }: LayoutProps<"/user">) {
  // Sidebar writes its open/closed state to this cookie. Reading it here keeps
  // the server render in sync, so a collapsed sidebar doesn't flash open.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {/* Read here, not in the sidebar: the sidebar is a Client Component and
          `process.env` is a server-side thing. */}
      <UserSidebar username={adminUsername()} />
      {/* min-w-0: without it, main (a flex item of the sidebar row) takes an
          automatic min-width equal to its content's min-content size — a wide
          table (e.g. Orders' min-w-[1240px]) then forces the whole page to
          overflow horizontally on narrower viewports once the docked sidebar
          eats into the width, instead of just scrolling inside its own
          overflow-x-auto container. */}
      <SidebarInset className="min-w-0">
        {/* Hides on the way down and comes back on the way up: a long order
            list is what the screen is for, and the crumb never changes while
            you scroll one. Only the header itself is a Client Component —
            what it holds is still rendered here on the server. */}
        <ScrollHeader>
          {/* Button size wins over the icon-sm variant via tailwind-merge, but
              the variant's icon rule is more specific — hence the `!` on the svg. */}
          <SidebarTrigger className="-ml-1 size-9 [&_svg]:size-5!" />
          {/* Read-only: no crumb is a link. Detail and create pages carry
              their own BackButton, which is the actual way back. */}
          <UserBreadcrumb />
          <div className="ml-auto flex items-center gap-3">
            <AssistantSheet />
          </div>
        </ScrollHeader>

        <div className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
