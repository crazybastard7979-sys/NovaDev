import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return { pool, db: drizzle(pool, { schema }) };
}

let _instance: ReturnType<typeof getDb> | null = null;

function getInstance() {
  if (!_instance) {
    _instance = getDb();
  }
  return _instance;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getInstance().pool as any)[prop];
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getInstance().db as any)[prop];
  },
});

export * from "./schema";
