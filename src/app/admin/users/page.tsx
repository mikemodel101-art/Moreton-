import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { db } from "@/lib/store";
import { Avatar, Badge, Card } from "@/components/ui";
import { RoleSelect } from "@/components/admin-widgets";

export const metadata: Metadata = { title: "Users & roles" };

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer"].includes(user.role)) redirect("/lawyer");

  const users = db().users;
  const byRole = (r: string) => users.filter((u) => u.role === r);

  return (
    <ConsoleShell title="Users & roles" subtitle="Role changes are audited and enforced server-side" currentPath="/admin/users" allowedRoles={["admin", "observer"]} nav={ADMIN_NAV}>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["client", "lawyer", "senior_lawyer", "admin", "observer"] as const).map((r) => (
          <Card key={r} className="p-4 text-center">
            <p className="font-display text-2xl font-semibold text-eucalyptus">{byRole(r).length}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{r.replace("_", " ")}s</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto nice-scroll">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">All seeded users with role management</caption>
            <thead>
              <tr className="border-b border-ink/10 bg-sand/70 text-xs uppercase tracking-wider text-fern">
                <th scope="col" className="px-5 py-3 font-bold">Name</th>
                <th scope="col" className="px-5 py-3 font-bold">Email</th>
                <th scope="col" className="px-5 py-3 font-bold">Role</th>
                <th scope="col" className="px-5 py-3 font-bold">Change role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-sand/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} color={u.color} size="sm" />
                      <div>
                        <p className="font-semibold text-ink">{u.name}</p>
                        {u.title && <p className="text-xs text-ink/50">{u.title}</p>}
                      </div>
                      {u.id === user.id && <Badge tone="gold">you</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-ink/70">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone={u.role === "admin" ? "clay" : u.role === "senior_lawyer" ? "green" : u.role === "lawyer" ? "sky" : "neutral"}>
                      {u.role.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    {user.role === "admin" ? (
                      <RoleSelect userId={u.id} role={u.role} self={u.id === user.id} />
                    ) : (
                      <span className="text-xs text-ink/40">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ConsoleShell>
  );
}
