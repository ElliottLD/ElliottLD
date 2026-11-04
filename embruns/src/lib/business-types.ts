/** Types de commerce ciblés (section 1). Codes en anglais, libellés en français. */
export const BUSINESS_TYPES = [
  { value: "bakery", label: "Boulangerie-pâtisserie" },
  { value: "florist", label: "Fleuriste" },
  { value: "wine_shop", label: "Caviste" },
  { value: "delicatessen", label: "Épicerie fine" },
  { value: "hairdresser", label: "Coiffeur" },
  { value: "other", label: "Autre commerce" },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map((t) => t.value) as [BusinessType, ...BusinessType[]];
