import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { POST_MAP } from "../posts";

const SITE = "https://www.newlookimpex.store";

export function generateStaticParams() {
  return Object.keys(POST_MAP).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = POST_MAP[params.slug];
  if (!post) {
    return {
      title: { absolute: "Blog Post Not Found | New Look Impex" },
      robots: { index: false, follow: false },
    };
  }
  return {
    // layout template appends " | New Look Impex" — don't repeat it here
    title: post.title,
    description: post.description,
    alternates: { canonical: `${SITE}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `${SITE}/blog/${post.slug}`,
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = POST_MAP[params.slug];
  if (!post) {
    return (
      <div className="container-x section">
        <h1 className="font-serif font-bold text-navy text-3xl">Post not found</h1>
        <Link href="/blog" className="btn btn-outline mt-4">
          Back to blog
        </Link>
      </div>
    );
  }

  const canonical = `${SITE}/blog/${post.slug}`;

  // Article schema — genuine editorial content, verified date from the
  // shared posts module (same source as the visible date on /blog).
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: { "@type": "Organization", name: "New Look Impex", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "New Look Impex",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/logo-newlookimpex.jpg` },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Buying Guides", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <PageHero title={post.title} subtitle={post.description} />
      <article className="container-x section max-w-3xl">
        <nav className="text-xs text-gray mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-navy">Home</Link>
          <span className="mx-1">/</span>
          <Link href="/blog" className="hover:text-navy">Buying Guides</Link>
          <span className="mx-1">/</span>
          <span className="text-charcoal">{post.title}</span>
        </nav>

        <p className="text-xs text-gray mb-6">
          Published <time dateTime={post.date}>{post.date}</time> · New Look Impex, Moradabad
        </p>

        {post.sections.map((s) => (
          <section key={s.h2}>
            <h2 className="font-serif font-bold text-navy text-2xl mt-8 mb-3">{s.h2}</h2>
            {s.paras.map((para, i) => (
              <p key={i} className="text-gray leading-relaxed mb-4">
                {para}
              </p>
            ))}
          </section>
        ))}

        {/* Contextual internal links to real product categories/services */}
        <h2 className="font-serif font-bold text-navy text-2xl mt-10 mb-4">Related ranges & resources</h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          {post.links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block card p-4 hover:shadow-lg transition-shadow">
                <span className="font-semibold text-navy text-sm">{l.label}</span>
                <span className="block text-gray text-xs mt-1">{l.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Enquiry CTA — Phase 9 requirement */}
        <div className="mt-10 card p-6 bg-cream">
          <h2 className="font-serif font-bold text-navy text-xl">Discuss your requirement</h2>
          <p className="text-gray text-sm mt-2">
            Tell us the products and quantities you need — we respond with a written quotation
            covering price, MOQ, lead time and packaging.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/request-quote" className="btn btn-primary btn-sm">Request Wholesale Quote</Link>
            <Link href="/catalogue" className="btn btn-outline btn-sm">Request Catalogue</Link>
            <Link href="/contact" className="btn btn-ghost btn-sm">Contact Us</Link>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/blog" className="btn btn-outline btn-sm">
            ← Back to Buying Guides
          </Link>
        </div>
      </article>
    </>
  );
}
