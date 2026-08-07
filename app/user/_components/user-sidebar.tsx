"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  ChartLineData01Icon,
  DashboardSquare01Icon,
  Package02Icon,
  PlusSignIcon,
  Settings01Icon,
  TruckDeliveryIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

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

/**
 * Routes that exist. Everything else is listed but disabled, not faked.
 *
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
  { label: "Customers", href: "/user/customer", icon: UserGroupIcon },
  { label: "Products", href: "/user/product", icon: Package02Icon },
] as const;

const PLANNED_NAV = [
  { label: "Deliveries", icon: TruckDeliveryIcon },
  { label: "Reports", icon: ChartLineData01Icon },
] as const;

export function UserSidebar() {
  const pathname = usePathname();

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
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
                R
              </span>
              <span className="grid text-left leading-tight">
                <span className="text-sm font-semibold tracking-[0.18em]">
                  RALLA
                </span>
                <span className="text-[10px] text-sidebar-foreground/70">
                  Order admin
                </span>
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

        <SidebarGroup>
          <SidebarGroupLabel>Not built yet</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PLANNED_NAV.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton disabled tooltip={`${item.label} — not built yet`}>
                    <HugeiconsIcon icon={item.icon} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled tooltip="Settings — not built yet">
              <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.5} />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
