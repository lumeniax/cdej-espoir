import { pgTable, serial, integer, varchar, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { participantsTable } from "./participants";
import { usersTable } from "./users";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").references(() => participantsTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  nom: varchar("nom", { length: 300 }).notNull(),
  cheminFichier: varchar("chemin_fichier", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  taille: integer("taille"),
  description: text("description"),
  confidentiel: varchar("confidentiel", { length: 1 }).default("N"),
  uploadePar: uuid("uploade_par").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Document = typeof documentsTable.$inferSelect;
export type InsertDocument = typeof documentsTable.$inferInsert;
