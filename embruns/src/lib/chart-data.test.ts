import { describe, expect, it } from "vitest";
import { toWeeklyPoints } from "./chart-data";

describe("toWeeklyPoints", () => {
  it("regroupe par semaine du lundi au dimanche, semaines partielles comprises", () => {
    const days = [
      { day: "2026-11-01", revenue: 10, tickets: 1, identifiedRevenue: 0 }, // dimanche
      { day: "2026-11-02", revenue: 0, tickets: 0, identifiedRevenue: 0 }, // lundi
      { day: "2026-11-03", revenue: 20, tickets: 2, identifiedRevenue: 0 },
      { day: "2026-11-08", revenue: 5, tickets: 1, identifiedRevenue: 0 }, // dimanche
    ];
    const weeks = toWeeklyPoints(days);
    expect(weeks.map((w) => [w.start, w.end, w.revenue, w.tickets, w.partial])).toEqual([
      ["2026-10-26", "2026-11-01", 10, 1, true],
      ["2026-11-02", "2026-11-08", 25, 3, true],
    ]);
  });
});
