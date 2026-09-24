import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.PAGES_BASE_PATH === "." ? "" : process.env.PAGES_BASE_PATH || "",
  assetPrefix: process.env.PAGES_BASE_PATH && process.env.PAGES_BASE_PATH !== "." ? process.env.PAGES_BASE_PATH : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
