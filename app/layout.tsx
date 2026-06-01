import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "auftrag.ai – KI-Plattform für öffentliche Ausschreibungen",
  description:
    "Finde, filtere und verstehe deutsche und europäische Ausschreibungen. Volltextsuche, Facetten und KI-gestützte Klartext-Zusammenfassungen.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col">
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 flex flex-wrap justify-between gap-4">
            <span>© {new Date().getFullYear()} auftrag.ai · Nachbau zu Demozwecken</span>
            <span>Daten: TED / service.bund.de · Seed-Datensatz im Offline-Modus</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
