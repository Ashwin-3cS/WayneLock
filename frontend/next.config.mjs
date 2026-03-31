/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      // Force WalletConnect's bundled pino dependency onto the browser build so
      // Turbopack does not crawl Node-only thread-stream test assets.
      pino: "./node_modules/pino/browser.js",
    },
  },
  serverExternalPackages: ["pino", "thread-stream"],
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^(tap|tape|why-is-node-running|pino-elasticsearch|desm|fastbench)$/,
      })
    );
    // Don't try to parse non-JS files inside thread-stream
    config.module.rules.push({
      test: /node_modules[\\/].*thread-stream[\\/](LICENSE|README\.md|.*\.sh$|.*\.zip$|.*\.ts$)/,
      use: "null-loader",
    });
    return config;
  },
};

export default nextConfig;
