import { describe, expect, it } from "vitest";
import { addDays, localToday, parsePeriod, periodRange } from "./periods";

describe("périodes", () => {
  it("donne la date du jour dans le fuseau du commerce", () => {
    // 23 h 30 UTC le 31 décembre = déjà le 1er janvier à Paris.
    expect(localToday("Europe/Paris", new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(localToday("UTC", new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31");
  });

  it("ajoute des jours sans dépendre de l'heure d'été", () => {
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("les périodes se terminent hier et couvrent n jours complets", () => {
    expect(periodRange("7j", "2026-11-04")).toEqual({ start: "2026-10-28", end: "2026-11-03", days: 7 });
    expect(periodRange("12m", "2026-11-04")).toEqual({ start: "2025-11-04", end: "2026-11-03", days: 365 });
  });

  it("refuse une période inconnue", () => {
    expect(parsePeriod("90j")).toBe("90j");
    expect(parsePeriod("2ans")).toBe("30j");
    expect(parsePeriod(undefined, "7j")).toBe("7j");
  });
});
