import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __backofficePgPool: pg.Pool | undefined;
}

const pool =
  globalThis.__backofficePgPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__backofficePgPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
