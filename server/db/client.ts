import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { loadEnv } from "../lib/env.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;
  const { DATABASE_URL, NODE_ENV } = loadEnv();
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: NODE_ENV === "production" ? 10 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

export const db = drizzle(getPool());

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
