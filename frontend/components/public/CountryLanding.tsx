import Link from "next/link";
import type { HiddenMarket } from "@/lib/hidden-markets";
import { HIDDEN_MARKETS } from "@/lib/hidden-markets";

const SITE = "https://www.newlookimpex.store";

/**
 * Photo-led country landing pages. Four distinct visual themes and per-country
 * imagery keep these SEO pages visibly different from one another and from the
 * standard regional pages. These pages are intentionally absent from main nav.
 */
export function CountryLanding({ cfg }: { cfg: HiddenMarket }) {
  const url = `${SITE}${cfg.path}`;
  // Organization schema is already emitted by the root layout — do not duplicate it.
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: cfg.h1,
      description: cfg.intro[0]?.slice(0, 160),
      url,
      inLanguage: "en",
      areaServed: { "@type": "Country", name: cfg.name },
      about: { "@type": "Thing", name: cfg.focus },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: cfg.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: cfg.faqs.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];

  // Dark heroes (theme 0) keep light gold; light layouts use AA-safe dark tones.
  const accentClass = cfg.theme === 0
    ? "text-gold"
    : cfg.accent === "text-gold" ? "text-gold-ink"
    : cfg.accent === "text-clay" ? "text-clay-dark"
    : cfg.accent;
  const eyebrow = (
    <p className={`eyebrow uppercase tracking-[0.22em] text-xs ${accentClass}`}>
      {cfg.focus}
    </p>
  );

  const ctas = (
    <div className="mt-7 flex flex-wrap gap-3">
      <Link href="/request-quote" className="btn btn-clay">Request a Wholesale Quote</Link>
      <Link href="/products" className="btn btn-ghost">Browse the Catalogue</Link>
    </div>
  );

  const heroImage = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cfg.hero} alt={`Handcrafted brass and copper products for buyers in ${cfg.name}`}
      className="h-full w-full object-cover" loading="eager" />
  );

  return (
    <div>
      {ld.map((item, i) => (
        <script key={i} type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}

      {/* THEME 0 — full-bleed photo hero with dark overlay */}
      {cfg.theme === 0 && (
        <section className="relative min-h-[440px] bg-espresso">
          <div className="absolute inset-0">{heroImage}</div>
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/95 via-espresso/70 to-espresso/30" />
          <div className="relative container-x py-20 md:py-28 max-w-3xl">
            <nav className="text-xs text-cream/60 mb-4" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-gold">Home</Link><span className="mx-2">/</span>{cfg.name}
            </nav>
            {eyebrow}
            <h1 className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-white leading-tight">{cfg.h1}</h1>
            <p className="mt-5 text-cream/85 leading-relaxed max-w-2xl">{cfg.intro[0]}</p>
            {ctas}
          </div>
        </section>
      )}

      {/* THEME 1 — split hero, photo on the left */}
      {cfg.theme === 1 && (
        <section className="bg-ivory">
          <div className="grid md:grid-cols-2 min-h-[440px]">
            <div className="relative min-h-[280px] md:min-h-full">{heroImage}</div>
            <div className="container-x py-14 md:py-20">
              <nav className="text-xs text-gray mb-4" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-clay">Home</Link><span className="mx-2">/</span>{cfg.name}
              </nav>
              {eyebrow}
              <h1 className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-espresso leading-tight">{cfg.h1}</h1>
              <p className="mt-5 text-gray leading-relaxed">{cfg.intro[0]}</p>
              {ctas}
            </div>
          </div>
        </section>
      )}

      {/* THEME 2 — wide photo banner with an overlapping content card */}
      {cfg.theme === 2 && (
        <section className="bg-cream">
          <div className="relative h-64 md:h-80 overflow-hidden">{heroImage}
            <div className="absolute inset-0 bg-espresso/25" />
          </div>
          <div className="container-x -mt-16 relative">
            <div className="bg-white border border-gold/25 shadow-sm p-8 md:p-12 max-w-4xl">
              <nav className="text-xs text-gray mb-4" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-clay">Home</Link><span className="mx-2">/</span>{cfg.name}
              </nav>
              {eyebrow}
              <h1 className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-espresso leading-tight">{cfg.h1}</h1>
              <p className="mt-5 text-gray leading-relaxed">{cfg.intro[0]}</p>
              {ctas}
            </div>
          </div>
        </section>
      )}

      {/* THEME 3 — editorial, narrow centred intro with framed photo */}
      {cfg.theme === 3 && (
        <section className="bg-white border-b border-gold/20">
          <div className="container-x py-16 max-w-3xl text-center">
            <nav className="text-xs text-gray mb-4" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-clay">Home</Link><span className="mx-2">/</span>{cfg.name}
            </nav>
            {eyebrow}
            <h1 className="mt-4 font-cormorant text-4xl md:text-5xl font-semibold text-espresso leading-tight">{cfg.h1}</h1>
            <p className="mt-5 text-gray leading-relaxed">{cfg.intro[0]}</p>
            <div className="mt-8 flex justify-center">{ctas}</div>
          </div>
          <div className="container-x pb-14 max-w-4xl">
            <div className="aspect-[16/7] overflow-hidden border border-gold/25">{heroImage}</div>
          </div>
        </section>
      )}

      <div className="container-x section max-w-5xl">
        <p className="text-gray leading-relaxed">{cfg.intro[1]}</p>

        <h2 className="font-serif font-bold text-espresso text-2xl mt-12">Wholesale range for {cfg.name}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {cfg.bullets.map((b) => (
            <li key={b} className="flex gap-3 bg-white border border-gold/15 p-4 text-sm text-charcoal">
              <span className={cfg.accent} aria-hidden="true">◆</span><span>{b}</span>
            </li>
          ))}
        </ul>

        {/* Per-country photo gallery — arrangements rotate with the theme */}
        <h2 className="font-serif font-bold text-espresso text-2xl mt-12">From our workshop</h2>
        <div className={`mt-5 grid gap-3 ${cfg.theme === 1 || cfg.theme === 3 ? "md:grid-cols-3" : "grid-cols-2 md:grid-cols-3"}`}>
          {cfg.gallery.map((src, i) => (
            <figure key={src} className={cfg.theme === 2 && i === 0 ? "col-span-2 md:col-span-1" : ""}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Handcrafted metal product ${i + 1} supplied to ${cfg.name}`}
                loading="lazy" className="h-52 w-full object-cover border border-gold/20" />
            </figure>
          ))}
        </div>

        <h2 className="font-serif font-bold text-espresso text-2xl mt-12">Buyer questions</h2>
        <div className="mt-5 space-y-5">
          {cfg.faqs.map(([q, a]) => (
            <div key={q} className="border-l-2 border-gold/40 pl-4">
              <h3 className="font-semibold text-espresso">{q}</h3>
              <p className="text-sm text-gray mt-1">{a}</p>
            </div>
          ))}
        </div>

        <section className="mt-14 border-t border-gold/20 pt-8">
          <h2 className="font-serif font-bold text-espresso text-xl">Other markets we serve</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {HIDDEN_MARKETS.filter((m) => m.slug !== cfg.slug).map((m) => (
              <li key={m.slug}>
                <Link href={m.path} className="text-sm text-navy hover:text-clay underline underline-offset-2">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
