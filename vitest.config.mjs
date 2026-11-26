import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Dummy values so config/env.js validates; tests never reach a real database
    env: {
      NODE_ENV: "test",
      DB_HOST: "127.0.0.1",
      DB_NAME: "maidaan_test",
      DB_USER: "test",
      JWT_ACCESS_SECRET: "test-secret-that-is-at-least-32-characters-long",
    },
  },
});
