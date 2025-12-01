import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Database } from '../types/database';

/**
 * Create a Kysely instance from a D1 binding
 *
 * @param d1 - The D1 database binding from Cloudflare environment
 * @returns A Kysely instance configured for the D1 database
 *
 * @example
 * ```ts
 * // In a Cloudflare Pages Function
 * const db = createDb(context.env.DB);
 * const inquiries = await db
 *   .selectFrom('inquiries')
 *   .selectAll()
 *   .execute();
 * ```
 */
export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  });
}
