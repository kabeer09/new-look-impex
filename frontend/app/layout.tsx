import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://newlookimpex.store"),
  title: "New Look Impex",
  description: "New Look Impex — brass & copper handicrafts wholesale from Moradabad, India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
