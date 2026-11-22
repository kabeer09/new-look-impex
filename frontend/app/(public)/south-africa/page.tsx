import type { Metadata } from "next";
import { getHiddenMarket, hiddenMetadata } from "@/lib/hidden-markets";
import { CountryLanding } from "@/components/public/CountryLanding";

const cfg = getHiddenMarket("south-africa")!;
export const metadata: Metadata = hiddenMetadata(cfg);
export const revalidate = 300;

export default function SouthAfricaPage() {
  return <CountryLanding cfg={cfg} />;
}
