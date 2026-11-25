import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { homePathFor } from "@/lib/permissions";

/** `/office/admin` and `/office/staff` aren't screens. Send each role to its home. */
export default async function SectionPage() {
  redirect(homePathFor((await requireSession()).role));
}
