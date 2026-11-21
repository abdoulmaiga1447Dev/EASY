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
    // Jamais d'appel à la vraie IA pendant les tests (quota, réseau) : les tests IA branchent une fausse IA.
    env: { GEMINI_API_KEY: "" },
    testTimeout: 30000,
  },
});
