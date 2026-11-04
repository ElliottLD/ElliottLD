/**
 * Normalise un numéro de téléphone saisi en France vers le format E.164
 * (+33…), utilisé pour le dédoublonnage et la recherche. Renvoie null si la
 * saisie ne ressemble pas à un numéro.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const plus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (plus) return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^0[1-9]\d{8}$/.test(digits)) digits = `33${digits.slice(1)}`;
  else if (/^[1-9]\d{8}$/.test(digits)) digits = `33${digits}`;
  return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
}
