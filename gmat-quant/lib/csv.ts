import type { ErrorEntry, Question } from "./types";
import { LEVEL_LABEL } from "./types";

export const NOTION_COLUMNS = ["Question", "Date", "Section", "Thème", "Source", "Type d'erreur", "Difficulté", "Règle retenue", "Relue"];

function cell(v: string): string {
  return /[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Énoncé lisible hors du site : sans LaTeX ni Markdown, tronqué. */
export function plainPrompt(md: string, max = 120): string {
  const t = md
    .replace(/\\\$/g, "$")
    .replace(/\$+([^$]*)\$+/g, "$1")
    .replace(/\\(dfrac|frac)\{([^}]*)\}\{([^}]*)\}/g, "$2/$3")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Export compatible avec la base Notion « Journal d'erreurs ». */
export function errorsToCsv(errors: ErrorEntry[], getQuestion: (id: string) => Question | undefined, chapterTitle: (id: string) => string): string {
  const rows = errors.map((e) => {
    const q = getQuestion(e.questionId);
    return [
      q ? `${q.id} — ${plainPrompt(q.prompt)}` : e.questionId,
      e.date.slice(0, 10),
      q?.format === "DS" ? "Data Insights" : "Quant",
      q ? `${q.chapter} ${chapterTitle(q.chapter)}` : "",
      "Site Quant",
      e.errorType,
      q ? LEVEL_LABEL[q.level] : "",
      e.note,
      e.reread ? "Yes" : "No",
    ];
  });
  // BOM UTF-8 pour qu'Excel et Notion lisent correctement les accents.
  return "﻿" + [NOTION_COLUMNS, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
