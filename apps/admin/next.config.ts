import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@leopard/ui"],
  typescript: {
    // Type-checking is handled by the `typecheck` script separately
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
