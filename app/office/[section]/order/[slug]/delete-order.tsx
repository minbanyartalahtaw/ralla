"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

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
      <AlertDialogTrigger
        render={
          <Button variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} data-icon="inline-start" />
            Delete order
          </Button>
        }
      />
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
            <AlertDialogAction type="submit" variant="destructive" className="w-full">
              <HugeiconsIcon icon={Alert02Icon} data-icon="inline-start" />
              Delete order
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
