import { Star } from "lucide-react";

/** Note sur 5 : étoiles pleines + libellé texte pour les lecteurs d'écran. */
export function Stars({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} étoile${rating > 1 ? "s" : ""} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true" className={`${size} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-marine-100"}`} />
      ))}
    </span>
  );
}
