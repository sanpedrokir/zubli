import type { NextConfig } from "next";

// Static export keeps the door open for PWA hosting and a future Capacitor wrapper.
// See docs/02-architecture.md (D1) and CLAUDE.md for the rules this implies.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
