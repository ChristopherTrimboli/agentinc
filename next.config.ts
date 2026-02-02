import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "k66h8in2vmxpcqdj.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
