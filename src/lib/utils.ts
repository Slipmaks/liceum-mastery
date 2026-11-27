export { cn } from "cn"

/** A row id from a URL or a form: a positive integer that fits Postgres `integer`, so a huge number is a 404, not a DB error. */
export const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) <= 2_147_483_647
