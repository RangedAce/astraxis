/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@astraxis/shared'],
  experimental: {
    serverActions: false
  }
};

module.exports = nextConfig;
