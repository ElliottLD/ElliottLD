import { Backup } from "@/components/Backup";
import { H1 } from "@/components/ui";
export const metadata = { title: "Sauvegarde — GMAT Quant" };
export default function Page() {
  return (
    <div>
      <H1>Sauvegarde de la progression</H1>
      <Backup />
    </div>
  );
}
