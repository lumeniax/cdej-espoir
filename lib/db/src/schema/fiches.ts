import { pgTable, serial, varchar, date, text, numeric, timestamp, integer, unique } from "drizzle-orm/pg-core";

export const fichesPaiementTable = pgTable("fiches_paiement", {
  id: serial("id").primaryKey(),
  numero: varchar("numero", { length: 20 }).unique(),
  dateFiche: date("date_fiche").notNull().defaultNow(),
  motivations: text("motivations"),
  totalMontant: numeric("total_montant", { precision: 12, scale: 2 }).notNull().default("0"),
  preparePar: varchar("prepare_par", { length: 150 }),
  validePar: varchar("valide_par", { length: 150 }),
  statut: varchar("statut", { length: 20 }).notNull().default("brouillon"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ficheLignesTable = pgTable("fiche_lignes", {
  id: serial("id").primaryKey(),
  ficheId: integer("fiche_id").notNull().references(() => fichesPaiementTable.id, { onDelete: "cascade" }),
  ordre: integer("ordre").notNull(),
  nom: varchar("nom", { length: 200 }).notNull(),
  contact: varchar("contact", { length: 50 }),
  montant: numeric("montant", { precision: 10, scale: 2 }).notNull().default("0"),
}, (t) => [unique().on(t.ficheId, t.ordre)]);

export type FichePaiement = typeof fichesPaiementTable.$inferSelect;
export type FicheLigne = typeof ficheLignesTable.$inferSelect;
