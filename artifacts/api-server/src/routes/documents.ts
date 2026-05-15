import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole, requireNotViewer } from "../middlewares/requireRole";
import { logAudit } from "../lib/auditLog";
import path from "node:path";
import fs from "node:fs/promises";
import type { AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

async function ensureUploadDir() {
  try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); } catch {}
}

const DOC_TYPES = ["photo", "acte_naissance", "autorisation", "bulletin", "medical", "paiement", "autre"] as const;

router.get("/documents", async (req, res): Promise<void> => {
  const participantId = req.query.participant_id ? parseInt(req.query.participant_id as string, 10) : null;
  const rows = participantId
    ? await db.select().from(documentsTable).where(eq(documentsTable.participantId, participantId))
    : await db.select().from(documentsTable).limit(200);
  res.json(rows.map(d => ({
    id: d.id, participant_id: d.participantId, type: d.type, nom: d.nom,
    mime_type: d.mimeType, taille: d.taille, description: d.description,
    confidentiel: d.confidentiel === "O",
    created_at: d.createdAt.toISOString(),
    url: `/api/documents/${d.id}/download`,
  })));
});

router.post("/documents/upload", requireNotViewer, async (req, res): Promise<void> => {
  await ensureUploadDir();
  const authReq = req as AuthenticatedRequest;
  const { participant_id, type, description, nom, mime_type, confidentiel } = req.body;
  const base64Data = req.body.data;

  if (!nom || !base64Data) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "nom et data (base64) requis" } });
    return;
  }

  const ext = path.extname(nom) || ".bin";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  try {
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(filePath, buffer);
    const [doc] = await db.insert(documentsTable).values({
      participantId: participant_id ? parseInt(participant_id, 10) : null,
      type: type || "autre", nom, cheminFichier: fileName,
      mimeType: mime_type, taille: buffer.length,
      description, confidentiel: confidentiel ? "O" : "N",
      uploadePar: authReq.user.id,
    }).returning();
    await logAudit(req, { action: "upload_document", entityType: "document", entityId: String(doc.id) });
    res.status(201).json({ id: doc.id, nom: doc.nom, url: `/api/documents/${doc.id}/download` });
  } catch {
    res.status(500).json({ error: { code: "UPLOAD_ERROR", message: "Erreur lors de l'upload" } });
  }
});

router.get("/documents/:id/download", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!doc) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Document non trouvé" } }); return; }
  const filePath = path.join(UPLOAD_DIR, doc.cheminFichier);
  try {
    await fs.access(filePath);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.nom)}"`);
    if (doc.mimeType) res.setHeader("Content-Type", doc.mimeType);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "Fichier introuvable" } });
  }
});

router.delete("/documents/:id", requireRole("admin", "coordinateur"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!doc) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Document non trouvé" } }); return; }
  try { await fs.unlink(path.join(UPLOAD_DIR, doc.cheminFichier)); } catch {}
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  res.sendStatus(204);
});

export default router;
