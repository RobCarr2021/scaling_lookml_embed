/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore specific build errors related to the Looker SDK
  typescript: {
    // Don't fail the build on TypeScript errors
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["duckdb", "duckdb-lambda-x86"],
    serverMinification: false,
  },
  swcMinify: true,
};

module.exports = nextConfig; 