import { describe, expect, it } from "vitest";
import { settingsSchema } from "./settings";

const valid = {
  name: "Au Pain Doré",
  business_type: "bakery",
  brand_color: "#0B2545",
  google_review_url: "",
  brand_tone: "warm",
  stamps_required: "10",
  reward_label: "Une viennoiserie offerte",
};

describe("settingsSchema", () => {
  it("accepte des réglages valides et normalise le lien vide", () => {
    const r = settingsSchema.parse(valid);
    expect(r.stamps_required).toBe(10);
    expect(r.google_review_url).toBeNull();
  });

  it("refuse un lien non https, une couleur invalide, un nombre de tampons hors bornes", () => {
    expect(settingsSchema.safeParse({ ...valid, google_review_url: "javascript:alert(1)" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, brand_color: "red" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, stamps_required: "1" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, stamps_required: "99" }).success).toBe(false);
  });
});
