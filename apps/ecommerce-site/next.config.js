const path = require('path');
const { loadEnvConfig } = require('@next/env');

// Load env values from both the app directory and the shared apps/.env file.
loadEnvConfig(__dirname, true);
loadEnvConfig(path.join(__dirname, '..'), true);

/** @type {import('next').NextConfig} */
const repoRoot = path.join(__dirname, '..', '..');
const sdkRoot = path.join(repoRoot, 'browser-agent-sdk');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias['@browser-agent-sdk/agent-core'] = path.join(
      sdkRoot,
      'packages',
      'agent-core',
      'src'
    );
    config.resolve.alias['@browser-agent-sdk/react-adapter'] = path.join(
      sdkRoot,
      'packages',
      'adapters',
      'react',
      'src'
    );
    config.resolve.alias['@browser-agent-sdk/vanilla-adapter'] = path.join(
      sdkRoot,
      'packages',
      'adapters',
      'vanilla',
      'src'
    );
    config.resolve.alias['@browser-agent-sdk/node-bridge'] = path.join(
      sdkRoot,
      'packages',
      'node-bridge',
      'src'
    );
    config.resolve.alias['@browser-agent-sdk/web-snippet'] = path.join(
      sdkRoot,
      'packages',
      'web-snippet',
      'src'
    );
    return config;
  },
};

module.exports = nextConfig
