import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { homePathFor } from "@/lib/permissions";

/** `/office` isn't a screen. Send each role to its home. */
export default async function OfficePage() {
  redirect(homePathFor((await requireSession()).role));
}
