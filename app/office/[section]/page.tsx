import { redirect } from "next/navigation";

/** `/user` isn't a screen — it's the section root. Send it to the dashboard. */
export default function UserPage() {
  redirect("/user/dashboard");
}
