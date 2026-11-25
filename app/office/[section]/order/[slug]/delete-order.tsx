"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Delete02Icon } from "@hugeicons/core-free-icons";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { deleteOrderAction } from "../actions";
import { useSection } from "@/app/office/[section]/_components/use-section";

/** Soft delete, behind a confirm step. Destructive, so it carries the warning icon. */
export function DeleteOrder({ orderId, code }: { orderId: number; code: string }) {
  const { section } = useSection();
  return (
    <AlertDialog>
      <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        >
          <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Delete this order</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Hidden from lists and the dashboard. An admin can restore it.
          </p>
        </div>
        <AlertDialogTrigger
          render={
            <Button
              variant="outline"
              className="shrink-0 border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive dark:border-destructive/40"
            >
              <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
              Delete
            </Button>
          }
        />
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete order {code}?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from the orders list, the counts and the dashboard. Stock is not put
            back on the shelf. An admin can restore it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteOrderAction}>
            <input type="hidden" name="id" value={orderId} />
            <input type="hidden" name="section" value={section} />
            <AlertDialogAction
              type="submit"
              className="w-full bg-destructive text-white hover:bg-destructive/90"
            >
              <HugeiconsIcon icon={Alert02Icon} data-icon="inline-start" />
              Delete order
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
