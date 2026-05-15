import { pgTable, serial, integer, varchar, date, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";

export const bulletinsTable = pgTable("bulletins", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  anneeScolaire: varchar("annee_scolaire", { length: 20 }).notNull(),
  trimestre: integer("trimestre"),
  ecole: varchar("ecole", { length: 200 }),
  classe: varchar("classe", { length: 100 }),
  moyenne: numeric("moyenne", { precision: 5, scale: 2 }),
  rang: integer("rang"),
  totalEleves: integer("total_eleves"),
  appreciation: varchar("appreciation", { length: 200 }),
  observation: text("observation"),
  bulletinScanUrl: varchar("bulletin_scan_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fraisScolairesTable = pgTable("frais_scolaires", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  anneeScolaire: varchar("annee_scolaire", { length: 20 }).notNull(),
  typefrais: varchar("type_frais", { length: 100 }).notNull(),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  datePaiement: date("date_paiement"),
  statut: varchar("statut", { length: 20 }).default("paye"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Bulletin = typeof bulletinsTable.$inferSelect;
export type FraisScolaire = typeof fraisScolairesTable.$inferSelect;
