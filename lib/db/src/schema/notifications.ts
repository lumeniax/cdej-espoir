import { pgTable, serial, integer, varchar, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { participantsTable } from "./participants";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").references(() => participantsTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  titre: varchar("titre", { length: 200 }).notNull(),
  message: text("message").notNull(),
  lue: boolean("lue").notNull().default(false),
  lueLe: timestamp("lue_le", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
