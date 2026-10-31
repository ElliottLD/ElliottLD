"use client";

import Link from "next/link";
import { BLOCKS, CHAPTERS } from "@/content/program";
import { hasContent } from "@/content";
import { allNotionReports } from "@/lib/notions";
import { VALIDATION } from "@/lib/progress";
import { useStore } from "@/lib/storage";
import { Card, H1, fmtSeconds } from "./ui";

const COLOR = {
  validee: "bg-emerald-500",
  "en-cours": "bg-amber-500",
  "non-commencee": "bg-red-500",
  echec: "bg-red-500",
};
const LABEL = { validee: "Validée", "en-cours": "En cours", "non-commencee": "Non commencée", echec: "En échec" };

export function Bilan() {
  const store = useStore();
  const reports = allNotionReports(store);
  const count = (s: keyof typeof COLOR) => reports.filter((r) => r.status === s).length;

  return (
    <div className="space-y-4">
      <H1>Bilan « Prêt pour janvier »</H1>
      <Card>
        <p className="text-sm">
          <span className="font-semibold text-emerald-600">{count("validee")} validées</span> ·{" "}
          <span className="font-semibold text-amber-600">{count("en-cours")} en cours</span> ·{" "}
          <span className="font-semibold text-red-600">{count("non-commencee") + count("echec")} non commencées ou en échec</span> · {reports.length} notions
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Une notion est validée quand ses questions Avancé sont réussies à {VALIDATION.minSuccess * 100} % ou plus (dernière tentative de chacune, les
          réponses « devinées » ne comptent pas), avec un temps moyen de {fmtSeconds(VALIDATION.maxAvgSeconds)} maximum, et sans révision en retard de
          plus de 7 jours.
        </p>
      </Card>
      {BLOCKS.map((b) => (
        <section key={b.id}>
          <h2 className="mb-2 font-semibold">
            Bloc {b.id} — {b.title}
          </h2>
          <div className="space-y-3">
            {CHAPTERS.filter((c) => c.block === b.id).map((c) => (
              <Card key={c.id} className="py-3">
                <div className="mb-1 flex items-center gap-2">
                  <Link href={`/chapitres/${c.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {c.id}. {c.title}
                  </Link>
                  {!hasContent(c.id) && <span className="text-xs text-zinc-400">contenu à venir</span>}
                </div>
                <ul className="space-y-1">
                  {reports
                    .filter((r) => r.chapter === c.id)
                    .map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-sm">
                        <span className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${COLOR[r.status]}`} title={LABEL[r.status]} />
                        <span className="flex-1">{r.label}</span>
                        {r.attempted > 0 && (
                          <span className="shrink-0 text-xs text-zinc-500">
                            {Math.round(r.successRate * 100)} % · {r.avgSeconds !== null ? fmtSeconds(r.avgSeconds) : "–"}
                          </span>
                        )}
                        {hasContent(c.id) && (
                          <span className="shrink-0 text-xs">
                            <Link href={`/chapitres/${c.id}#cours`} className="underline">
                              cours
                            </Link>{" "}
                            ·{" "}
                            <Link href={`/chapitres/${c.id}#exercices`} className="underline">
                              exercices
                            </Link>
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
