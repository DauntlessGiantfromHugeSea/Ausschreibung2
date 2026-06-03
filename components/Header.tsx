import Link from "next/link";
import type { PublicUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export function Header({ user }: { user: PublicUser | null }) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://fb-eng.de/wp-content/uploads/2024/10/FBE_green.png"
            alt="F&B Engineering"
            className="h-8 w-auto"
          />
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
          {user?.role === "admin" && (
            <Link href="/admin" className="font-medium text-brand-700 hover:text-brand-900">
              Admin
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
