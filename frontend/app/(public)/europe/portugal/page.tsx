import type { Metadata } from "next";
import { getHiddenMarket, hiddenMetadata } from "@/lib/hidden-markets";
import { CountryLanding } from "@/components/public/CountryLanding";

const cfg = getHiddenMarket("portugal")!;
export const metadata: Metadata = hiddenMetadata(cfg);
export const revalidate = 300;

export default function PortugalPage() {
  return <CountryLanding cfg={cfg} />;
}
