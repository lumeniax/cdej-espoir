import { Router } from "express";
import {
  db, presenceSessionsTable, presencesTable, alertesAbsencesTable,
  enseignantsTable, participantsTable, eleveEnseignantTable
} from "@workspace/db";
import { eq, and, desc, count, inArray } from "drizzle-orm";

const router = Router();

router.get("/presences/sessions", async (req, res): Promise<void> => {
  const { enseignant_id, from, to } = req.query as Record<string, string>;

  let sessions = await db.select({
    session: presenceSessionsTable,
    enseignantNom: enseignantsTable.nom,
  }).from(presenceSessionsTable)
    .leftJoin(enseignantsTable, eq(presenceSessionsTable.enseignantId, enseignantsTable.id))
    .orderBy(desc(presenceSessionsTable.dateSession));

  if (enseignant_id) {
    const eid = parseInt(enseignant_id, 10);
    sessions = sessions.filter(s => s.session.enseignantId === eid);
  }
  if (from) sessions = sessions.filter(s => s.session.dateSession >= from);
  if (to) sessions = sessions.filter(s => s.session.dateSession <= to);

  // Get presence counts for each session
  const sessionIds = sessions.map(s => s.session.id);
  const allPresences = sessionIds.length > 0
    ? await db.select().from(presencesTable).where(
        inArray(presencesTable.sessionId, sessionIds as number[])
      )
    : [];

  const presMap = new Map<number, { P: number; A: number }>();
  for (const p of allPresences) {
    const cur = presMap.get(p.sessionId) || { P: 0, A: 0 };
    if (p.statut === "P") cur.P++;
    else cur.A++;
    presMap.set(p.sessionId, cur);
  }

  res.json(sessions.map(s => ({
    id: s.session.id,
    enseignant_id: s.session.enseignantId,
    enseignant_nom: s.enseignantNom,
    date_session: s.session.dateSession,
    note: s.session.note,
    nb_presents: presMap.get(s.session.id)?.P || 0,
    nb_absents: presMap.get(s.session.id)?.A || 0,
    created_at: s.session.createdAt.toISOString(),
  })));
});

router.post("/presences/sessions", async (req, res): Promise<void> => {
  const { enseignant_id, date_session, note } = req.body;
  if (!enseignant_id || !date_session) {
    res.status(400).json({ error: "enseignant_id et date_session requis" });
    return;
  }
  const [existing] = await db.select().from(presenceSessionsTable).where(
    and(eq(presenceSessionsTable.enseignantId, enseignant_id), eq(presenceSessionsTable.dateSession, date_session))
  );
  if (existing) {
    res.status(409).json({ error: "SESSION_DATE_DUPLICATE", message: "Cette date existe déjà pour cet enseignant" });
    return;
  }
  const [session] = await db.insert(presenceSessionsTable).values({
    enseignantId: enseignant_id, dateSession: date_session, note: note || null,
  }).returning();

  const [ens] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.id, session.enseignantId));
  res.status(201).json({
    id: session.id, enseignant_id: session.enseignantId,
    enseignant_nom: ens?.nom || null,
    date_session: session.dateSession, note: session.note,
    nb_presents: 0, nb_absents: 0,
    created_at: session.createdAt.toISOString(),
  });
});

router.get("/presences/sessions/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [session] = await db.select().from(presenceSessionsTable).where(eq(presenceSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session non trouvée" }); return; }

  const [ens] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.id, session.enseignantId));
  const presencesRows = await db.select({
    presence: presencesTable,
    eleveNom: participantsTable.nomPrenoms,
  }).from(presencesTable)
    .leftJoin(participantsTable, eq(presencesTable.eleveId, participantsTable.id))
    .where(eq(presencesTable.sessionId, id));

  const presences = presencesRows.map(r => ({
    id: r.presence.id,
    eleve_id: r.presence.eleveId,
    eleve_nom: r.eleveNom || "",
    statut: r.presence.statut,
    motif: r.presence.motif,
  }));

  const nbP = presences.filter(p => p.statut === "P").length;
  const nbA = presences.filter(p => p.statut === "A").length;

  res.json({
    id: session.id, enseignant_id: session.enseignantId,
    enseignant_nom: ens?.nom || null,
    date_session: session.dateSession, note: session.note,
    nb_presents: nbP, nb_absents: nbA,
    created_at: session.createdAt.toISOString(),
    presences,
  });
});

router.delete("/presences/sessions/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(presenceSessionsTable).where(eq(presenceSessionsTable.id, id));
  res.sendStatus(204);
});

