import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    // Les tests d'intégration partagent la base PostgreSQL de dev : on évite les
    // exécutions concurrentes qui se marcheraient dessus.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
