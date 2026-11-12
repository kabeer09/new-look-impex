import type { Metadata } from "next";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { alternates: { canonical: `/categories/${params.slug}` } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}