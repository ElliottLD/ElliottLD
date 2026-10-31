import { Glossary } from "@/components/Glossary";
import { H1 } from "@/components/ui";
export const metadata = { title: "Glossaire FR/EN — GMAT Quant" };
export default function Page() {
  return (
    <div>
      <H1>Glossaire anglais → français</H1>
      <Glossary />
    </div>
  );
}
