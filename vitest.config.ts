import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mirror the tsconfig "@/*" path alias so tests can import "@/lib/...".
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
