// Shared ESLint base for the TypeScript packages. Consumers set `root: true`
// and extend this; the parser/plugin resolve from this package's own
// node_modules, so a consumer only needs `eslint` itself installed.
module.exports = {
  env: { node: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/**", "node_modules/**", "**/*.d.ts"],
  rules: {
    // Underscore-prefixed args/vars are the deliberate "unused on purpose"
    // marker (e.g. hook signatures that must keep the parameter).
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
};
