import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "../src/db/schema";

const email = process.argv[2] || "admin@ileopard.pl";
const password = process.argv[3] || "admin123";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      name: "Admin",
      email,
      passwordHash,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash },
    })
    .returning();

  console.log(`User created/updated: ${user.email} (id: ${user.id})`);
  await pool.end();
}

main();
