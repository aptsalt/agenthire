import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  transpilePackages: ["@agenthire/shared", "@agenthire/orchestrator"],
  ...(isGitHubPages && {
    output: "export",
    basePath: "/agenthire",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
