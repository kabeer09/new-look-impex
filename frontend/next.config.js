/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    domains: ["luqgcacxkcrmhsdopjyl.supabase.co"],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },
  compress: true,
  poweredByHeader: false,
};
module.exports = nextConfig;
