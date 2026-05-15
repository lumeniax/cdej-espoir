import { Router } from "express";
import { db, eleveEnseignantTable, eleveEtablissementTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/affectations/enseignant", async (req, res): Promise<void> => {
  const { eleve_id, enseignant_id } = req.body;
  if (!eleve_id || !enseignant_id) { res.status(400).json({ error: "eleve_id et enseignant_id requis" }); return; }

  const [existing] = await db.select().from(eleveEnseignantTable).where(eq(eleveEnseignantTable.eleveId, eleve_id));
  if (existing) {
    if (existing.enseignantId === enseignant_id) {
      res.json({ id: existing.id, eleve_id, enseignant_id, date_affectation: existing.dateAffectation });
      return;
    }
    res.status(409).json({ error: "PARTICIPANT_ALREADY_HAS_TEACHER", message: "Cet élève est déjà affecté à un enseignant" });
    return;
  }

  const [aff] = await db.insert(eleveEnseignantTable).values({ eleveId: eleve_id, enseignantId: enseignant_id }).returning();
  res.status(201).json({ id: aff.id, eleve_id: aff.eleveId, enseignant_id: aff.enseignantId, date_affectation: aff.dateAffectation });
});

router.delete("/affectations/enseignant/:eleveId", async (req, res): Promise<void> => {
  const eleveId = parseInt(Array.isArray(req.params.eleveId) ? req.params.eleveId[0] : req.params.eleveId, 10);
  await db.delete(eleveEnseignantTable).where(eq(eleveEnseignantTable.eleveId, eleveId));
  res.sendStatus(204);
});

router.post("/affectations/etablissement", async (req, res): Promise<void> => {
  const { eleve_id, etablissement_id, annee_scolaire, classe } = req.body;
  if (!eleve_id || !etablissement_id) { res.status(400).json({ error: "eleve_id et etablissement_id requis" }); return; }

  const [existing] = await db.select().from(eleveEtablissementTable).where(eq(eleveEtablissementTable.eleveId, eleve_id));
  if (existing) {
    if (existing.etablissementId === etablissement_id) {
      res.json({ id: existing.id, eleve_id, etablissement_id, annee_scolaire: existing.anneeScolaire, classe: existing.classe, date_inscription: existing.dateInscription });
      return;
    }
    res.status(409).json({ error: "Élève déjà inscrit dans un établissement" });
    return;
  }

  const [aff] = await db.insert(eleveEtablissementTable).values({
    eleveId: eleve_id, etablissementId: etablissement_id,
    anneeScolaire: annee_scolaire || null, classe: classe || null,
  }).returning();
  res.status(201).json({ id: aff.id, eleve_id: aff.eleveId, etablissement_id: aff.etablissementId, annee_scolaire: aff.anneeScolaire, classe: aff.classe, date_inscription: aff.dateInscription });
});

router.delete("/affectations/etablissement/:eleveId", async (req, res): Promise<void> => {
  const eleveId = parseInt(Array.isArray(req.params.eleveId) ? req.params.eleveId[0] : req.params.eleveId, 10);
  await db.delete(eleveEtablissementTable).where(eq(eleveEtablissementTable.eleveId, eleveId));
  res.sendStatus(204);
});

export default router;
