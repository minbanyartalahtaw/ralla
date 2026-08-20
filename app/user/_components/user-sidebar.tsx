"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  DashboardSquare01Icon,
  Logout01Icon,
  Package02Icon,
  PlusSignIcon,
  UnfoldMoreIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { signOutAction } from "@/app/login/actions";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { ThemeToggleItem } from "./theme-toggle-item";

/**
 * `newHref` adds a "+" shortcut beside the item, for the one route staff open
 * far more often to create than to browse.
 */
const ORDER_NAV = [
  { label: "Dashboard", href: "/user/dashboard", icon: DashboardSquare01Icon },
  {
    label: "Orders",
    href: "/user/order",
    icon: Calendar03Icon,
    newHref: "/user/order/new",
    newLabel: "New order",
  },
  { label: "Products", href: "/user/product", icon: Package02Icon },
  { label: "Customers", href: "/user/customer", icon: UserGroupIcon },
] as const;

export function UserSidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="RALLA"
              render={<Link href="/user/dashboard" />}
            >
              {/* Square and legible at any width, so it doubles as the icon
                  once the rail collapses — no separate fallback needed. The
                  emoji carries its own colour, so no badge behind it. */}
              <span
                className="flex size-7 shrink-0 items-center justify-center text-[18px]"
                aria-hidden
              >
                🌸
              </span>
              <span className="text-sm font-semibold tracking-[0.18em]">
                RALLA
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ORDER_NAV.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    // Prefix match so /user/order/new keeps "Orders" lit.
                    isActive={
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                    }
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {"newHref" in item ? (
                    <SidebarMenuAction
                      title={item.newLabel}
                      render={<Link href={item.newHref} />}
                    >
                      <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
                      <span className="sr-only">{item.newLabel}</span>
                    </SidebarMenuAction>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Signing out stays a form POST to the Server Action — that is the
                one shape that can clear an HttpOnly cookie. It sits out here
                rather than inside the menu because the menu content is
                portalled to <body>, so a wrapping form wouldn't contain the
                button; the `form` attribute below reaches it by id instead. */}
            <form id="sign-out" action={signOutAction} className="hidden" />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" tooltip={username}>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground uppercase">
                      {username.slice(0, 1)}
                    </span>
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate text-xs font-medium">
                        {username}
                      </span>
                    </span>
                    <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={1.5} />
                  </SidebarMenuButton>
                }
              />

              {/* Opens upward — the trigger is pinned to the bottom of the
                  rail, so there is no room below it. */}
              <DropdownMenuContent
                side="top"
                align="end"
          
              >


                <ThemeToggleItem />


                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  className="w-full"
                  onClick={() => setSignOutOpen(true)}
                >
                  <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll need the shared username and password to sign
                    back in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    // Base UI's Button renders a native <button> by default, but
                    // `render` swaps in one that submits the hidden sign-out
                    // form by id — `nativeButton` keeps its Enter/Space
                    // handling from doubling up with that element's own.
                    nativeButton
                    render={<button type="submit" form="sign-out" />}
                  >
                    Sign out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
