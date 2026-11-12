/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
};

module.exports = nextConfig;