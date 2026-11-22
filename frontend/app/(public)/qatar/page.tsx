import type { Metadata } from "next";
import { getHiddenMarket, hiddenMetadata } from "@/lib/hidden-markets";
import { CountryLanding } from "@/components/public/CountryLanding";

const cfg = getHiddenMarket("qatar")!;
export const metadata: Metadata = hiddenMetadata(cfg);
export const revalidate = 300;

export default function QatarPage() {
  return <CountryLanding cfg={cfg} />;
}
