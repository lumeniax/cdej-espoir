import { db, auditLogTable } from "@workspace/db";
import type { Request } from "express";
import type { AuthenticatedRequest } from "../middlewares/requireAuth";

export interface AuditLogEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function logAudit(req: Request, entry: AuditLogEntry): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id ?? null;
    const userEmail = authReq.user?.email ?? null;
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;
    const userAgent = req.headers["user-agent"] ?? null;

    await db.insert(auditLogTable).values({
      userId,
      userEmail,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId != null ? String(entry.entityId) : null,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      ipAddress,
      userAgent,
    });
  } catch {
    // Never crash on audit log failure
  }
}
