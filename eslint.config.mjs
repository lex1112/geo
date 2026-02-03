import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import jestPlugin from "eslint-plugin-jest";
import prettierConfig from "eslint-config-prettier";
import globals from "globals"; // Import the globals helper

export default [
  {
    // Global ignores must be in their own object at the top
    ignores: ["dist/", "node_modules/", "coverage/", "src/data/"],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
      // Standard Node.js globals (like process, console, etc.)
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "off",
    },
  },
  {
    // Test-specific configuration
    files: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    plugins: { jest: jestPlugin },
    languageOptions: {
      // FIX: Use the 'globals' package to inject jest environment
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      "jest/no-focused-tests": "error",
    },
  },
  prettierConfig,
];
