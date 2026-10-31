"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, btn, btnPrimary, fmtSeconds } from "./ui";
import { Correction, QuestionBody, QuestionHeader } from "./QuestionCard";
import { recordAttempt, useStore } from "@/lib/storage";
import { lastAttempts } from "@/lib/progress";
import { LEVEL_LABEL, type Level, type Question } from "@/lib/types";

interface Result {
  q: Question;
  choice: number | null;
  seconds: number;
  date: string;
}

type Mode = "practice" | "timed";
const SECONDS_PER_QUESTION = 120;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sélection de la série puis lecture des questions (entraînement ou chronométré). */
export function Player({ questions }: { questions: Question[] }) {
  const [series, setSeries] = useState<{ qs: Question[]; mode: Mode } | null>(null);
  if (!series) return <SeriesPicker questions={questions} onStart={(qs, mode) => setSeries({ qs, mode })} />;
  return <Run key={series.qs.map((q) => q.id).join()} {...series} onExit={() => setSeries(null)} />;
}

function SeriesPicker({ questions, onStart }: { questions: Question[]; onStart: (qs: Question[], mode: Mode) => void }) {
  const store = useStore();
  const last = lastAttempts(store.attempts);
  const levels: Level[] = ["fondation", "intermediaire", "avance"];

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 font-semibold">Entraînement (correction immédiate)</h3>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => onStart(questions, "practice")}>
            Tout le chapitre ({questions.length})
          </button>
          {levels.map((l) => {
            const qs = questions.filter((q) => q.level === l);
            return (
              <button key={l} className={btn} disabled={!qs.length} onClick={() => onStart(qs, "practice")}>
                {LEVEL_LABEL[l]} ({qs.length})
              </button>
            );
          })}
          {(() => {
            const wrong = questions.filter((q) => last.get(q.id) && !last.get(q.id)!.correct);
            return (
              <button className={btn} disabled={!wrong.length} onClick={() => onStart(wrong, "practice")}>
                Mes erreurs ({wrong.length})
              </button>
            );
          })()}
        </div>
      </Card>
      <Card>
        <h3 className="mb-1 font-semibold">Mode chronométré</h3>
        <p className="mb-3 text-sm text-zinc-500">
          Ordre aléatoire, {fmtSeconds(SECONDS_PER_QUESTION)} par question en moyenne, correction à la fin.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => onStart(shuffle(questions), "timed")}>
            Chapitre complet chronométré ({questions.length} questions · {Math.round((questions.length * SECONDS_PER_QUESTION) / 60)} min)
          </button>
          {(() => {
            const hard = questions.filter((q) => q.level !== "fondation");
            return (
              <button className={btn} onClick={() => onStart(shuffle(hard), "timed")}>
                Intermédiaire + Avancé ({hard.length} · {Math.round((hard.length * SECONDS_PER_QUESTION) / 60)} min)
              </button>
            );
          })()}
        </div>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">Questions du chapitre</h3>
        <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          {questions.map((q) => {
            const a = last.get(q.id);
            return (
              <li key={q.id} className="flex items-center gap-3 py-1.5">
                <span className={a ? (a.correct ? "text-emerald-600" : "text-red-600") : "text-zinc-400"}>{a ? (a.correct ? "●" : "●") : "○"}</span>
                <span className="font-mono text-xs">{q.id}</span>
                <span className="text-zinc-500">{q.format}</span>
                <button className="ml-auto text-xs underline" onClick={() => onStart([q], "practice")}>
                  Faire
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Run({ qs, mode, onExit }: { qs: Question[]; mode: Mode; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(Date.now());
  const runStart = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const budget = qs.length * SECONDS_PER_QUESTION;

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finished]);

  const q = qs[index];
  const elapsedQ = Math.floor((now - startRef.current) / 1000);
  const elapsedRun = Math.floor((now - runStart.current) / 1000);

  function submit() {
    const seconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    const date = new Date().toISOString();
    if (selected !== null) {
      recordAttempt({ questionId: q.id, date, correct: selected === q.answer, seconds, choice: selected, mode });
    }
    const r = { q, choice: selected, seconds, date };
    setResults((rs) => [...rs, r]);
    if (mode === "practice") setRevealed(true);
    else next(true);
  }

  function next(fromSubmit = false) {
    if (index + 1 >= qs.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
    startRef.current = Date.now();
    setNow(Date.now());
    if (!fromSubmit) window.scrollTo({ top: 0 });
  }

  if (finished) return <Summary results={results} mode={mode} total={qs.length} elapsed={elapsedRun} onExit={onExit} />;

  const current = results[results.length - 1];
  const remaining = budget - elapsedRun;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <button className={btn} onClick={() => (results.length ? setFinished(true) : onExit())}>
          ← {results.length ? "Terminer la série" : "Retour"}
        </button>
        {mode === "timed" ? (
          <span className={`font-mono ${remaining < 0 ? "text-red-600" : ""}`}>
            ⏱ {remaining < 0 ? "+" : ""}
            {fmtSeconds(Math.abs(remaining))} {remaining < 0 ? "de dépassement" : "restantes"}
          </span>
        ) : (
          <span className="font-mono text-zinc-500">⏱ {fmtSeconds(revealed ? current.seconds : elapsedQ)}</span>
        )}
      </div>
      <Card>
        <QuestionHeader q={q} index={index} total={qs.length} />
        <QuestionBody q={q} selected={selected} onSelect={revealed ? undefined : setSelected} revealed={revealed} />
        <div className="mt-4 flex gap-2">
          {!revealed ? (
            <button className={btnPrimary} disabled={selected === null} onClick={submit}>
              Valider
            </button>
          ) : (
            <button className={btnPrimary} onClick={() => next()}>
              {index + 1 >= qs.length ? "Voir le bilan" : "Question suivante →"}
            </button>
          )}
        </div>
        {revealed && current && <Correction q={q} selected={current.choice} seconds={current.seconds} date={current.date} />}
      </Card>
    </div>
  );
}

function Summary({ results, mode, total, elapsed, onExit }: { results: Result[]; mode: Mode; total: number; elapsed: number; onExit: () => void }) {
  const correct = results.filter((r) => r.choice === r.q.answer).length;
  const [open, setOpen] = useState<string | null>(null);
  const avg = useMemo(() => (results.length ? results.reduce((s, r) => s + r.seconds, 0) / results.length : 0), [results]);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold">Bilan de la série</h3>
        <p className="mt-1 text-sm">
          <strong>
            {correct}/{results.length}
          </strong>{" "}
          bonnes réponses{results.length < total && ` (${total - results.length} non traitées)`} · temps moyen {fmtSeconds(avg)}
          {mode === "timed" && ` · temps total ${fmtSeconds(elapsed)} / ${fmtSeconds(total * SECONDS_PER_QUESTION)}`}
        </p>
        <button className={`${btn} mt-3`} onClick={onExit}>
          ← Nouvelle série
        </button>
      </Card>
      {results.map((r) => {
        const ok = r.choice === r.q.answer;
        return (
          <Card key={r.q.id + r.date}>
            <button className="flex w-full items-center gap-3 text-left text-sm" onClick={() => setOpen(open === r.q.id ? null : r.q.id)}>
              <span className={ok ? "text-emerald-600" : "text-red-600"}>{ok ? "✓" : "✗"}</span>
              <span className="font-mono text-xs">{r.q.id}</span>
              <span className="text-zinc-500">{fmtSeconds(r.seconds)}</span>
              <span className={`text-xs ${r.seconds > r.q.targetSeconds ? "text-amber-600" : "text-zinc-400"}`}>cible {fmtSeconds(r.q.targetSeconds)}</span>
              <span className="ml-auto text-xs underline">{open === r.q.id ? "Masquer" : "Voir la correction"}</span>
            </button>
            {open === r.q.id && (
              <div className="mt-3">
                <QuestionBody q={r.q} selected={r.choice} revealed />
                <Correction q={r.q} selected={r.choice} seconds={r.seconds} date={r.choice !== null ? r.date : undefined} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
