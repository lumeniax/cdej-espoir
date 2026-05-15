import { Router } from "express";
import { db, participantsTable, presencesTable, presenceSessionsTable, santeMesuresTable, transactionsTable, enseignantsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";

const router = Router();

function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(v => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(",");
}

function calcAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (365.2425 * 24 * 60 * 60 * 1000));
}

router.get("/export/participants.csv", async (_req, res): Promise<void> => {
  const rows = await db.select().from(participantsTable).orderBy(asc(participantsTable.numeroOrdre));
  const header = csvRow(["ID", "Nom et Prénoms", "Sexe", "Date Naissance", "Âge", "Statut", "Programme", "Village", "Quartier", "Électrophorèse", "Groupe Sanguin", "École", "Classe", "Contact", "Date Inscription", "Date Départ Prévue"]);
  const lines = rows.map(p => {
    const age = calcAge(p.dateNaissance);
    const idFmt = `TG015400${String(p.numeroOrdre).padStart(3, "0")}`;
    const prog = age != null ? (age > 4 ? "CDSP" : "Survie") : "";
    const depart = p.dateNaissance ? (() => { const d = new Date(p.dateNaissance!); d.setFullYear(d.getFullYear() + 22); return d.toISOString().split("T")[0]; })() : "";
    return csvRow([idFmt, p.nomPrenoms, p.sexe, p.dateNaissance, age, p.statut || "actif", prog, p.village, p.quartier, p.electrophorese, p.groupeSanguin, p.ecole, p.classe, p.contactParticipant, p.dateInscription, depart]);
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="participants.csv"');
  res.send("\uFEFF" + [header, ...lines].join("\n"));
});

router.get("/export/presences.csv", async (_req, res): Promise<void> => {
  const rows = await db.select({
    dateSession: presenceSessionsTable.dateSession,
    enseignantId: presenceSessionsTable.enseignantId,
    participantNom: participantsTable.nomPrenoms,
    statut: presencesTable.statut,
    motif: presencesTable.motif,
  }).from(presencesTable)
    .leftJoin(presenceSessionsTable, eq(presencesTable.sessionId, presenceSessionsTable.id))
    .leftJoin(participantsTable, eq(presencesTable.eleveId, participantsTable.id))
    .orderBy(desc(presenceSessionsTable.dateSession))
    .limit(5000);
  const enseignants = await db.select().from(enseignantsTable);
  const ensMap = Object.fromEntries(enseignants.map(e => [e.id, e.nom]));
  const header = csvRow(["Date", "Enseignant", "Participant", "Statut", "Motif"]);
  const lines = rows.map(r => csvRow([r.dateSession, r.enseignantId ? ensMap[r.enseignantId] : "", r.participantNom, r.statut === "P" ? "Présent" : r.statut === "A" ? "Absent" : r.statut === "R" ? "Retard" : "Excusé", r.motif]));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="presences.csv"');
  res.send("\uFEFF" + [header, ...lines].join("\n"));
});

router.get("/export/sante.csv", async (_req, res): Promise<void> => {
  const rows = await db.select({
    nom: participantsTable.nomPrenoms,
    sexe: participantsTable.sexe,
    dateNaissance: participantsTable.dateNaissance,
    dateMesure: santeMesuresTable.dateMesure,
    poids: santeMesuresTable.poidsKg,
    taille: santeMesuresTable.tailleCm,
    imc: santeMesuresTable.imc,
    classification: santeMesuresTable.imcClassification,
    etat: santeMesuresTable.etatNutritioNnel,
    note: santeMesuresTable.note,
  }).from(santeMesuresTable)
    .leftJoin(participantsTable, eq(santeMesuresTable.participantId, participantsTable.id))
    .orderBy(desc(santeMesuresTable.dateMesure))
    .limit(5000);
  const header = csvRow(["Participant", "Sexe", "Date Naissance", "Date Mesure", "Poids (kg)", "Taille (cm)", "IMC", "Classification", "État nutritionnel", "Note"]);
  const lines = rows.map(r => csvRow([r.nom, r.sexe, r.dateNaissance, r.dateMesure, r.poids, r.taille, r.imc, r.classification, r.etat, r.note]));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="sante.csv"');
  res.send("\uFEFF" + [header, ...lines].join("\n"));
});

router.get("/export/finances.csv", async (_req, res): Promise<void> => {
  const rows = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.date)).limit(5000);
  const header = csvRow(["Date", "Type", "Catégorie", "Montant (XOF)", "Devise", "Description", "Référence", "N° Reçu", "Donateur", "Mode Règlement", "Statut"]);
  const lines = rows.map(t => csvRow([t.date, t.type, t.categorie, t.montant, t.devise, t.description, t.referencePaiement, t.numerRecu, t.donateur, t.modeReglement, t.statut]));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="finances.csv"');
  res.send("\uFEFF" + [header, ...lines].join("\n"));
});

router.get("/export/enseignants.csv", async (_req, res): Promise<void> => {
  const rows = await db.select().from(enseignantsTable).orderBy(asc(enseignantsTable.nom));
  const header = csvRow(["Nom", "Classe", "Actif"]);
  const lines = rows.map(r => csvRow([r.nom, r.classe, r.actif ? "Oui" : "Non"]));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="enseignants.csv"');
  res.send("\uFEFF" + [header, ...lines].join("\n"));
});

export default router;
