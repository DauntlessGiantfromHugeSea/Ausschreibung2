import Link from "next/link";
import type { PublicUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export function Header({ user }: { user: PublicUser | null }) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            a
          </span>
          <span>
            auftrag<span className="text-brand-600">.ai</span>
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-slate-600">
          <Link href="/search" className="hover:text-brand-700">
            Ausschreibungen
          </Link>
          {user && (
            <Link href="/account" className="hover:text-brand-700">
              Mein Konto
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden sm:inline text-slate-500">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-brand-700">
                Anmelden
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Registrieren
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
