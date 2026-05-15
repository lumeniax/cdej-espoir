import { pgTable, serial, uuid, varchar, jsonb, timestamp, text } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  userEmail: varchar("user_email", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: varchar("entity_id", { length: 100 }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
export type InsertAuditLog = typeof auditLogTable.$inferInsert;
