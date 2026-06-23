/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "*.janeway.replit.dev",
    "*.picard.replit.dev",
    "*.replit.dev",
    "*.replit.app",
  ],
}

export default nextConfig
