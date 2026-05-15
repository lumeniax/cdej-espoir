import { Router } from "express";
import { db, fichesPaiementTable, ficheLignesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

async function getFicheWithLignes(id: number) {
  const [fiche] = await db.select().from(fichesPaiementTable).where(eq(fichesPaiementTable.id, id));
  if (!fiche) return null;
  const lignes = await db.select().from(ficheLignesTable).where(eq(ficheLignesTable.ficheId, id)).orderBy(ficheLignesTable.ordre);
  return {
    id: fiche.id,
    numero: fiche.numero,
    date_fiche: fiche.dateFiche,
    motivations: fiche.motivations,
    total_montant: parseFloat(fiche.totalMontant as string),
    prepare_par: fiche.preparePar,
    valide_par: fiche.validePar,
    statut: fiche.statut,
    created_at: fiche.createdAt.toISOString(),
    lignes: lignes.map(l => ({
      id: l.id, ordre: l.ordre, nom: l.nom, contact: l.contact,
      montant: parseFloat(l.montant as string),
    })),
  };
}

router.get("/fiches-paiement", async (_req, res): Promise<void> => {
  const fiches = await db.select().from(fichesPaiementTable).orderBy(desc(fichesPaiementTable.dateFiche));
  res.json(fiches.map(f => ({
    id: f.id, numero: f.numero, date_fiche: f.dateFiche,
    motivations: f.motivations, total_montant: parseFloat(f.totalMontant as string),
    prepare_par: f.preparePar, valide_par: f.validePar, statut: f.statut,
    created_at: f.createdAt.toISOString(),
  })));
});

router.post("/fiches-paiement", async (req, res): Promise<void> => {
  const { date_fiche, motivations, prepare_par, valide_par, statut, lignes } = req.body;
  if (!date_fiche) { res.status(400).json({ error: "date_fiche requis" }); return; }

  // Generate numero
  const [count] = await db.select({ nb: sql<number>`COUNT(*)` }).from(fichesPaiementTable);
  const numero = `FP${new Date().getFullYear()}${String((count.nb || 0) + 1).padStart(4, "0")}`;

  const [fiche] = await db.insert(fichesPaiementTable).values({
    numero, dateFiche: date_fiche, motivations: motivations || null,
    preparePar: prepare_par || null, validePar: valide_par || null,
    statut: statut || "brouillon",
  }).returning();

  if (Array.isArray(lignes) && lignes.length > 0) {
    await db.insert(ficheLignesTable).values(
      lignes.map((l: { ordre: number; nom: string; contact?: string; montant: number }) => ({
        ficheId: fiche.id, ordre: l.ordre, nom: l.nom,
        contact: l.contact || null, montant: l.montant.toString(),
      }))
    );
    // Update total
    const totalLignes = lignes.reduce((sum: number, l: { montant: number }) => sum + l.montant, 0);
    await db.update(fichesPaiementTable).set({ totalMontant: totalLignes.toString() }).where(eq(fichesPaiementTable.id, fiche.id));
  }

  const result = await getFicheWithLignes(fiche.id);
  res.status(201).json(result);
});

router.get("/fiches-paiement/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const fiche = await getFicheWithLignes(id);
  if (!fiche) { res.status(404).json({ error: "Fiche non trouvée" }); return; }
  res.json(fiche);
});

router.put("/fiches-paiement/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(fichesPaiementTable).where(eq(fichesPaiementTable.id, id));
  if (!existing) { res.status(404).json({ error: "Fiche non trouvée" }); return; }

  const { date_fiche, motivations, prepare_par, valide_par, statut, lignes } = req.body;
  await db.update(fichesPaiementTable).set({
    dateFiche: date_fiche ?? existing.dateFiche,
    motivations: motivations !== undefined ? motivations : existing.motivations,
    preparePar: prepare_par !== undefined ? prepare_par : existing.preparePar,
    validePar: valide_par !== undefined ? valide_par : existing.validePar,
    statut: statut ?? existing.statut,
  }).where(eq(fichesPaiementTable.id, id));

  if (Array.isArray(lignes)) {
    await db.delete(ficheLignesTable).where(eq(ficheLignesTable.ficheId, id));
    if (lignes.length > 0) {
      await db.insert(ficheLignesTable).values(
        lignes.map((l: { ordre: number; nom: string; contact?: string; montant: number }) => ({
          ficheId: id, ordre: l.ordre, nom: l.nom, contact: l.contact || null, montant: l.montant.toString(),
        }))
      );
      const total = lignes.reduce((sum: number, l: { montant: number }) => sum + l.montant, 0);
      await db.update(fichesPaiementTable).set({ totalMontant: total.toString() }).where(eq(fichesPaiementTable.id, id));
    }
  }

  const result = await getFicheWithLignes(id);
  res.json(result);
});

router.delete("/fiches-paiement/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(fichesPaiementTable).where(eq(fichesPaiementTable.id, id));
  res.sendStatus(204);
});

export default router;
