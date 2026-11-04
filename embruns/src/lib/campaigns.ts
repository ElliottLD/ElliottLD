import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SegmentKey } from "@/lib/segments";

export type CampaignResult = {
  id: string;
  name: string;
  segment: SegmentKey | null;
  subject: string;
  offer: string | null;
  status: "draft" | "sending" | "sent";
  sentAt: string | null;
  recipients: number;
  opened: number;
  returned: number;
  returnRate: number | null;
  revenue14d: number;
};

/** Résultats calculés en SQL (campaign_results) : envois, ouvertures, retours sous 14 jours, CA associé. */
export async function getCampaignResults(merchantId: string): Promise<CampaignResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("campaign_results", { p_merchant_id: merchantId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.campaign_id),
    name: String(r.name),
    segment: (r.segment as SegmentKey | null) ?? null,
    subject: String(r.subject),
    offer: (r.offer as string | null) ?? null,
    status: r.status as CampaignResult["status"],
    sentAt: (r.sent_at as string | null) ?? null,
    recipients: Number(r.recipients),
    opened: Number(r.opened),
    returned: Number(r.returned),
    returnRate: r.return_rate === null ? null : Number(r.return_rate),
    revenue14d: Number(r.revenue_14d),
  }));
}
