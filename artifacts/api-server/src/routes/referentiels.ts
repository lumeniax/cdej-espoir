import { Router } from "express";
import { db, referentielsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/referentiels", async (req, res): Promise<void> => {
  const { type } = req.query as Record<string, string>;
  let rows = await db.select().from(referentielsTable).orderBy(referentielsTable.ordre);
  type RefRow = typeof rows[number];
  if (type) rows = rows.filter((r: RefRow) => r.type === type);
  res.json(rows.map((r: RefRow) => ({ id: r.id, type: r.type, valeur: r.valeur, ordre: r.ordre, actif: r.actif })));
});

router.post("/referentiels", async (req, res): Promise<void> => {
  const { type, valeur, ordre, actif } = req.body;
  if (!type || !valeur) { res.status(400).json({ error: "type et valeur requis" }); return; }
  const [r] = await db.insert(referentielsTable).values({
    type, valeur, ordre: ordre || 0, actif: actif !== false,
  }).returning();
  res.status(201).json({ id: r.id, type: r.type, valeur: r.valeur, ordre: r.ordre, actif: r.actif });
});

router.put("/referentiels/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { type, valeur, ordre, actif } = req.body;
  const [updated] = await db.update(referentielsTable).set({
    type: type, valeur: valeur, ordre: ordre, actif: actif,
  }).where(eq(referentielsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Non trouvé" }); return; }
  res.json({ id: updated.id, type: updated.type, valeur: updated.valeur, ordre: updated.ordre, actif: updated.actif });
});

router.delete("/referentiels/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(referentielsTable).where(eq(referentielsTable.id, id));
  res.sendStatus(204);
});

export default router;
