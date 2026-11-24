import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ponytail: neon-http has no interactive transactions; use db.batch() for atomic writes, switch to neon-serverless Pool if a flow needs read-then-write in one transaction.
export const db = drizzle(process.env.DATABASE_URL!, { schema, casing: "snake_case" });
