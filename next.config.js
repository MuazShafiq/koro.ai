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
    // Custom resolver for @ alias that checks both src and app directories
    const originalResolve = config.resolve;
    config.resolve = {
      ...originalResolve,
      alias: {
        ...originalResolve.alias,
        '@': path.resolve(__dirname, 'src'),
      },
      modules: [
        path.resolve(__dirname, 'src'),
        path.resolve(__dirname, 'app'),
        path.resolve(__dirname, '.'),
        'node_modules'
      ],
      extensions: [
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        ...originalResolve.extensions,
      ],
    };
    
    // Add a custom plugin to handle @ imports with fallback to app directory
    config.plugins = config.plugins || [];
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.normalModuleFactory.tap('CustomAliasResolver', (factory) => {
          factory.hooks.beforeResolve.tap('CustomAliasResolver', (resolveData) => {
            if (resolveData.request && resolveData.request.startsWith('@/')) {
              const fs = require('fs');
              const srcPath = path.resolve(__dirname, 'src', resolveData.request.slice(2));
              const appPath = path.resolve(__dirname, 'app', resolveData.request.slice(2));
              
              // Check if file exists in src first, then app
              if (fs.existsSync(srcPath + '.ts') || fs.existsSync(srcPath + '.tsx') || fs.existsSync(srcPath + '.js') || fs.existsSync(srcPath + '.jsx') || fs.existsSync(srcPath + '/index.ts') || fs.existsSync(srcPath + '/index.tsx')) {
                resolveData.request = srcPath;
              } else if (fs.existsSync(appPath + '.ts') || fs.existsSync(appPath + '.tsx') || fs.existsSync(appPath + '.js') || fs.existsSync(appPath + '.jsx') || fs.existsSync(appPath + '/index.ts') || fs.existsSync(appPath + '/index.tsx')) {
                resolveData.request = appPath;
              }
            }
          });
        });
      }
    });
    
    return config;
  },
};

module.exports = nextConfig;