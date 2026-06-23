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
    "*.spock.replit.dev",
    "*.replit.dev",
    "*.replit.app",
  ],
  async headers() {
    return [
      {
        /* Apply security headers to every route */
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",         value: "DENY" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(), payment=()",
          },
        ],
      },
      {
        /* Prevent browsers from caching any API response */
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma",        value: "no-cache" },
        ],
      },
    ]
  },
}

export default nextConfig
