import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const etablissementsTable = pgTable("etablissements", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 200 }).notNull().unique(),
  adresse: varchar("adresse", { length: 255 }),
  contact: varchar("contact", { length: 50 }),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Etablissement = typeof etablissementsTable.$inferSelect;
export type InsertEtablissement = typeof etablissementsTable.$inferInsert;
