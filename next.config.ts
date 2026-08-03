import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["hr.masyconsulting.com"],
    },
  },
};

export default nextConfig;
