import type { Metadata } from "next";
import { getHiddenMarket, hiddenMetadata } from "@/lib/hidden-markets";
import { CountryLanding } from "@/components/public/CountryLanding";

const cfg = getHiddenMarket("ireland")!;
export const metadata: Metadata = hiddenMetadata(cfg);
export const revalidate = 300;

export default function IrelandPage() {
  return <CountryLanding cfg={cfg} />;
}
