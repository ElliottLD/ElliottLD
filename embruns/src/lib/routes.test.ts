import { describe, expect, it } from "vitest";
import { MERCHANT_NAV, isMerchantPath, safeNextPath } from "./routes";

describe("routes", () => {
  it("expose les écrans du commerçant", () => {
    expect(MERCHANT_NAV.map((i) => i.label)).toEqual([
      "Accueil", "Analyses", "Clients", "Avis", "Prix", "Campagnes", "Assistant", "Réglages", "Scanner",
    ]);
  });

  it("protège l'espace commerçant, pas les pages publiques", () => {
    expect(isMerchantPath("/accueil")).toBe(true);
    expect(isMerchantPath("/clients/123")).toBe(true);
    expect(isMerchantPath("/commerce/nouveau")).toBe(true);
    expect(isMerchantPath("/prix/abc")).toBe(true);
    expect(isMerchantPath("/")).toBe(false);
    expect(isMerchantPath("/connexion")).toBe(false);
    expect(isMerchantPath("/accueillir")).toBe(false);
  });

  it("refuse les redirections vers un autre site", () => {
    expect(safeNextPath("/avis")).toBe("/avis");
    expect(safeNextPath("https://evil.test")).toBe("/accueil");
    expect(safeNextPath("//evil.test")).toBe("/accueil");
    expect(safeNextPath("/\\evil.test")).toBe("/accueil");
    expect(safeNextPath(null)).toBe("/accueil");
  });
});
