import {
  pgTable, serial, integer, varchar, char, date, boolean, timestamp, uuid, text
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const participantsTable = pgTable("participants", {
  id: serial("id").primaryKey(),
  numeroOrdre: integer("numero_ordre").notNull().unique(),
  nomPrenoms: varchar("nom_prenoms", { length: 200 }).notNull(),
  sexe: char("sexe", { length: 1 }).notNull(),
  dateNaissance: date("date_naissance"),
  statut: varchar("statut", { length: 20 }).notNull().default("actif"),
  photoUrl: varchar("photo_url", { length: 500 }),
  electrophorese: varchar("electrophorese", { length: 4 }),
  groupeSanguin: varchar("groupe_sanguin", { length: 4 }),
  allergies: text("allergies"),
  traitements: text("traitements"),
  village: varchar("village", { length: 100 }),
  quartier: varchar("quartier", { length: 100 }),
  contactParticipant: varchar("contact_participant", { length: 50 }),
  egliseParticipant: varchar("eglise_participant", { length: 150 }),
  dateBapteme: date("date_bapteme"),
  ecole: varchar("ecole", { length: 200 }),
  classe: varchar("classe", { length: 100 }),
  niveauScolaire: varchar("niveau_scolaire", { length: 50 }),
  vitChez: varchar("vit_chez", { length: 50 }),
  contactTuteur: varchar("contact_tuteur", { length: 50 }),
  religionTuteur: varchar("religion_tuteur", { length: 150 }),
  situationFamiliale: varchar("situation_familiale", { length: 50 }),
  pereVivant: boolean("pere_vivant"),
  mereVivante: boolean("mere_vivante"),
  dateInscription: date("date_inscription"),
  dateSortie: date("date_sortie"),
  motifSortie: varchar("motif_sortie", { length: 300 }),
  consentementPhoto: boolean("consentement_photo").default(false),
  consentementDonnees: boolean("consentement_donnees").default(false),
  observations: text("observations"),
  notesConfidentielles: text("notes_confidentielles"),
  dateDepartEffective: date("date_depart_effective"),
  transfert: varchar("transfert", { length: 150 }),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Participant = typeof participantsTable.$inferSelect;
export type InsertParticipant = typeof participantsTable.$inferInsert;
