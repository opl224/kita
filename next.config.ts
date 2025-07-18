
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  
  // This allows generating dynamic routes on-demand when using `output: 'export'`.
  // When a user visits a dynamic route not pre-rendered at build time, Next.js
  // will generate it on the fly.
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
