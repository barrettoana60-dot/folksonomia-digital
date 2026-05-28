/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['onnxruntime-node', '@xenova/transformers'],
  webpack: (config) => {
    config.resolve.alias = {
        ...config.resolve.alias,
        "onnxruntime-node": false,
    }
    return config;
  },
  experimental: {
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
