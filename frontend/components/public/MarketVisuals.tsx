import type { ReactNode } from "react";
import type { MarketVisual } from "@/lib/market-visuals";

/** Photo-led hero with four distinct layouts, reused by all established market pages. */
export function MarketHero({
  visual, eyebrow, h1, intro, breadcrumb, ctas,
}: {
  visual: MarketVisual;
  eyebrow: string;
  h1: string;
  intro: string;
  breadcrumb: ReactNode;
  ctas: ReactNode;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={visual.hero} alt={`Handcrafted brass and copper products for buyers in this market`}
      className="h-full w-full object-cover" loading="eager" />
  );
  // On light backgrounds the base gold/clay tones fail WCAG AA at small sizes;
  // use their darker ink variants. The dark hero (theme 0) keeps the light gold.
  const accentClass = visual.theme === 0
    ? "text-gold"
    : visual.accent === "text-gold" ? "text-gold-ink"
    : visual.accent === "text-clay" ? "text-clay-dark"
    : visual.accent;
  const eyebrowNode = (
    <p className={`eyebrow uppercase tracking-[0.22em] text-xs ${accentClass}`}>{eyebrow}</p>
  );

  if (visual.theme === 1) {
    return (
      <section className="bg-ivory" aria-labelledby="market-h1">
        <div className="grid md:grid-cols-2 min-h-[420px]">
          <div className="relative min-h-[260px] md:min-h-full">{img}</div>
          <div className="container-x py-14 md:py-20">
            <nav className="text-xs text-gray mb-4" aria-label="Breadcrumb">{breadcrumb}</nav>
            {eyebrowNode}
            <h1 id="market-h1" className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-espresso leading-tight">{h1}</h1>
            <p className="mt-5 text-gray leading-relaxed">{intro}</p>
            <div className="mt-7 flex flex-wrap gap-3">{ctas}</div>
          </div>
        </div>
      </section>
    );
  }

  if (visual.theme === 2) {
    return (
      <section className="bg-cream" aria-labelledby="market-h1">
        <div className="relative h-60 md:h-80 overflow-hidden">{img}
          <div className="absolute inset-0 bg-espresso/25" />
        </div>
        <div className="container-x -mt-14 relative">
          <div className="bg-white border border-gold/25 shadow-sm p-8 md:p-12 max-w-5xl">
            <nav className="text-xs text-gray mb-4" aria-label="Breadcrumb">{breadcrumb}</nav>
            {eyebrowNode}
            <h1 id="market-h1" className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-espresso leading-tight">{h1}</h1>
            <p className="mt-5 text-gray leading-relaxed">{intro}</p>
            <div className="mt-7 flex flex-wrap gap-3">{ctas}</div>
          </div>
        </div>
      </section>
    );
  }

  if (visual.theme === 3) {
    return (
      <section className="bg-white border-b border-gold/20" aria-labelledby="market-h1">
        <div className="container-x py-14 max-w-3xl text-center">
          <nav className="text-xs text-gray mb-4" aria-label="Breadcrumb">{breadcrumb}</nav>
          {eyebrowNode}
          <h1 id="market-h1" className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-espresso leading-tight">{h1}</h1>
          <p className="mt-5 text-gray leading-relaxed">{intro}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">{ctas}</div>
        </div>
        <div className="container-x pb-14 max-w-5xl">
          <div className="aspect-[16/7] overflow-hidden border border-gold/25">{img}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[420px] bg-espresso" aria-labelledby="market-h1">
      <div className="absolute inset-0">{img}</div>
      <div className="absolute inset-0 bg-gradient-to-r from-espresso/95 via-espresso/70 to-espresso/30" />
      <div className="relative container-x py-20 md:py-28 max-w-3xl">
        <nav className="text-xs text-cream/60 mb-4" aria-label="Breadcrumb">{breadcrumb}</nav>
        {eyebrowNode}
        <h1 id="market-h1" className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-white leading-tight">{h1}</h1>
        <p className="mt-5 text-cream/85 leading-relaxed max-w-2xl">{intro}</p>
        <div className="mt-7 flex flex-wrap gap-3">{ctas}</div>
      </div>
    </section>
  );
}

/** Market-specific photo gallery with a theme-dependent grid arrangement. */
export function MarketGallery({ images, name, theme }: { images: string[]; name: string; theme: number }) {
  return (
    <section className="mt-12" aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="font-cormorant text-2xl font-semibold text-espresso">
        Handcrafted metalwork for {name}
      </h2>
      <p className="mt-2 text-sm text-gray">
        Representative pieces from our Moradabad workshop. Finishes, sizes and packaging are confirmed per written quotation.
      </p>
      <div className={`mt-5 grid gap-3 ${theme === 3 ? "sm:grid-cols-3" : "grid-cols-2 md:grid-cols-3"}`}>
        {images.map((src, i) => (
          <figure key={src} className={theme === 2 && i === 0 ? "col-span-2 md:col-span-1" : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Handcrafted brass or copper product ${i + 1} supplied to ${name}`}
              loading="lazy" className="h-52 w-full object-cover border border-gold/20" />
          </figure>
        ))}
      </div>
    </section>
  );
}
