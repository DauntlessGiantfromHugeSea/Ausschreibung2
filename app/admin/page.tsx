import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin, listUsers } from "@/lib/auth";
import { UserManager } from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/");

  const users = listUsers();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nutzerverwaltung</h1>
          <p className="mt-1 text-slate-500">
            {users.length} {users.length === 1 ? "Konto" : "Konten"} · angemeldet als{" "}
            {user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/import"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Daten-Import
          </Link>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            Administrator
          </span>
        </div>
      </div>

      <div className="mt-8">
        <UserManager users={users} currentAdminId={user.id} />
      </div>
    </div>
  );
}
