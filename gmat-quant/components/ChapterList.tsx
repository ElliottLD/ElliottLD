"use client";

import Link from "next/link";
import { BLOCKS, CHAPTERS } from "@/content/program";
import { getQuestions, hasContent } from "@/content";
import { chapterMastery } from "@/lib/progress";
import { useStore } from "@/lib/storage";
import { Badge, Bar } from "./ui";

export function ChapterList() {
  const store = useStore();
  return (
    <div className="space-y-6">
      {BLOCKS.map((b) => (
        <section key={b.id}>
          <h2 className="mb-2 text-lg font-semibold">
            Bloc {b.id} — {b.title}
          </h2>
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {CHAPTERS.filter((c) => c.block === b.id).map((c) => {
              const ready = hasContent(c.id);
              const m = chapterMastery(getQuestions(c.id), store.attempts, store.errors);
              return (
                <li key={c.id}>
                  <Link href={`/chapitres/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <span className="w-8 font-mono text-sm font-semibold">{c.id}</span>
                    <span className="flex-1">{c.title}</span>
                    {ready ? (
                      <span className="flex w-28 items-center gap-2 text-xs text-zinc-500">
                        <Bar value={m} />
                        {Math.round(m * 100)} %
                      </span>
                    ) : (
                      <Badge>à venir</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
