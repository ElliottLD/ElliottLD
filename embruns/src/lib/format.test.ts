import { describe, expect, it } from "vitest";
import { formatChange, formatDay, formatEuros, formatPointsChange, relativeChange } from "./format";

// Les espaces insécables de Intl sont normalisés pour la lisibilité des attentes.
const n = (s: string) => s.replace(/ | /g, " ");

describe("format", () => {
  it("montants en euros à la française", () => {
    expect(n(formatEuros(10349.25))).toBe("10 349 €");
  });

  it("variations signées, base nulle gérée", () => {
    expect(relativeChange(110, 100)).toBeCloseTo(0.1);
    expect(relativeChange(5, 0)).toBeNull();
    expect(n(formatChange(0.123))).toBe("+12,3 %");
    expect(n(formatChange(-0.04))).toBe("−4,0 %");
  });

  it("variations de parts en points", () => {
    expect(formatPointsChange(0.37, 0.335)).toBe("+3,5 pts");
    expect(formatPointsChange(0.3, 0.31)).toBe("−1,0 pt");
  });

  it("dates courtes", () => {
    expect(formatDay("2026-11-03")).toBe("3 nov.");
  });
});
