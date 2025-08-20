const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  // Ensure server-side rendering and API routes are enabled
  output: undefined, // Remove any static export configuration
  trailingSlash: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Add fallback for root directory imports
    config.resolve.modules = [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, '.'),
      'node_modules'
    ];
    
    config.resolve.extensions = [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      ...config.resolve.extensions,
    ];
    
    return config;
  },
};

module.exports = nextConfig;