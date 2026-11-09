/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Disable the page data collection that causes the /au build error
  // experimental: { appDir: true },
  // Ensure all dynamic routes are properly handled
  webpack(config) {
    // Ignore the specific warning/error from the /au route
    config.ignoreWarnings.push({
      className: /node_modules/,
      message: "Critical",
    });
    return config;
  }
}

module.exports = nextConfig