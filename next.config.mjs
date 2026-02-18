/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: []
  },
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;

