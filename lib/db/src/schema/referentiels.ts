import { pgTable, serial, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const referentielsTable = pgTable("referentiels", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 40 }).notNull(),
  valeur: varchar("valeur", { length: 100 }).notNull(),
  ordre: integer("ordre").notNull().default(0),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Referentiel = typeof referentielsTable.$inferSelect;
export type InsertReferentiel = typeof referentielsTable.$inferInsert;
