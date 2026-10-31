import { describe, expect, it } from "vitest";
import katex from "katex";
import { ALL_QUESTIONS } from "@/content";
import { CHAPTERS, ALL_NOTIONS } from "@/content/program";
import { DS_LETTERS } from "@/lib/ds";
import type { ChoiceValue, Question } from "@/lib/types";

const EPS = 1e-6;

function same(a: ChoiceValue, b: ChoiceValue): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a));
  return a === b;
}

/** Extrait les formules $…$ et $$…$$ (en ignorant les \$ littéraux) pour vérifier qu'elles compilent. */
function mathSegments(text: string): string[] {
  const cleaned = text.replace(/\\\$/g, "");
  const out: string[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) out.push(m[1] ?? m[2]);
  const dollars = (cleaned.match(/\$/g) ?? []).length;
  if (dollars % 2 !== 0) throw new Error(`Nombre impair de $ non échappés dans : ${text.slice(0, 80)}…`);
  return out;
}

function allTexts(q: Question): string[] {
  return [q.prompt, ...(q.statements ?? []), ...q.choices, q.explanation, q.shortcut ?? "", ...q.traps.map((t) => t.why)];
}

describe("structure des questions", () => {
  const ids = new Set<string>();
  const notionIds = new Set(ALL_NOTIONS.map((n) => n.id));

  for (const q of ALL_QUESTIONS) {
    it(`${q.id} : structure valide`, () => {
      expect(ids.has(q.id), "id en double").toBe(false);
      ids.add(q.id);
      expect(q.choices).toHaveLength(5);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(5);
      expect(q.id.startsWith(`${q.chapter}-${q.level}-`)).toBe(true);
      expect(q.notions.length).toBeGreaterThan(0);
      for (const n of q.notions) expect(notionIds.has(n), `notion inconnue ${n}`).toBe(true);
      if (q.format === "DS") expect(q.statements).toHaveLength(2);
      for (const t of q.traps) {
        expect(t.choice).not.toBe(q.answer);
        expect(t.choice).toBeGreaterThanOrEqual(0);
        expect(t.choice).toBeLessThan(5);
      }
      expect(q.explanation.length).toBeGreaterThan(80);
      expect(new Set(q.choices).size, "choix en double").toBe(5);
    });

    it(`${q.id} : LaTeX valide`, () => {
      for (const text of allTexts(q)) {
        for (const tex of mathSegments(text)) {
          expect(() => katex.renderToString(tex, { throwOnError: true }), tex).not.toThrow();
        }
      }
    });
  }
});

describe("validation automatique des réponses (verify)", () => {
  for (const q of ALL_QUESTIONS.filter((q) => q.verifiedBy === "code")) {
    it(`${q.id} : verify() confirme la réponse et aucun autre choix`, () => {
      expect(q.verify, "verify manquant").toBeTypeOf("function");
      expect(q.choiceValues, "choiceValues manquant").toHaveLength(5);
      const values = q.choiceValues!;
      if (q.format === "DS") expect(values).toEqual([...DS_LETTERS]);
      const result = q.verify!();

      if (q.match === "closest") {
        expect(typeof result).toBe("number");
        const dist = values.map((v) => Math.abs((v as number) - (result as number)));
        const best = Math.min(...dist);
        expect(dist.indexOf(best)).toBe(q.answer);
        expect(dist.filter((d) => d === best)).toHaveLength(1);
      } else {
        const matches = values.map((v, i) => (same(v, result) ? i : -1)).filter((i) => i >= 0);
        expect(matches, `verify() = ${result}`).toEqual([q.answer]);
      }
    });
  }
});

describe("couverture des notions (chapitres rédigés)", () => {
  for (const c of CHAPTERS) {
    const qs = ALL_QUESTIONS.filter((q) => q.chapter === c.id);
    if (qs.length === 0) continue;
    it(`${c.id} : 15 questions (5 par niveau)`, () => {
      expect(qs).toHaveLength(15);
      for (const lvl of ["fondation", "intermediaire", "avance"]) {
        expect(qs.filter((q) => q.level === lvl)).toHaveLength(5);
      }
    });
    for (const n of c.notions) {
      it(`${n.id} : au moins 2 questions dont 1 Avancé`, () => {
        const tagged = qs.filter((q) => q.notions.includes(n.id));
        expect(tagged.length).toBeGreaterThanOrEqual(2);
        expect(tagged.some((q) => q.level === "avance")).toBe(true);
      });
    }
  }
});
