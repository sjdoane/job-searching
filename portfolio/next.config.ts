import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root to portfolio/ — the repo root has its own lockfile
  // (the job-search suite), and Turbopack would otherwise infer that instead.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
