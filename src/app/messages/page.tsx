import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getActiveMatter } from "@/lib/store";

export default async function MessagesResolver({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/messages");
  const sp = await searchParams;
  const matter = getActiveMatter(user, sp.m);
  if (!matter) redirect("/start");
  redirect(`/app/messages/${matter.id}`);
}
