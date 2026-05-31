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
    // Personal context: cloned repos (huge) + generated profile docs. Gitignored
    // and not part of the app — never lint them (linting _repos OOMs ESLint).
    "samcontext/**",
  ]),
]);

export default eslintConfig;
