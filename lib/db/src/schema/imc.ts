import { pgTable, serial, integer, date, numeric, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";
import { usersTable } from "./users";

export const imcMeasuresTable = pgTable("imc_measures", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  dateMesure: date("date_mesure").notNull().defaultNow(),
  poidsKg: numeric("poids_kg", { precision: 5, scale: 2 }).notNull(),
  tailleCm: numeric("taille_cm", { precision: 5, scale: 2 }).notNull(),
  imc: numeric("imc", { precision: 5, scale: 2 }),
  classification: text("classification"),
  actionRecommandee: text("action_recommandee"),
  note: text("note"),
  saisiPar: uuid("saisi_par").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ImcMeasure = typeof imcMeasuresTable.$inferSelect;
export type InsertImcMeasure = typeof imcMeasuresTable.$inferInsert;
