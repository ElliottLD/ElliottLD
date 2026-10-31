"use client";

import { useState } from "react";
import { GLOSSARY } from "@/content/glossary";

export function Glossary() {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const items = GLOSSARY.filter((g) => !q || norm(`${g.en} ${g.fr} ${g.note ?? ""}`).includes(norm(q)));
  const themes = [...new Set(items.map((g) => g.theme))];
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher (anglais ou français)…"
        className="no-print mb-4 w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      {themes.map((t) => (
        <section key={t} className="mb-6">
          <h2 className="mb-2 font-semibold">{t}</h2>
          <table className="w-full text-sm">
            <tbody>
              {items
                .filter((g) => g.theme === t)
                .map((g) => (
                  <tr key={g.en} className="border-b border-zinc-200 align-top dark:border-zinc-800">
                    <td className="w-2/5 py-1.5 pr-3 font-medium italic">{g.en}</td>
                    <td className="py-1.5">
                      {g.fr}
                      {g.note && <span className="block text-xs text-zinc-500">{g.note}</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
