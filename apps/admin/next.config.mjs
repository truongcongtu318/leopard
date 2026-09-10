/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@leopard/ui"],
  typescript: {
    // Type-checking is handled by the `typecheck` script separately
    // TypeScript 7 breaks Next.js 16's build-time type checker worker.
    // Type-checking is handled by the `typecheck` script separately.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
