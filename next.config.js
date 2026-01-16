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
    ],
  },
  experimental: { serverActions: true },
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
