import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The suite covers the data layer only, which is pure TypeScript, so there is no
// jsdom here and no component-testing dependencies to keep current.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