router.post("/presences/batch", async (req, res): Promise<void> => {
  const { session_id, presences } = req.body;
  if (!session_id || !Array.isArray(presences)) {
    res.status(400).json({ error: "session_id et presences requis" });
    return;
  }

  const [session] = await db.select().from(presenceSessionsTable).where(eq(presenceSessionsTable.id, session_id));
  if (!session) { res.status(404).json({ error: "Session non trouvée" }); return; }

  // Upsert presences
  for (const p of presences) {
    const [existing] = await db.select().from(presencesTable).where(
      and(eq(presencesTable.sessionId, session_id), eq(presencesTable.eleveId, p.eleve_id))
    );
    if (existing) {
      await db.update(presencesTable).set({ statut: p.statut, motif: p.motif || null }).where(eq(presencesTable.id, existing.id));
    } else {
      await db.insert(presencesTable).values({ sessionId: session_id, eleveId: p.eleve_id, statut: p.statut, motif: p.motif || null });
    }
  }

  // Check for consecutive absences (RM-33)
  let alertesCreees = 0;
  const eleves = presences.filter(p => p.statut === "A").map(p => p.eleve_id);
  for (const eleveId of eleves) {
    // Get last N sessions for this teacher ordered by date desc
    const recentSessions = await db.select({ id: presenceSessionsTable.id, date: presenceSessionsTable.dateSession })
      .from(presenceSessionsTable)
      .where(eq(presenceSessionsTable.enseignantId, session.enseignantId))
      .orderBy(desc(presenceSessionsTable.dateSession))
      .limit(5);

    let consecutiveAbsences = 0;
    for (const s of recentSessions) {
      const [pr] = await db.select().from(presencesTable).where(
        and(eq(presencesTable.sessionId, s.id), eq(presencesTable.eleveId, eleveId))
      );
      if (pr?.statut === "A") consecutiveAbsences++;
      else break;
    }

    if (consecutiveAbsences >= 2) {
      const today = new Date().toISOString().split("T")[0];
      const [existingAlerte] = await db.select().from(alertesAbsencesTable).where(
        and(eq(alertesAbsencesTable.eleveId, eleveId), eq(alertesAbsencesTable.dateDetection, today))
      );
      if (!existingAlerte) {
        await db.insert(alertesAbsencesTable).values({
          eleveId, enseignantId: session.enseignantId,
          nbAbsences: consecutiveAbsences, dateDetection: today,
        });
        alertesCreees++;
      } else {
        await db.update(alertesAbsencesTable).set({ nbAbsences: consecutiveAbsences }).where(eq(alertesAbsencesTable.id, existingAlerte.id));
      }
    }
  }

  res.json({ saved: presences.length, alertes_creees: alertesCreees });
});

router.get("/alertes-absences", async (req, res): Promise<void> => {
  const { resolue } = req.query as Record<string, string>;
  let rows = await db.select({
    alerte: alertesAbsencesTable,
    eleveNom: participantsTable.nomPrenoms,
    enseignantNom: enseignantsTable.nom,
  }).from(alertesAbsencesTable)
    .leftJoin(participantsTable, eq(alertesAbsencesTable.eleveId, participantsTable.id))
    .leftJoin(enseignantsTable, eq(alertesAbsencesTable.enseignantId, enseignantsTable.id))
    .orderBy(desc(alertesAbsencesTable.dateDetection));

  if (resolue !== undefined) {
    const isResolue = resolue === "true";
    rows = rows.filter(r => r.alerte.resolue === isResolue);
  }

  res.json(rows.map(r => ({
    id: r.alerte.id,
    eleve_id: r.alerte.eleveId,
    eleve_nom: r.eleveNom || "",
    enseignant_id: r.alerte.enseignantId,
    enseignant_nom: r.enseignantNom || "",
    nb_absences: r.alerte.nbAbsences,
    date_detection: r.alerte.dateDetection,
    resolue: r.alerte.resolue,
  })));
});

router.patch("/alertes-absences/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { resolue } = req.body;
  const [updated] = await db.update(alertesAbsencesTable).set({ resolue: !!resolue }).where(eq(alertesAbsencesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Alerte non trouvée" }); return; }
  const [ens] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.id, updated.enseignantId));
  const [eleve] = await db.select().from(participantsTable).where(eq(participantsTable.id, updated.eleveId));
  res.json({
    id: updated.id, eleve_id: updated.eleveId, eleve_nom: eleve?.nomPrenoms || "",
    enseignant_id: updated.enseignantId, enseignant_nom: ens?.nom || "",
    nb_absences: updated.nbAbsences, date_detection: updated.dateDetection, resolue: updated.resolue,
  });
});

export default router;
