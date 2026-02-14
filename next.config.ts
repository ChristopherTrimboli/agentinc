import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-collapsible",
      "date-fns",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "k66h8in2vmxpcqdj.public.blob.vercel-storage.com",
      },
    ],
  },
};

// withWorkflow() enables Vercel Workflow DevKit (durable long-running tasks).
// Works in both local development (using Local World) and production (Vercel).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withWorkflow } = require("workflow/next");
const exportedConfig = withWorkflow(nextConfig);

export default exportedConfig;
