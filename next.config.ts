import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // تحسين استيراد الحزم
    optimizePackageImports: ['lucide-react'],
  },
  // إعدادات لمعالجة تحذيرات CSS
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
