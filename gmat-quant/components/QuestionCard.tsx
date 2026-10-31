"use client";

import { useState } from "react";
import { Markdown } from "./Markdown";
import { Badge, btn, fmtSeconds } from "./ui";
import { addError, useStore } from "@/lib/storage";
import { ERROR_TYPES, LEVEL_LABEL, type ErrorType, type Question } from "@/lib/types";
import { notionLabel } from "@/content/program";

const LETTERS = ["A", "B", "C", "D", "E"];

export function QuestionHeader({ q, index, total }: { q: Question; index?: number; total?: number }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
      {index !== undefined && total !== undefined && (
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Question {index + 1}/{total}
        </span>
      )}
      <Badge tone={q.level === "avance" ? "red" : q.level === "intermediaire" ? "orange" : "green"}>{LEVEL_LABEL[q.level]}</Badge>
      <Badge tone="blue">{q.format === "DS" ? "Data Sufficiency" : "Problem Solving"}</Badge>
      <span>Temps cible : {fmtSeconds(q.targetSeconds)}</span>
      <span className="ml-auto font-mono text-xs">{q.id}</span>
    </div>
  );
}

export function QuestionBody({
  q,
  selected,
  onSelect,
  revealed,
}: {
  q: Question;
  selected: number | null;
  onSelect?: (i: number) => void;
  revealed: boolean;
}) {
  return (
    <div>
      <Markdown>{q.prompt}</Markdown>
      {q.statements && (
        <ol className="my-3 space-y-1 pl-1">
          {q.statements.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold">({i + 1})</span>
              <Markdown inline>{s}</Markdown>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 space-y-2">
        {q.choices.map((c, i) => {
          const isAnswer = i === q.answer;
          const isSelected = i === selected;
          let cls = "border-zinc-300 dark:border-zinc-700";
          if (revealed && isAnswer) cls = "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
          else if (revealed && isSelected) cls = "border-red-600 bg-red-50 dark:bg-red-950/40";
          else if (isSelected) cls = "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800";
          return (
            <button
              key={i}
              disabled={revealed || !onSelect}
              onClick={() => onSelect?.(i)}
              className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left ${cls} ${!revealed && onSelect ? "hover:bg-zinc-50 dark:hover:bg-zinc-900" : ""}`}
            >
              <span className="font-semibold">{LETTERS[i]}</span>
              <Markdown inline>{c}</Markdown>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Correction({ q, selected, seconds, date }: { q: Question; selected: number | null; seconds?: number; date?: string }) {
  const correct = selected === q.answer;
  const trap = selected !== null && !correct ? q.traps.find((t) => t.choice === selected) : undefined;
  return (
    <div className="mt-5 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-lg font-semibold ${correct ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
          {selected === null ? "Sans réponse" : correct ? "Bonne réponse" : "Mauvaise réponse"}
        </span>
        <span className="text-sm text-zinc-500">
          Réponse : {LETTERS[q.answer]}
          {seconds !== undefined && <> · Temps : {fmtSeconds(seconds)} (cible {fmtSeconds(q.targetSeconds)})</>}
        </span>
      </div>
      {trap && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <strong>Pourquoi {LETTERS[trap.choice]} est un piège : </strong>
          <Markdown inline>{trap.why}</Markdown>
        </div>
      )}
      <div>
        <h3 className="mb-1 font-semibold">Explication</h3>
        <Markdown>{q.explanation}</Markdown>
      </div>
      {q.shortcut && (
        <div className="rounded-md border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/30">
          <strong>Méthode rapide : </strong>
          <Markdown inline>{q.shortcut}</Markdown>
        </div>
      )}
      {q.traps.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Les pièges derrière les mauvaises réponses</summary>
          <ul className="mt-2 space-y-1">
            {q.traps.map((t) => (
              <li key={t.choice} className="flex gap-2">
                <span className="font-semibold">{LETTERS[t.choice]}</span>
                <Markdown inline>{t.why}</Markdown>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-zinc-500">Notions : {q.notions.map(notionLabel).join(" · ")}</p>
      {date && <ErrorLogForm q={q} date={date} correct={correct} />}
    </div>
  );
}

function ErrorLogForm({ q, date, correct }: { q: Question; date: string; correct: boolean }) {
  const store = useStore();
  const existing = store.errors.find((e) => e.questionId === q.id && e.date === date);
  const [type, setType] = useState<ErrorType>(correct ? "Devinée juste" : "Concept");
  const [note, setNote] = useState("");

  if (existing) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
        ✓ Ajoutée au journal d'erreurs ({existing.errorType}).
      </p>
    );
  }
  const types = correct ? (["Devinée juste"] as ErrorType[]) : ERROR_TYPES.filter((t) => t !== "Devinée juste");
  return (
    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
      <p className="mb-2 text-sm font-semibold">{correct ? "Réponse trouvée au hasard ?" : "Ajouter au journal d'erreurs"}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={type} onChange={(e) => setType(e.target.value as ErrorType)} className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700">
          {types.map((t) => (
            <option key={t} value={t} className="text-zinc-900">
              {t}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Règle que je retiens (facultatif)"
          className="flex-1 rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
        />
        <button className={btn} onClick={() => addError({ questionId: q.id, date, errorType: type, note, reread: false })}>
          {correct ? "Marquer « devinée »" : "Ajouter au journal"}
        </button>
      </div>
    </div>
  );
}
