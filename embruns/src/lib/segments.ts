/** Segments clients (section 4.2) : libellés et règles affichés au commerçant. */
export const SEGMENTS = {
  new: { label: "Nouveaux", singular: "Nouveau", rule: "Première visite il y a moins de 30 jours", tone: "bg-sky-100 text-sky-900" },
  regular: { label: "Réguliers", singular: "Régulier", rule: "Au moins 3 visites sur les 90 derniers jours", tone: "bg-marine-100 text-marine-900" },
  vip: { label: "VIP", singular: "VIP", rule: "Top 10 % de la dépense sur 90 jours", tone: "bg-marine-900 text-white" },
  at_risk: {
    label: "À risque",
    singular: "À risque",
    rule: "Régulier dont la dernière visite date de plus de 2 fois son rythme habituel, et de plus de 21 jours",
    tone: "bg-corail-100 text-corail-600",
  },
  lost: { label: "Perdus", singular: "Perdu", rule: "Aucune visite depuis plus de 90 jours", tone: "bg-zinc-200 text-zinc-700" },
  occasional: { label: "Occasionnels", singular: "Occasionnel", rule: "N'entre dans aucun autre segment", tone: "bg-amber-100 text-amber-900" },
} as const;

export type SegmentKey = keyof typeof SEGMENTS;

export const SEGMENT_ORDER: SegmentKey[] = ["new", "regular", "vip", "at_risk", "lost", "occasional"];

export function parseSegment(value: unknown): SegmentKey | null {
  return typeof value === "string" && value in SEGMENTS ? (value as SegmentKey) : null;
}
