import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, clientOf, db, getMatter, lawyerOf } from "@/lib/store";
import { MessageThread } from "@/components/message-thread";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ params }: { params: Promise<{ matterId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { matterId } = await params;
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) notFound();

  const client = clientOf(matter)!;
  const lawyer = lawyerOf(matter);
  const messages = db()
    .messages.filter((m) => m.matterId === matter.id && !m.internal)
    .map((m) => {
      const author = db().users.find((u) => u.id === m.fromId);
      return {
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        mine: m.fromId === user.id,
        authorName: author?.name ?? "Unknown",
        authorColor: author?.color ?? "#888",
        authorRole: author?.role ?? "client",
      };
    });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">{matter.ref}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
          Messages {lawyer ? `with ${lawyer.name}` : "with your lawyer"}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          About {client.name}&rsquo;s will. Replies also generate an email preview in the mailbox.
        </p>
      </div>
      <div className="mt-6">
        <MessageThread
          matterId={matter.id}
          messages={messages}
          readOnly={user.role === "observer"}
          placeholder={
            lawyer ? `Write to ${lawyer.name}…` : "Your matter isn't assigned yet — leave a message anyway and the reviewing lawyer will see it."
          }
        />
      </div>
    </div>
  );
}
