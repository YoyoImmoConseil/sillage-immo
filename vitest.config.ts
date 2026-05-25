import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "lib/**/__tests__/**/*.test.ts",
      "lib/**/__tests__/**/*.test.tsx",
    ],
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
