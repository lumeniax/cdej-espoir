import { pgTable, uuid, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { enseignantsTable } from "./enseignants";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  nomComplet: varchar("nom_complet", { length: 150 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("viewer"),
  enseignantId: integer("enseignant_id").references(() => enseignantsTable.id, { onDelete: "set null" }),
  actif: boolean("actif").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
