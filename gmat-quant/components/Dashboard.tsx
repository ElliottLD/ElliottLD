"use client";

import Link from "next/link";
import { CALENDAR, PREP_START, REVISION_START, itemLabel, weekFor } from "@/content/calendar";
import { CHAPTERS, getChapterInfo } from "@/content/program";
import { getQuestions, hasContent } from "@/content";
import { chapterMastery, secondsThisWeek, startOfWeek } from "@/lib/progress";
import { allNotionReports } from "@/lib/notions";
import { localDay, useHydrated, useStore } from "@/lib/storage";
import { Badge, Bar, Card, H1, btn } from "./ui";

const DAY = 86_400_000;
const STATUS_RANK = { echec: 0, "en-cours": 1, "non-commencee": 2, validee: 3 } as const;

export function Dashboard() {
  const store = useStore();
  const hydrated = useHydrated();
  const now = new Date();
  const today = localDay(now);
  const daysLeft = Math.ceil((new Date(`${PREP_START}T00:00:00`).getTime() - now.getTime()) / DAY);
  const reports = allNotionReports(store);
  const validated = reports.filter((r) => r.status === "validee").length;
  const week = weekFor(today);
  const nextWeek = week ?? (today < REVISION_START ? CALENDAR[0] : undefined);

  const weekStart = localDay(startOfWeek(now));
  const studySeconds = store.study.filter((s) => s.day >= weekStart).reduce((a, s) => a + s.seconds, 0);
  const hours = (secondsThisWeek(store.attempts, now) + studySeconds) / 3600;

  const weakest = reports
    .filter((r) => hasContent(r.chapter) && r.status !== "validee")
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.successRate - b.successRate)
    .slice(0, 3);

  if (!hydrated) return <H1>Tableau de bord</H1>;

  return (
    <div className="space-y-4">
      <H1>Tableau de bord</H1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-zinc-500">Début de la prépa (4 janvier 2027)</p>
          <p className="text-3xl font-bold">{daysLeft > 0 ? `J − ${daysLeft}` : "C'est parti !"}</p>
          <p className="mt-1 text-xs text-zinc-500">Objectif : page Bilan entièrement verte le 27 décembre.</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Prêt pour janvier</p>
          <p className="text-3xl font-bold">{Math.round((validated / reports.length) * 100)} %</p>
          <Bar value={validated / reports.length} className="mt-2" />
          <p className="mt-1 text-xs text-zinc-500">
            {validated} notions validées sur {reports.length} ·{" "}
            <Link href="/bilan" className="underline">
              voir le bilan
            </Link>
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">
            {week ? `Semaine ${week.week} (${week.label})` : nextWeek ? `Démarrage le lundi 9 novembre — semaine 1 (${nextWeek.label})` : "Programme terminé"}
          </h2>
          {nextWeek && (
            <span className="text-sm text-zinc-500">
              {hours.toFixed(1)} h / {nextWeek.hours} h cette semaine
            </span>
          )}
        </div>
        {nextWeek && (
          <>
            <Bar value={hours / nextWeek.hours} className="mb-3" />
            <ul className="flex flex-wrap gap-2">
              {nextWeek.items.map((it) => {
                const info = getChapterInfo(it);
                return (
                  <li key={it}>
                    {info ? (
                      <Link href={`/chapitres/${it}`} className={btn}>
                        {it} · {info.title}
                        {!hasContent(it) && <span className="ml-2 text-xs text-zinc-400">(à venir)</span>}
                      </Link>
                    ) : (
                      <span className={`${btn} cursor-default`}>
                        {itemLabel(it)} <span className="ml-2 text-xs text-zinc-400">(phase 2)</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Séance type (1 h 30) : 10 min calcul mental → 15 min révisions → 30 min cours → 30 min exercices → 5 min journal d'erreurs. Le programme du
          jour détaillé, le bouton « Je suis en retard » et les révisions espacées arrivent en phase 2.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Notions les plus faibles</h2>
        {weakest.length === 0 ? (
          <p className="text-sm text-zinc-500">Rien à signaler pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {weakest.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={n.status === "echec" ? "red" : n.status === "en-cours" ? "orange" : "zinc"}>{n.chapter}</Badge>
                <span className="flex-1">{n.label}</span>
                <Link href={`/chapitres/${n.chapter}#exercices`} className={btn}>
                  Travailler maintenant
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Maîtrise par chapitre</h2>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {CHAPTERS.map((c) => {
            const ready = hasContent(c.id);
            const m = chapterMastery(getQuestions(c.id), store.attempts, store.errors);
            return (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                <Link href={`/chapitres/${c.id}`} className="w-8 font-mono font-semibold underline-offset-2 hover:underline">
                  {c.id}
                </Link>
                {ready ? (
                  <>
                    <Bar value={m} />
                    <span className="w-10 text-right text-xs text-zinc-500">{Math.round(m * 100)} %</span>
                  </>
                ) : (
                  <span className="text-xs text-zinc-400">à venir</span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
