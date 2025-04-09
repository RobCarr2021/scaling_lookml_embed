import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["duckdb", "duckdb-lambda-x86"],
    serverMinification: false,
  },
  swcMinify: true,
};

export default nextConfig;
