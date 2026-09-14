import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  // 已删除 ignoreBuildErrors / ignoreDuringBuilds，构建保持严格门禁
  // Next 15 的 allowedDevOrigins 是顶层配置，不属于 experimental
  allowedDevOrigins: [
    'http://192.168.31.218:3000',
    'http://192.168.31.*:3000',
  ],
  // Hide Next.js dev indicator overlay during visual QA / product screenshots.
  // React Grab stays opt-in via NEXT_PUBLIC_ENABLE_REACT_GRAB=1.
  devIndicators: false,
  // Brand assets use ?v= cache-bust; media proxy uses /m/{publicId}.
  images: {
    localPatterns: [
      { pathname: '/brand/**' },
      { pathname: '/m/**' },
      { pathname: '/logo.png' },
      { pathname: '/logo-small.png' },
      { pathname: '/icon.png' },
      { pathname: '/favicon.png' },
    ],
  },
};

export default withNextIntl(nextConfig);
