import type { Attempt, ErrorEntry, Question } from "./types";

export type NotionStatus = "validee" | "en-cours" | "non-commencee" | "echec";

export const VALIDATION = {
  minSuccess: 0.8, // ≥ 80 % de réussite sur les questions Avancé de la notion
  maxAvgSeconds: 150, // temps moyen ≤ 2 min 30
  failBelow: 0.5, // en dessous de 50 % (toutes tentées) → « en échec »
};

/** Une tentative « devinée juste » ne compte pas comme une vraie réussite. */
export function isGuessed(a: Attempt, errors: ErrorEntry[]): boolean {
  return errors.some((e) => e.questionId === a.questionId && e.date === a.date && e.errorType === "Devinée juste");
}

export function lastAttempts(attempts: Attempt[]): Map<string, Attempt> {
  const m = new Map<string, Attempt>();
  for (const a of attempts) {
    const prev = m.get(a.questionId);
    if (!prev || prev.date <= a.date) m.set(a.questionId, a);
  }
  return m;
}

export interface NotionReport {
  status: NotionStatus;
  questions: number; // questions de référence (Avancé, ou Intermédiaire à défaut)
  attempted: number;
  successRate: number; // sur les questions de référence (non tentée = ratée)
  avgSeconds: number | null;
}

/**
 * Validation d'une notion (spec 4.8) : questions Avancé de la notion réussies à ≥ 80 % (dernière tentative de
 * chacune), temps moyen ≤ 150 s. Le critère « aucune révision en retard de plus de 7 jours » est branché via
 * `overdueReviews` (moteur de répétition espacée).
 */
export function notionReport(
  notionId: string,
  questions: Question[],
  attempts: Attempt[],
  errors: ErrorEntry[],
  overdueReviews = 0,
): NotionReport {
  const tagged = questions.filter((q) => q.notions.includes(notionId));
  let ref = tagged.filter((q) => q.level === "avance");
  if (ref.length === 0) ref = tagged.filter((q) => q.level === "intermediaire");
  const last = lastAttempts(attempts);
  const anyAttempt = tagged.some((q) => last.has(q.id));

  if (ref.length === 0) {
    return { status: anyAttempt ? "en-cours" : "non-commencee", questions: 0, attempted: 0, successRate: 0, avgSeconds: null };
  }

  const done = ref.map((q) => last.get(q.id)).filter((a): a is Attempt => !!a);
  const correct = done.filter((a) => a.correct && !isGuessed(a, errors)).length;
  const successRate = correct / ref.length;
  const avgSeconds = done.length ? done.reduce((s, a) => s + a.seconds, 0) / done.length : null;

  let status: NotionStatus;
  if (!anyAttempt) status = "non-commencee";
  else if (
    done.length === ref.length &&
    successRate >= VALIDATION.minSuccess &&
    avgSeconds !== null &&
    avgSeconds <= VALIDATION.maxAvgSeconds &&
    overdueReviews === 0
  )
    status = "validee";
  else if (done.length === ref.length && successRate < VALIDATION.failBelow) status = "echec";
  else status = "en-cours";

  return { status, questions: ref.length, attempted: done.length, successRate, avgSeconds };
}

/** Maîtrise d'un chapitre : part des questions dont la dernière tentative est réussie (hors « devinée »). */
export function chapterMastery(questions: Question[], attempts: Attempt[], errors: ErrorEntry[]): number {
  if (questions.length === 0) return 0;
  const last = lastAttempts(attempts);
  const ok = questions.filter((q) => {
    const a = last.get(q.id);
    return a && a.correct && !isGuessed(a, errors);
  }).length;
  return ok / questions.length;
}

/** Début (lundi 00:00, heure locale) de la semaine contenant `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - day);
  return x;
}

export function secondsThisWeek(attempts: Attempt[], now: Date): number {
  const start = startOfWeek(now).getTime();
  return attempts.filter((a) => new Date(a.date).getTime() >= start).reduce((s, a) => s + a.seconds, 0);
}
