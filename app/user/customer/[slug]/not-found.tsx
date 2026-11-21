import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

/**
 * Scoped to this segment so a bad customer code lands inside the admin shell
 * with a way back, rather than on a bare framework 404.
 */
export default function CustomerNotFound() {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <span className="text-muted-foreground">
        <HugeiconsIcon icon={UserGroupIcon} size={32} strokeWidth={1.5} />
      </span>
      <p className="mt-3 text-xs font-medium">No such customer</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        That customer code doesn&apos;t match anyone. It may have been mistyped,
        or the record was removed.
      </p>
      <Button
        variant="outline"
        nativeButton={false}
        className="mt-4"
        render={<Link href="/user/customer" />}
      >
        Back to customers
      </Button>
    </div>
  );
}
