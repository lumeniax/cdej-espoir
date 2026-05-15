import { Router } from "express";
import { db, etablissementsTable, eleveEtablissementTable, participantsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

router.get("/etablissements", async (_req, res): Promise<void> => {
  const rows = await db.select().from(etablissementsTable);
  const counts = await db.select({
    etablissementId: eleveEtablissementTable.etablissementId,
    nb: count(eleveEtablissementTable.eleveId),
  }).from(eleveEtablissementTable).groupBy(eleveEtablissementTable.etablissementId);
  const countMap = new Map(counts.map(c => [c.etablissementId, Number(c.nb)]));

  res.json(rows.map(e => ({
    id: e.id, nom: e.nom, adresse: e.adresse, contact: e.contact,
    actif: e.actif, nb_eleves: countMap.get(e.id) || 0,
    created_at: e.createdAt.toISOString(),
  })));
});

router.post("/etablissements", async (req, res): Promise<void> => {
  const { nom, adresse, contact, actif } = req.body;
  if (!nom) { res.status(400).json({ error: "Le nom est requis" }); return; }
  const [e] = await db.insert(etablissementsTable).values({ nom, adresse: adresse || null, contact: contact || null, actif: actif !== false }).returning();
  res.status(201).json({ id: e.id, nom: e.nom, adresse: e.adresse, contact: e.contact, actif: e.actif, nb_eleves: 0, created_at: e.createdAt.toISOString() });
});

router.get("/etablissements/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [e] = await db.select().from(etablissementsTable).where(eq(etablissementsTable.id, id));
  if (!e) { res.status(404).json({ error: "Établissement non trouvé" }); return; }

  const inscriptions = await db.select().from(eleveEtablissementTable)
    .leftJoin(participantsTable, eq(eleveEtablissementTable.eleveId, participantsTable.id))
    .where(eq(eleveEtablissementTable.etablissementId, id));

  const eleves = inscriptions.map(r => {
    const p = r.participants;
    if (!p) return null;
    return {
      id: p.id,
      id_participant: `TG015400${String(p.numeroOrdre).padStart(3, "0")}`,
      numero_ordre: p.numeroOrdre,
      nom_prenoms: p.nomPrenoms,
      sexe: p.sexe,
      date_naissance: p.dateNaissance,
      age_decimal: null, age_annees: null, age_clair: null,
      programme: null, tranche_age: null,
      electrophorese: p.electrophorese, groupe_sanguin: p.groupeSanguin,
      village: p.village, quartier: p.quartier, contact_participant: p.contactParticipant,
      date_depart_prevue: null, annees_restantes: null,
      enseignant: null, etablissement: { id: e.id, nom: e.nom },
      created_at: p.createdAt.toISOString(),
    };
  }).filter(Boolean);

  res.json({ id: e.id, nom: e.nom, adresse: e.adresse, contact: e.contact, actif: e.actif, nb_eleves: eleves.length, created_at: e.createdAt.toISOString(), eleves });
});

router.put("/etablissements/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(etablissementsTable).where(eq(etablissementsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Établissement non trouvé" }); return; }
  const { nom, adresse, contact, actif } = req.body;
  const [updated] = await db.update(etablissementsTable).set({
    nom: nom ?? existing.nom,
    adresse: adresse !== undefined ? adresse : existing.adresse,
    contact: contact !== undefined ? contact : existing.contact,
    actif: actif !== undefined ? actif : existing.actif,
  }).where(eq(etablissementsTable.id, id)).returning();
  res.json({ id: updated.id, nom: updated.nom, adresse: updated.adresse, contact: updated.contact, actif: updated.actif, nb_eleves: 0, created_at: updated.createdAt.toISOString() });
});

router.delete("/etablissements/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(etablissementsTable).where(eq(etablissementsTable.id, id));
  res.sendStatus(204);
});

export default router;
