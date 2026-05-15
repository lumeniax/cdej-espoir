import { pgTable, serial, integer, date, text, timestamp, char, varchar, boolean, uuid, unique } from "drizzle-orm/pg-core";
import { enseignantsTable } from "./enseignants";
import { participantsTable } from "./participants";
import { usersTable } from "./users";

export const presenceSessionsTable = pgTable("presence_sessions", {
  id: serial("id").primaryKey(),
  enseignantId: integer("enseignant_id").notNull().references(() => enseignantsTable.id, { onDelete: "cascade" }),
  dateSession: date("date_session").notNull(),
  note: text("note"),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.enseignantId, t.dateSession)]);

export const presencesTable = pgTable("presences", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => presenceSessionsTable.id, { onDelete: "cascade" }),
  eleveId: integer("eleve_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  statut: char("statut", { length: 1 }).notNull(),
  motif: varchar("motif", { length: 255 }),
}, (t) => [unique().on(t.sessionId, t.eleveId)]);

export const alertesAbsencesTable = pgTable("alertes_absences", {
  id: serial("id").primaryKey(),
  eleveId: integer("eleve_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  enseignantId: integer("enseignant_id").notNull().references(() => enseignantsTable.id, { onDelete: "cascade" }),
  nbAbsences: integer("nb_absences").notNull(),
  dateDetection: date("date_detection").notNull(),
  resolue: boolean("resolue").notNull().default(false),
});

export type PresenceSession = typeof presenceSessionsTable.$inferSelect;
export type Presence = typeof presencesTable.$inferSelect;
export type AlerteAbsence = typeof alertesAbsencesTable.$inferSelect;
