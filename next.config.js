/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We’re not relying on Contentful types for builds here.
    ignoreBuildErrors: true,
  },
  webpack(config) {
    // shader support
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader", "glslify-loader"],
    });
    return config;
  },
  images: {
    domains: [
      "i.pravatar.cc",
      "jbbyipqzjsfnekfscvis.supabase.co",
      "pqlkkgtbvaegqqqnozvl.supabase.co",
      "pbs.twimg.com",
      "media.licdn.com",
      "unavatar.io",
      // Nitter instances for X profile images
      "nitter.poast.org",
      "nitter.privacydev.net",
      "nitter.woodland.cafe",
    ],
  },
  experimental: { serverActions: true },
  async headers() {
    return [
      {
        // CORS headers for Chrome extension API access
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },
      {
        source: "/security",
        destination: "/privacy",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
