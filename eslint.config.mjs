import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scope lint to the Next.js frontend — non-web subprojects + vendored libs
    // have their own toolchains (Foundry, tsx) and shouldn't be ESLint'd here.
    "contracts/**",
    "oracle/**",
    "abi/**",
    "spike/**",
  ]),
]);

export default eslintConfig;
