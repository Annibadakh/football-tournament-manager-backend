const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = [
  { ignores: ["node_modules", "coverage"] },
  { files: ["**/*.mjs"], languageOptions: { sourceType: "module" } },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-console": ["warn", { allow: ["error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
    },
  },
  {
    files: ["tests/**/*.js", "vitest.config.mjs"],
    languageOptions: { sourceType: "module", globals: { ...globals.node, ...globals.vitest } },
  },
  prettier,
];
