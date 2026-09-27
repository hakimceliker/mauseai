/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel supplies its own runtime. Keep standalone output only for Docker,
  // where the image copies `.next/standalone/server.js` into the runner.
  ...(process.env.BUILD_TARGET === 'docker' ? { output: 'standalone' } : {}),
};

export default nextConfig;
