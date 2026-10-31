"use client";

import { useEffect, useState } from "react";
import { Player } from "./Player";
import { btn } from "./ui";
import { getQuestions } from "@/content";
import { addStudyTime } from "@/lib/storage";

const TABS = [
  { id: "cours", label: "Cours" },
  { id: "exercices", label: "Exercices" },
  { id: "fiche", label: "Fiche récap" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Compte le temps passé sur le cours ou la fiche (onglet visible), par tranches de 30 s. */
function useStudyTimer(chapter: string, active: boolean) {
  useEffect(() => {
    if (!active) return;
    let acc = 0;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      acc += 5;
      if (acc >= 30) {
        addStudyTime(chapter, acc);
        acc = 0;
      }
    }, 5000);
    return () => {
      clearInterval(t);
      if (acc > 0) addStudyTime(chapter, acc);
    };
  }, [chapter, active]);
}

export function ChapterView({ chapter, course, summary }: { chapter: string; course: React.ReactNode; summary: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("cours");
  const questions = getQuestions(chapter);
  useStudyTimer(chapter, tab !== "exercices");

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (TABS.some((t) => t.id === h)) setTab(h as Tab);
  }, []);

  function go(t: Tab) {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  }

  return (
    <div>
      <div className="no-print mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? "border-zinc-900 dark:border-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "cours" && (
        <>
          {course}
          <div className="no-print mt-8">
            <button className={btn} onClick={() => go("exercices")}>
              Passer aux exercices →
            </button>
          </div>
        </>
      )}
      {tab === "exercices" && <Player questions={questions} />}
      {tab === "fiche" && (
        <>
          <div className="no-print mb-4">
            <button className={btn} onClick={() => window.print()}>
              Imprimer la fiche
            </button>
          </div>
          {summary}
        </>
      )}
    </div>
  );
}
