import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireMerchant } from "@/lib/merchant";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scanner" };

export default async function ScannerPage() {
  const merchant = await requireMerchant();
  return (
    <>
      <PageHeader title="Scanner" description="Un tampon par visite : scannez la carte du client ou retrouvez-le par son téléphone." />
      <Scanner stampsRequired={merchant.stamps_required} rewardLabel={merchant.reward_label} />
    </>
  );
}
