/** Les 8 écrans de l'espace commerçant (section 3). */
export const MERCHANT_NAV = [
  { href: "/accueil", label: "Accueil", icon: "home" },
  { href: "/analyses", label: "Analyses", icon: "chart" },
  { href: "/clients", label: "Clients", icon: "users" },
  { href: "/avis", label: "Avis", icon: "star" },
  { href: "/prix", label: "Prix", icon: "tag" },
  { href: "/campagnes", label: "Campagnes", icon: "mail" },
  { href: "/assistant", label: "Assistant", icon: "chat" },
  { href: "/reglages", label: "Réglages", icon: "settings" },
  { href: "/scanner", label: "Scanner", icon: "scan" },
] as const;

export type NavIcon = (typeof MERCHANT_NAV)[number]["icon"];

const PROTECTED_PREFIXES = [...MERCHANT_NAV.map((item) => item.href), "/commerce"];

/** Vrai pour toute page qui exige un commerçant connecté. */
export function isMerchantPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** N'accepte qu'un chemin interne pour la redirection après connexion. */
export function safeNextPath(value: string | null | undefined, fallback = "/accueil"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
