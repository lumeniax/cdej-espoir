import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";

export const tuteursTable = pgTable("tuteurs", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 100 }).notNull(),
  prenoms: varchar("prenoms", { length: 150 }),
  telephone: varchar("telephone", { length: 30 }),
  telephoneAlternatif: varchar("telephone_alternatif", { length: 30 }),
  village: varchar("village", { length: 100 }),
  quartier: varchar("quartier", { length: 100 }),
  profession: varchar("profession", { length: 150 }),
  eglise: varchar("eglise", { length: 150 }),
  situationFamiliale: varchar("situation_familiale", { length: 50 }),
  niveauAlphabetisation: varchar("niveau_alphabetisation", { length: 50 }),
  personneUrgenceNom: varchar("personne_urgence_nom", { length: 200 }),
  personneUrgenceTel: varchar("personne_urgence_tel", { length: 30 }),
  observations: text("observations"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participantTuteursTable = pgTable("participant_tuteurs", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  tuteurId: integer("tuteur_id").notNull().references(() => tuteursTable.id, { onDelete: "cascade" }),
  relation: varchar("relation", { length: 80 }).notNull(),
  estPrincipal: varchar("est_principal", { length: 1 }).default("N"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tuteur = typeof tuteursTable.$inferSelect;
export type InsertTuteur = typeof tuteursTable.$inferInsert;
export type ParticipantTuteur = typeof participantTuteursTable.$inferSelect;
