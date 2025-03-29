const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev, isServer }) => {
    // Only use MiniCssExtractPlugin in production client-side builds
    if (!dev && !isServer) {
      if (!config.plugins) {
        config.plugins = [];
      }
      
      // Add the MiniCssExtractPlugin
      config.plugins.push(
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash].css',
          chunkFilename: 'static/css/[id].[contenthash].css',
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
