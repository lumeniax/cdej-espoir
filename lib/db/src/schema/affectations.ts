import { pgTable, serial, integer, date, uuid, varchar } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";
import { enseignantsTable } from "./enseignants";
import { etablissementsTable } from "./etablissements";
import { usersTable } from "./users";

export const eleveEnseignantTable = pgTable("eleve_enseignant", {
  id: serial("id").primaryKey(),
  eleveId: integer("eleve_id").notNull().unique().references(() => participantsTable.id, { onDelete: "cascade" }),
  enseignantId: integer("enseignant_id").notNull().references(() => enseignantsTable.id, { onDelete: "restrict" }),
  dateAffectation: date("date_affectation").notNull().defaultNow(),
  creePar: uuid("cree_par").references(() => usersTable.id),
});

export const eleveEtablissementTable = pgTable("eleve_etablissement", {
  id: serial("id").primaryKey(),
  eleveId: integer("eleve_id").notNull().unique().references(() => participantsTable.id, { onDelete: "cascade" }),
  etablissementId: integer("etablissement_id").notNull().references(() => etablissementsTable.id, { onDelete: "restrict" }),
  anneeScolaire: varchar("annee_scolaire", { length: 9 }),
  classe: varchar("classe", { length: 50 }),
  dateInscription: date("date_inscription").notNull().defaultNow(),
});

export type EleveEnseignant = typeof eleveEnseignantTable.$inferSelect;
export type EleveEtablissement = typeof eleveEtablissementTable.$inferSelect;
