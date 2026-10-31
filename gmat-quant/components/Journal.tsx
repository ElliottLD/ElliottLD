"use client";

import Link from "next/link";
import { useState } from "react";
import { CHAPTERS, getChapterInfo } from "@/content/program";
import { getQuestion } from "@/content";
import { errorsToCsv } from "@/lib/csv";
import { deleteError, updateError, useStore } from "@/lib/storage";
import { ERROR_TYPES, LEVEL_LABEL, type Level } from "@/lib/types";
import { Card, H1, btn } from "./ui";
import { Correction, QuestionBody } from "./QuestionCard";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Journal() {
  const store = useStore();
  const [chapter, setChapter] = useState("");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [from, setFrom] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const rows = store.errors
    .map((e) => ({ e, q: getQuestion(e.questionId) }))
    .filter(({ e, q }) => (!chapter || q?.chapter === chapter) && (!type || e.errorType === type) && (!level || q?.level === level) && (!from || e.date.slice(0, 10) >= from))
    .sort((a, b) => b.e.date.localeCompare(a.e.date));

  const select = "rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700";

  return (
    <div className="space-y-4">
      <H1>Journal d'erreurs</H1>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <select className={select} value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="">Tous les chapitres</option>
            {CHAPTERS.map((c) => (
              <option key={c.id} value={c.id} className="text-zinc-900">
                {c.id} {c.title}
              </option>
            ))}
          </select>
          <select className={select} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous les types</option>
            {ERROR_TYPES.map((t) => (
              <option key={t} className="text-zinc-900">
                {t}
              </option>
            ))}
          </select>
          <select className={select} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Tous les niveaux</option>
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <option key={l} value={l} className="text-zinc-900">
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm">
            depuis <input type="date" className={select} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <button
            className={`${btn} ml-auto`}
            disabled={!rows.length}
            onClick={() =>
              download(
                `journal-erreurs-quant-${new Date().toISOString().slice(0, 10)}.csv`,
                errorsToCsv(rows.map((r) => r.e), getQuestion, (id) => getChapterInfo(id)?.title ?? ""),
                "text/csv;charset=utf-8",
              )
            }
          >
            Export CSV (Notion)
          </button>
        </div>
      </Card>

      {rows.length === 0 && <p className="text-sm text-zinc-500">Aucune entrée. Après chaque correction, utilisez « Ajouter au journal ».</p>}

      {rows.map(({ e, q }) => (
        <Card key={e.id}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-xs">{e.questionId}</span>
            <span className="text-zinc-500">{new Date(e.date).toLocaleDateString("fr-FR")}</span>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">{e.errorType}</span>
            {q && <span className="text-xs text-zinc-500">{LEVEL_LABEL[q.level]}</span>}
            <label className="ml-auto flex items-center gap-1 text-xs">
              <input type="checkbox" checked={e.reread} onChange={(ev) => updateError(e.id, { reread: ev.target.checked })} /> Relue
            </label>
            <button className="text-xs text-red-600 underline" onClick={() => confirm("Supprimer cette entrée ?") && deleteError(e.id)}>
              Supprimer
            </button>
          </div>
          <label className="mt-2 block text-sm">
            <span className="text-xs text-zinc-500">Règle que je retiens</span>
            <textarea
              defaultValue={e.note}
              onBlur={(ev) => ev.target.value !== e.note && updateError(e.id, { note: ev.target.value })}
              rows={2}
              className="mt-1 w-full rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
            />
          </label>
          {q && (
            <div className="mt-2 flex gap-3 text-xs">
              <button className="underline" onClick={() => setOpen(open === e.id ? null : e.id)}>
                {open === e.id ? "Masquer la question" : "Revoir la question"}
              </button>
              <Link href={`/chapitres/${q.chapter}#cours`} className="underline">
                Cours {q.chapter}
              </Link>
            </div>
          )}
          {q && open === e.id && (
            <div className="mt-3">
              {(() => {
                const choice = store.attempts.find((a) => a.questionId === e.questionId && a.date === e.date)?.choice ?? null;
                return (
                  <>
                    <QuestionBody q={q} selected={choice} revealed />
                    <Correction q={q} selected={choice} />
                  </>
                );
              })()}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
