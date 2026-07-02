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
    // Neon's pooler (PgBouncer) recycles idle connections and Neon compute
    // autosuspends; TCP keepalive keeps borrowed sockets from silently dying.
    keepAlive: true,
  });
  // CRITICAL: without this listener, an error on an *idle* pooled client
  // (Neon dropping a recycled/autosuspended connection) is emitted with no
  // handler and Node treats it as an uncaught exception — crashing the whole
  // process (dumps the raw pg Client + "Node.js vXX", then Railway restarts).
  // Log and let the pool evict the dead client; live queries just reconnect.
  pool.on("error", (err) => {
    console.error("[db] idle pool client error (non-fatal, connection evicted):", err.message);
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
