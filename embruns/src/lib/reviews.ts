import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ReviewSummary = {
  reviewsCount: number;
  ratingAvg: number | null;
  ratingAvg90dAgo: number | null;
  newReviews90d: number;
  ratingAvgLast30d: number | null;
  toHandle: number;
  responseRate: number | null;
};

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getReviewSummary(merchantId: string): Promise<ReviewSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_summary", { p_merchant_id: merchantId }).single();
  if (error) throw error;
  const r = data as Record<string, unknown>;
  return {
    reviewsCount: Number(r.reviews_count),
    ratingAvg: n(r.rating_avg),
    ratingAvg90dAgo: n(r.rating_avg_90d_ago),
    newReviews90d: Number(r.new_reviews_90d),
    ratingAvgLast30d: n(r.rating_avg_last_30d),
    toHandle: Number(r.to_handle),
    responseRate: n(r.response_rate),
  };
}

export type ReviewFilter = "to_handle" | "replied" | "all";

export function parseReviewFilter(v: unknown): ReviewFilter {
  return v === "replied" || v === "all" ? v : "to_handle";
}

export const REVIEWS_PAGE_SIZE = 20;

export async function listReviews(merchantId: string, filter: ReviewFilter, page: number) {
  const supabase = await createClient();
  let query = supabase
    .from("reviews")
    .select("id, rating, body, author_name, published_at, reply, replied_at, status", { count: "exact" })
    .eq("merchant_id", merchantId);
  if (filter !== "all") query = query.eq("status", filter);
  const from = (page - 1) * REVIEWS_PAGE_SIZE;
  const { data, error, count } = await query
    .order("published_at", { ascending: filter === "to_handle" })
    .range(from, from + REVIEWS_PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/** Répartition des notes (1 à 5 étoiles). */
export async function getRatingDistribution(merchantId: string) {
  const supabase = await createClient();
  const counts = [5, 4, 3, 2, 1].map(async (rating) => {
    const { count, error } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .eq("rating", rating);
    if (error) throw error;
    return { rating, count: count ?? 0 };
  });
  return Promise.all(counts);
}
