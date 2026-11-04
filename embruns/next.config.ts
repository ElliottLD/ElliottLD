import type { NextConfig } from "next";

// Cache Components désactivé : toutes les pages commerçant dépendent de la
// session et des données du commerce (voir PROGRESS.md, décisions).
const nextConfig: NextConfig = {
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
