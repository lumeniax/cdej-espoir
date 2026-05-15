import { pgTable, serial, integer, varchar, date, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";

export const spirituelTable = pgTable("spirituel", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().unique().references(() => participantsTable.id, { onDelete: "cascade" }),
  estBaptise: boolean("est_baptise").default(false),
  dateBapteme: date("date_bapteme"),
  egliseBapteme: varchar("eglise_bapteme", { length: 150 }),
  estConfirme: boolean("est_confirme").default(false),
  dateConfirmation: date("date_confirmation"),
  ecolesDimanche: boolean("ecoles_dimanche").default(false),
  catechese: boolean("catechese").default(false),
  chorale: boolean("chorale").default(false),
  theatre: boolean("theatre").default(false),
  memorisationBiblique: varchar("memorisation_biblique", { length: 50 }),
  distinctions: text("distinctions"),
  observations: text("observations"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activitesTable = pgTable("activites", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 200 }).notNull(),
  type: varchar("type", { length: 80 }),
  description: text("description"),
  dateActivite: date("date_activite"),
  lieu: varchar("lieu", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participantActivitesTable = pgTable("participant_activites", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  activiteId: integer("activite_id").notNull().references(() => activitesTable.id, { onDelete: "cascade" }),
  statut: varchar("statut", { length: 30 }).default("participant"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Spirituel = typeof spirituelTable.$inferSelect;
export type Activite = typeof activitesTable.$inferSelect;
