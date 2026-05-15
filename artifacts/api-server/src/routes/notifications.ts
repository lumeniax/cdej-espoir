import { Router } from "express";
import { db, notificationsTable, participantsTable, vaccinationsTable } from "@workspace/db";
import { eq, and, desc, sql, isNull, lt } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.id;
  const rows = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId)))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  const unread = rows.filter(n => !n.lue).length;
  res.json({
    items: rows.map(n => ({
      id: n.id, type: n.type, titre: n.titre, message: n.message,
      lue: n.lue, participant_id: n.participantId,
      created_at: n.createdAt.toISOString(), lue_le: n.lueLe?.toISOString() ?? null,
    })),
    unread,
  });
});

router.post("/notifications/:id/lire", async (req, res): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  const id = parseInt(req.params.id, 10);
  await db.update(notificationsTable).set({ lue: true, lueLe: new Date() })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, authReq.user.id)));
  res.json({ ok: true });
});

router.post("/notifications/tout-lire", async (req, res): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  await db.update(notificationsTable).set({ lue: true, lueLe: new Date() })
    .where(and(eq(notificationsTable.userId, authReq.user.id), eq(notificationsTable.lue, false)));
  res.json({ ok: true });
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  await db.delete(notificationsTable).where(
    and(eq(notificationsTable.id, parseInt(req.params.id, 10)), eq(notificationsTable.userId, authReq.user.id))
  );
  res.sendStatus(204);
});

router.post("/notifications/generer", async (req, res): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.id;
  let created = 0;

  const participants = await db.select().from(participantsTable).where(eq(participantsTable.statut, "actif"));
  const today = new Date();

  for (const p of participants) {
    const idFmt = `TG015400${String(p.numeroOrdre).padStart(3, "0")}`;

    if (p.dateNaissance) {
      const naissance = new Date(p.dateNaissance);
      const thisYear = new Date(today.getFullYear(), naissance.getMonth(), naissance.getDate());
      const diff = Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 7) {
        await db.insert(notificationsTable).values({
          userId, participantId: p.id, type: "anniversaire",
          titre: `Anniversaire — ${p.nomPrenoms}`,
          message: `${idFmt} a son anniversaire dans ${diff === 0 ? "aujourd'hui" : `${diff} jour(s)`}.`,
        }).catch(() => {});
        created++;
      }
    }

    if (p.dateNaissance) {
      const depart = new Date(p.dateNaissance);
      depart.setFullYear(depart.getFullYear() + 22);
      const daysUntil = Math.ceil((depart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 60) {
        await db.insert(notificationsTable).values({
          userId, participantId: p.id, type: "depart_proche",
          titre: `Départ prévu — ${p.nomPrenoms}`,
          message: `${idFmt} atteindra 22 ans dans ${daysUntil} jours.`,
        }).catch(() => {});
        created++;
      }
    }
  }

  res.json({ generated: created });
});

export default router;
