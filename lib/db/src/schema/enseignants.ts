import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const enseignantsTable = pgTable("enseignants", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 150 }).notNull().unique(),
  classe: varchar("classe", { length: 100 }),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Enseignant = typeof enseignantsTable.$inferSelect;
export type InsertEnseignant = typeof enseignantsTable.$inferInsert;
