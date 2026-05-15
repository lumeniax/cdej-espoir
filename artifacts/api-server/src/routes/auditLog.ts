import { Router } from "express";
import { db, auditLogTable } from "@workspace/db";
import { desc, sql, eq } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

router.get("/audit-log", requireRole("admin"), async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const pageSize = Math.min(100, parseInt((req.query.page_size as string) || "50", 10));

  const [{ total }] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(auditLogTable);

  const items = await db
    .select()
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({
    items: items.map((l) => ({
      id: l.id,
      user_id: l.userId,
      user_email: l.userEmail,
      action: l.action,
      entity_type: l.entityType,
      entity_id: l.entityId,
      old_value: l.oldValue,
      new_value: l.newValue,
      ip_address: l.ipAddress,
      created_at: l.createdAt.toISOString(),
    })),
    total,
    page,
    page_size: pageSize,
  });
});

export default router;
