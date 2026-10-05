import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["hr.masyconsulting.com"],
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
