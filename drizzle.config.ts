import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit config for generating SQL migrations when the schema changes.
 * Day-to-day startup does NOT need this — src/lib/db/index.ts bootstraps tables
 * idempotently. Use this only when evolving the schema:
 *   npx drizzle-kit generate   # create migration SQL from schema.ts
 *
 * The actual DB lives outside the repo (see src/lib/db/paths.ts).
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
