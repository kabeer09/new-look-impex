import type { Metadata } from "next";
import { PageHero } from "@/components/public/Shared";

export const metadata: Metadata = {
  title: "Exhibitions & Trade Fairs | New Look Impex",
  description:
    "New Look Impex participates in leading Indian trade exhibitions including IHGF Delhi Fair. Meet us to explore handcrafted brass and copper collections.",
  alternates: { canonical: "https://newlookimpex.store/exhibitions" },
};

export default function ExhibitionsPage() {
  return (
    <>
      <PageHero
        title="Exhibitions & Trade Fairs"
        subtitle="Meet New Look Impex at leading Indian trade exhibitions and international sourcing events."
      />
      <div className="container-x section">
        <div className="card">
          <h2 className="font-serif font-bold text-navy text-xl">IHGF Delhi Fair</h2>
          <p className="text-sm text-gray mt-2">
            We participate in the IHGF Delhi Fair, one of India's largest handicrafts and gift fairs,
            showcasing handcrafted brass and copper collections to international buyers.
          </p>
          <p className="text-sm text-gray mt-2">
            Exhibition photos and participation details will be updated here. Contact us to schedule a
            meeting at our next exhibition booth.
          </p>
          <a href="/contact" className="btn btn-clay btn-sm mt-4 inline-block">Contact Us</a>
        </div>
        <p className="text-sm text-gray mt-6">
          (Exhibition gallery and verified participation records are managed from the admin dashboard.)
        </p>
      </div>
    </>
  );
}