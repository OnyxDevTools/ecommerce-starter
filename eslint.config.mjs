// filename: eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
  globalIgnores([
    ".next/**",
    ".test-runtime/**",
    "test-results/**",
    "playwright-report/**",
    "lib/onyx/generated.ts",
  ]),
]);
