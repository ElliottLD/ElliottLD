import { describe, expect, it } from "vitest";
import { notionReport, chapterMastery, startOfWeek } from "@/lib/progress";
import { errorsToCsv, plainPrompt } from "@/lib/csv";
import { getQuestions, getQuestion } from "@/content";
import type { Attempt } from "@/lib/types";

const qs = getQuestions("A3");
const adv = qs.filter((q) => q.level === "avance" && q.notions.includes("A3.interets"));
const att = (id: string, correct: boolean, seconds = 100, date = "2026-11-10T10:00:00.000Z"): Attempt => ({
  questionId: id,
  date,
  correct,
  seconds,
  choice: 0,
});

describe("validation des notions", () => {
  it("non commencée sans tentative", () => {
    expect(notionReport("A3.interets", qs, [], []).status).toBe("non-commencee");
  });
  it("validée : Avancé réussies, temps OK", () => {
    const r = notionReport("A3.interets", qs, adv.map((q) => att(q.id, true)), []);
    expect(r.status).toBe("validee");
  });
  it("pas validée si trop lent", () => {
    expect(notionReport("A3.interets", qs, adv.map((q) => att(q.id, true, 200)), []).status).toBe("en-cours");
  });
  it("pas validée si devinée", () => {
    const attempts = adv.map((q) => att(q.id, true));
    const errors = attempts.map((a) => ({ id: "x", questionId: a.questionId, date: a.date, errorType: "Devinée juste" as const, note: "", reread: false }));
    expect(notionReport("A3.interets", qs, attempts, errors).status).not.toBe("validee");
  });
  it("en échec si tout raté", () => {
    expect(notionReport("A3.interets", qs, adv.map((q) => att(q.id, false)), []).status).toBe("echec");
  });
  it("seule la dernière tentative compte", () => {
    const a = adv.flatMap((q) => [att(q.id, false, 100, "2026-11-10T10:00:00.000Z"), att(q.id, true, 100, "2026-11-11T10:00:00.000Z")]);
    expect(notionReport("A3.interets", qs, a, []).status).toBe("validee");
  });
  it("pas validée avec une révision en retard", () => {
    expect(notionReport("A3.interets", qs, adv.map((q) => att(q.id, true)), [], 1).status).toBe("en-cours");
  });
  it("maîtrise du chapitre", () => {
    expect(chapterMastery(qs, [att(qs[0].id, true), att(qs[1].id, false)], [])).toBeCloseTo(1 / 15);
  });
  it("semaine commençant le lundi", () => {
    expect(startOfWeek(new Date(2026, 10, 15)).getDate()).toBe(9); // dim. 15 nov. → lun. 9 nov.
    expect(startOfWeek(new Date(2026, 10, 9)).getDate()).toBe(9);
  });
});

describe("export CSV Notion", () => {
  it("colonnes et valeurs", () => {
    const q = qs.find((x) => x.format === "DS")!;
    const csv = errorsToCsv(
      [{ id: "1", questionId: q.id, date: "2026-11-10T10:00:00.000Z", errorType: "Concept", note: 'base, "toujours"', reread: false }],
      getQuestion,
      () => "Pourcentages",
    );
    const lines = csv.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe("Question,Date,Section,Thème,Source,Type d'erreur,Difficulté,Règle retenue,Relue");
    expect(lines[1]).toContain("2026-11-10,Data Insights,A3 Pourcentages,Site Quant,Concept,");
    expect(lines[1]).toContain('"base, ""toujours"""');
    expect(lines[1].endsWith(",No")).toBe(true);
  });
  it("énoncé sans LaTeX", () => {
    expect(plainPrompt(String.raw`Quantity $A$ costs \$5`)).toBe("Quantity A costs $5");
  });
});
