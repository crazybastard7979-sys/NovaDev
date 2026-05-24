import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "@workspace/db";
import { logger } from "./logger.js";

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamp NOT NULL DEFAULT now()
    )
  `);

  const migrationsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../migrations"
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT 1 FROM _migrations WHERE name = $1",
      [file]
    );
    if (rows.length > 0) continue;

    logger.info({ migration: file }, "Applying migration");
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    logger.info({ migration: file }, "Migration applied");
  }
}
