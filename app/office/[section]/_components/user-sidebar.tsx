"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Logout01Icon,
  PlusSignIcon,
  Settings02Icon,
  UnfoldMoreIcon,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { RallaMark, RallaWordmark } from "@/components/ralla-logo";

import type { NavGroup } from "./nav";
import { ThemeToggleItem } from "./theme-toggle-item";
import { useSection } from "./use-section";

/**
 * The item the current page belongs to: the longest href the path is, or sits
 * under, across every group. Longest wins so /office/admin/order/deleted lights
 * "Deleted orders" rather than "Orders", and /office/staff/order lights Staff →
 * Orders rather than Admin → Orders.
 */
function activeHref(pathname: string, groups: NavGroup[]): string | undefined {
  return groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((x, y) => y.length - x.length)[0];
}

function NavSection({ group, active }: { group: NavGroup; active?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const shown = !group.collapsible || open;

  return (
    <SidebarGroup>
      {group.collapsible ? (
        <SidebarGroupLabel
          render={
            <button
              type="button"
              aria-expanded={shown}
              aria-controls={id}
              onClick={() => setOpen(!shown)}
            />
          }
          className="w-full cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {group.label}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={1.5}
            className={`ml-auto transition-transform ${shown ? "" : "-rotate-90"}`}
          />
        </SidebarGroupLabel>
      ) : (
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      )}
      {/* The icon rail hides the label, and with it the toggle — so a folded
          group still shows its icons there. */}
      <SidebarGroupContent
        id={id}
        className={shown ? undefined : "hidden group-data-[collapsible=icon]:block"}
      >
        <SidebarMenu>
          {group.items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={item.href === active}
                tooltip={`${group.label} · ${item.label}`}
                render={<Link href={item.href} />}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={1.5} />
                <span>{item.label}</span>
              </SidebarMenuButton>
              {item.newHref ? (
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
  );
}

/** `groups` and `home` come from the server (see nav.ts), decided by role. */
export function UserSidebar({
  name,
  groups,
  home,
}: {
  name: string;
  groups: NavGroup[];
  home: string;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname, groups);
  const { base } = useSection();
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="RALLA"
              render={<Link href={home} />}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
                aria-hidden
              >
                <RallaMark small className="size-4" />
              </span>
              <RallaWordmark className="h-3.5! w-auto! text-sidebar-accent-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group, g) => (
          <div key={group.label} className="contents">
            {/* Only visible collapsed, where the group labels are hidden. */}
            {g > 0 ? (
              <SidebarSeparator className="hidden group-data-[collapsible=icon]:block" />
            ) : null}
            <NavSection group={group} active={active} />
          </div>
        ))}
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
                  <SidebarMenuButton size="lg" tooltip={name}>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground uppercase">
                      {name.slice(0, 1)}
                    </span>
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate text-xs font-medium">
                        {name}
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


                <DropdownMenuItem render={<Link href={`${base}/settings`} />}>
                  <HugeiconsIcon icon={Settings02Icon} strokeWidth={1.5} />
                  Settings
                </DropdownMenuItem>

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
                    You&apos;ll need your username and password to sign back in.
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
