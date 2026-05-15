import { pgTable, serial, integer, varchar, date, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";

export const santeMesuresTable = pgTable("sante_mesures", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  dateMesure: date("date_mesure").notNull(),
  poidsKg: numeric("poids_kg", { precision: 5, scale: 2 }),
  tailleCm: numeric("taille_cm", { precision: 5, scale: 1 }),
  imc: numeric("imc", { precision: 5, scale: 2 }),
  imcClassification: varchar("imc_classification", { length: 50 }),
  perimetre: numeric("perimetre", { precision: 5, scale: 1 }),
  etatNutritioNnel: varchar("etat_nutritionnel", { length: 80 }),
  actionRecommandee: text("action_recommandee"),
  note: text("note"),
  saisiePar: varchar("saisie_par", { length: 150 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vaccinationsTable = pgTable("vaccinations", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  vaccin: varchar("vaccin", { length: 100 }).notNull(),
  dateAdministration: date("date_administration"),
  dateProchainesDose: date("date_prochaine_dose"),
  lot: varchar("lot", { length: 50 }),
  centre: varchar("centre", { length: 150 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visitesMedicalesTable = pgTable("visites_medicales", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  dateVisite: date("date_visite").notNull(),
  motif: varchar("motif", { length: 200 }),
  medecin: varchar("medecin", { length: 150 }),
  diagnostic: text("diagnostic"),
  traitement: text("traitement"),
  suiteADonner: text("suite_a_donner"),
  dateProchain: date("date_prochain"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SanteMesure = typeof santeMesuresTable.$inferSelect;
export type Vaccination = typeof vaccinationsTable.$inferSelect;
export type VisiteMedicale = typeof visitesMedicalesTable.$inferSelect;
