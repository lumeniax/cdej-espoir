import { Router } from "express";
import { db, participantsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import { logAudit } from "../lib/auditLog";

const router = Router();

interface ExcelRow {
  [key: string]: string | number | null | undefined;
}

function normalize(s: unknown): string {
  return String(s ?? "").trim();
}

function toDate(v: unknown): string | null {
  if (!v) return null;
  const s = normalize(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  if (/^\d{5}$/.test(s)) {
    const d = new Date(1899, 11, 30);
    d.setDate(d.getDate() + parseInt(s, 10));
    return d.toISOString().split("T")[0];
  }
  return null;
}

function detectColumn(headers: string[], candidates: string[]): string | null {
  const h = headers.map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
  for (const c of candidates) {
    const idx = h.findIndex(col => col.includes(c.toLowerCase()));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

router.post("/import/participants/preview", requireRole("admin", "coordinateur"), async (req, res): Promise<void> => {
  const { rows, headers } = req.body as { rows: ExcelRow[]; headers: string[] };
  if (!rows || !headers) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "rows et headers requis" } });
    return;
  }

  const mapping = {
    nom: detectColumn(headers, ["nom", "prenom", "name"]),
    sexe: detectColumn(headers, ["sexe", "genre", "sex"]),
    date_naissance: detectColumn(headers, ["naissance", "birth", "ddn", "né"]),
    village: detectColumn(headers, ["village", "quartier", "localite"]),
    electrophorese: detectColumn(headers, ["electrophorese", "electro", "hemoglobine"]),
    groupe_sanguin: detectColumn(headers, ["groupe", "sanguin", "blood"]),
    ecole: detectColumn(headers, ["ecole", "etablissement", "school"]),
    classe: detectColumn(headers, ["classe", "class", "niveau"]),
  };

  const preview = rows.slice(0, 10).map((row, i) => {
    const nomVal = mapping.nom ? normalize(row[mapping.nom]) : "";
    const sexeVal = mapping.sexe ? normalize(row[mapping.sexe]).toUpperCase() : "";
    const errors: string[] = [];
    if (!nomVal) errors.push("Nom manquant");
    if (!["M", "F"].includes(sexeVal) && sexeVal) errors.push(`Sexe invalide: ${sexeVal}`);
    return {
      ligne: i + 2,
      nom: nomVal,
      sexe: sexeVal,
      date_naissance: mapping.date_naissance ? toDate(row[mapping.date_naissance]) : null,
      village: mapping.village ? normalize(row[mapping.village]) : null,
      ecole: mapping.ecole ? normalize(row[mapping.ecole]) : null,
      errors,
      valid: errors.length === 0,
    };
  });

  res.json({ mapping, preview, total: rows.length, valid: rows.length - preview.filter(p => !p.valid).length });
});

router.post("/import/participants", requireRole("admin", "coordinateur"), async (req, res): Promise<void> => {
  const { rows, mapping } = req.body as { rows: ExcelRow[]; mapping: Record<string, string | null> };
  if (!rows || !mapping) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "rows et mapping requis" } });
    return;
  }

  const [{ max: currentMax }] = await db.select({ max: sql<number>`COALESCE(MAX(numero_ordre), 0)` }).from(participantsTable);
  let nextOrdre = (currentMax || 0) + 1;

  const results = { inserted: 0, skipped: 0, errors: [] as { ligne: number; error: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nom = mapping.nom ? normalize(row[mapping.nom]) : "";
    const sexe = mapping.sexe ? normalize(row[mapping.sexe]).toUpperCase().charAt(0) : "";

    if (!nom) { results.skipped++; continue; }
    if (!["M", "F"].includes(sexe)) { results.errors.push({ ligne: i + 2, error: `Sexe invalide: ${sexe || "(vide)"}` }); results.skipped++; continue; }

    try {
      await db.insert(participantsTable).values({
        numeroOrdre: nextOrdre++,
        nomPrenoms: nom,
        sexe: sexe as "M" | "F",
        dateNaissance: mapping.date_naissance ? toDate(row[mapping.date_naissance!]) : null,
        village: mapping.village ? normalize(row[mapping.village]) || null : null,
        electrophorese: mapping.electrophorese ? normalize(row[mapping.electrophorese]) || null : null,
        groupeSanguin: mapping.groupe_sanguin ? normalize(row[mapping.groupe_sanguin]) || null : null,
        ecole: mapping.ecole ? normalize(row[mapping.ecole]) || null : null,
        classe: mapping.classe ? normalize(row[mapping.classe]) || null : null,
        statut: "actif",
      });
      results.inserted++;
    } catch (e) {
      results.errors.push({ ligne: i + 2, error: String(e) });
      results.skipped++;
    }
  }

  await logAudit(req, { action: "import_participants", entityType: "participant", newValue: { inserted: results.inserted, skipped: results.skipped } });
  res.json(results);
});

export default router;
