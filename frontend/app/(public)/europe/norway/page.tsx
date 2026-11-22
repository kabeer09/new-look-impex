import type { Metadata } from "next";
import { getHiddenMarket, hiddenMetadata } from "@/lib/hidden-markets";
import { CountryLanding } from "@/components/public/CountryLanding";

const cfg = getHiddenMarket("norway")!;
export const metadata: Metadata = hiddenMetadata(cfg);
export const revalidate = 300;

export default function NorwayPage() {
  return <CountryLanding cfg={cfg} />;
}
