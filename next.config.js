/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Remove after the inherited lint debt listed in ISSUES.md is cleared.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
