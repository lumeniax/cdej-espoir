import { pgTable, serial, integer, varchar, date, text, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";
import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").references(() => participantsTable.id, { onDelete: "set null" }),
  type: varchar("type", { length: 30 }).notNull(),
  categorie: varchar("categorie", { length: 100 }),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  devise: varchar("devise", { length: 5 }).default("XOF"),
  date: date("date").notNull(),
  description: text("description"),
  referencePaiement: varchar("reference_paiement", { length: 100 }),
  numerRecu: varchar("numero_recu", { length: 50 }),
  donateur: varchar("donateur", { length: 200 }),
  modeReglement: varchar("mode_reglement", { length: 50 }),
  statut: varchar("statut", { length: 20 }).default("valide"),
  createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
