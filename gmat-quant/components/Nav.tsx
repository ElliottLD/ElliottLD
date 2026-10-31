"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/chapitres", label: "Chapitres" },
  { href: "/journal", label: "Journal d'erreurs" },
  { href: "/bilan", label: "Bilan" },
  { href: "/formulaire", label: "Formulaire" },
  { href: "/glossaire", label: "Glossaire" },
  { href: "/sauvegarde", label: "Sauvegarde" },
];

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("gmat-quant:theme", dark ? "dark" : "light");
  } catch {}
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          GMAT Quant
        </Link>
        <nav className="hidden gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-2 py-1 text-sm ${active(l.href) ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900" aria-label="Basculer le thème">
            Thème
          </button>
          <button onClick={() => setOpen(!open)} className="rounded px-2 py-1 text-sm hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-900" aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-zinc-200 px-4 py-2 md:hidden dark:border-zinc-800">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`rounded px-2 py-2 ${active(l.href) ? "font-semibold" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
