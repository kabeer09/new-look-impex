/** @type {import('next').NextConfig} */
const nextConfig = {
  // Many country pages fetch the public API during static generation. Fail-fast
  // fetch timeouts keep each page quick; this is a safety net for slow builds.
  staticPageGenerationTimeout: 180,
  images: {
    domains: ["luqgcacxkcrmhsdopjyl.supabase.co"],
  },
  async redirects() {
    // Legacy SEO URLs seeded from the old site — keep their link equity
    // instead of serving 404s.
    return [
      {
        source: "/brass-urli-wholesale",
        destination: "/brass-urli",
        permanent: true,
      },
      {
        source: "/brass-diya-wholesale",
        destination: "/brass-diya",
        permanent: true,
      },
      // Short market aliases — buyers type /us, /ca and /eu far more often
      // than the canonical /usa, /canada and /europe paths. Permanent (308)
      // so the alias consolidates onto one indexable URL instead of forking.
      {
        source: "/us",
        destination: "/usa",
        permanent: true,
      },
      {
        source: "/ca",
        destination: "/canada",
        permanent: true,
      },
      {
        source: "/eu",
        destination: "/europe",
        permanent: true,
      },
      {
        source: "/gb",
        destination: "/uk",
        permanent: true,
      },
      {
        source: "/australia",
        destination: "/au",
        permanent: true,
      },
      {
        source: "/uae/dubai",
        destination: "/uae",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;