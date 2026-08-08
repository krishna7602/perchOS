import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://perchos.onrender.com";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "perchos.shop",
    "perch-os.vercel.app"
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
