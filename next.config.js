/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow connections to local network for Ollama, gateway, etc.
  async rewrites() {
    return [
      {
        source: '/api/ollama/:path*',
        destination: 'http://localhost:11434/:path*',
      },
      {
        source: '/api/gateway/:path*',
        destination: 'http://localhost:18789/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
