import argon2 from "argon2";
import { db, usersTable, enseignantsTable, etablissementsTable, participantsTable, referentielsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function main() {
  console.log("Seeding CDEJ Espoir TG0154 database...");

  // Seed referentiels
  const villages = ["AVEDZE", "AGBELOUVE", "AFAGNAN", "GATI", "KPEDZE", "TSEVIE", "LOME", "TABLIGBO", "NOTSE"];
  const religions = ["Chrétienne", "Catholique", "Assemblée de Dieu", "Evangélique", "Islam", "Animisme", "Autre"];
  const vitChez = ["Père", "Mère", "Les deux parents", "Tuteur", "Grand-père", "Grand-mère", "Oncle/Tante", "Seul"];
  const situationsFamiliales = ["Marié(e)", "Divorcé(e)", "Veuf/Veuve", "Célibataire"];

  const refData = [
    ...villages.map((v, i) => ({ type: "village", valeur: v, ordre: i })),
    ...religions.map((r, i) => ({ type: "religion", valeur: r, ordre: i })),
    ...vitChez.map((v, i) => ({ type: "vit_chez", valeur: v, ordre: i })),
    ...situationsFamiliales.map((s, i) => ({ type: "situation_familiale", valeur: s, ordre: i })),
  ];

  for (const ref of refData) {
    try {
      await db.insert(referentielsTable).values(ref);
    } catch {}
  }
  console.log("✓ Référentiels seeded");

  // Demo users — all with password Demo1234!
  const demoPassword = await hashPassword("Demo1234!");

  const demoUsers = [
    { email: "admin@cdej-espoir.local", nomComplet: "Administrateur CDEJ", role: "admin" },
    { email: "coordinateur@cdej-espoir.local", nomComplet: "Coordinatrice Principale", role: "coordinateur" },
    { email: "enseignant@cdej-espoir.local", nomComplet: "Enseignant Démo", role: "enseignant" },
    { email: "sante@cdej-espoir.local", nomComplet: "Responsable Santé", role: "sante" },
    { email: "comptable@cdej-espoir.local", nomComplet: "Comptable CDEJ", role: "comptable" },
    { email: "viewer@cdej-espoir.local", nomComplet: "Lecteur Démo", role: "viewer" },
  ] as const;

  for (const u of demoUsers) {
    try {
      await db.insert(usersTable).values({ ...u, passwordHash: demoPassword });
      console.log(`✓ User: ${u.email} / Demo1234! (${u.role})`);
    } catch { console.log(`  User already exists: ${u.email}`); }
  }

  // Legacy production users
  try {
    await db.insert(usersTable).values({
      email: "admin@cdej-espoir.tg",
      passwordHash: await hashPassword("Admin2024!"),
      nomComplet: "Administrateur CDEJ (prod)",
      role: "admin",
    });
    console.log("✓ Prod admin: admin@cdej-espoir.tg / Admin2024!");
  } catch { console.log("  Prod admin already exists"); }

  // Seed enseignants
  const enseignantsList = [
    { nom: "AMOUZOU Kodjo", classe: "Classe A (0-3 ans)" },
    { nom: "GNASSINGBE Akossiwa", classe: "Classe B (4-6 ans)" },
    { nom: "MESSAN Edem", classe: "Classe C (7-10 ans)" },
    { nom: "AGBEMADON Kafui", classe: "Classe D (11-14 ans)" },
    { nom: "KPEGBA Mawuli", classe: "Classe E (15-18 ans)" },
    { nom: "TETE Ablam", classe: "Classe F (19-22 ans)" },
  ];

  const ensIds: number[] = [];
  for (const e of enseignantsList) {
    try {
      const [r] = await db.insert(enseignantsTable).values(e).returning();
      ensIds.push(r.id);
    } catch {
      const { eq: eqFn } = await import("drizzle-orm");
      const existing = await db.select().from(enseignantsTable).where(eqFn(enseignantsTable.nom, e.nom));
      if (existing[0]) ensIds.push(existing[0].id);
    }
  }
  console.log("✓ Enseignants seeded");

  // Seed établissements
  const etabsList = [
    { nom: "EP AVEDZE", adresse: "Avedze, Agbelouve", contact: "+228 90 00 00 01" },
    { nom: "EP AGBELOUVE", adresse: "Agbelouve centre", contact: "+228 90 00 00 02" },
    { nom: "CEG AGBELOUVE", adresse: "Agbelouve", contact: "+228 90 00 00 03" },
    { nom: "CEG AFAGNAN", adresse: "Afagnan", contact: "+228 90 00 00 04" },
    { nom: "Lycée TSEVIE", adresse: "Tsevié", contact: "+228 90 00 00 05" },
    { nom: "Collège Évangélique", adresse: "Lomé", contact: "+228 90 00 00 06" },
  ];

  for (const e of etabsList) {
    try { await db.insert(etablissementsTable).values(e); } catch {}
  }
  console.log("✓ Établissements seeded");

  // Seed participants (realistic sample data from Togo)
  const noms = [
    "AMOUZOU Kofi Sena", "GNASSINGBE Yawa Ablavi", "KPEGBA Mawuena Abla",
    "AGBEMADON Kafui Edem", "MESSAN Kossi Dela", "TETE Akua Dodzi",
    "DODZI Komla Hodali", "AKAKPO Mami Afi", "ABALO Selom Kwami",
    "AMEDEGNATO Essossimna", "BADA Kokou Agbeko", "LAWSON Afua Mensah",
    "TSIGBE Edoh Kofi", "TOUSSOU Yawa Kodjo", "DEKOU Edem Kossivi",
    "GBIKPI Akossiwa Mawuli", "AYITE Sena Ablam", "KOFFI Kafui Edem",
    "AMETOWOYONA Yao Kwami", "DEGBEKEY Abla Delali", "SEDDOH Kofi Akosua",
    "QUASHIE Amenyo Edem", "FIAGBE Kossi Togbui", "DOTSEVI Akua Mawuli",
    "AGBODAN Selom Komi", "NIMONHON Afi Yawa", "SEGBEFIA Edem Abalo",
    "DJOSSOU Amenyo Kafui", "ATTISSO Mawuli Sena", "AGBAYAHI Ablavi Kofi",
  ];

  const sexes = ["M", "F"];
  const electrophoreses = ["AA", "AA", "AA", "AC", "AS", "SC", "SS"];
  const groupes = ["A+", "B+", "O+", "A-", "B-", "O-", "AB+"];
  const quartiers = ["Quartier A", "Quartier B", "Centre", "Nord", "Sud"];

  const [{ max: currentMax }] = await db.select({ max: sql<number>`COALESCE(MAX(numero_ordre), 0)` }).from(participantsTable);

  if ((currentMax || 0) === 0) {
    const today = new Date();
    for (let i = 0; i < noms.length; i++) {
      const ageYears = 1 + Math.floor(Math.random() * 20);
      const naissance = new Date(today);
      naissance.setFullYear(today.getFullYear() - ageYears);
      naissance.setMonth(Math.floor(Math.random() * 12));
      naissance.setDate(1 + Math.floor(Math.random() * 28));

      try {
        await db.insert(participantsTable).values({
          numeroOrdre: i + 1,
          nomPrenoms: noms[i],
          sexe: sexes[i % 2],
          dateNaissance: naissance.toISOString().split("T")[0],
          electrophorese: electrophoreses[Math.floor(Math.random() * electrophoreses.length)],
          groupeSanguin: groupes[Math.floor(Math.random() * groupes.length)],
          village: villages[Math.floor(Math.random() * Math.min(5, villages.length))],
          quartier: quartiers[Math.floor(Math.random() * quartiers.length)],
          contactParticipant: `+228 9${String(Math.floor(Math.random() * 9000000 + 1000000))}`,
          pereVivant: Math.random() > 0.3,
          mereVivante: Math.random() > 0.2,
          vitChez: vitChez[Math.floor(Math.random() * 3)],
          situationFamiliale: null,
        });
      } catch {}
    }
    console.log("✓ Participants seeded");
  } else {
    console.log("  Participants already exist, skipping");
  }

  console.log("\n=== Seed complete! ===");
  console.log("Demo accounts (password: Demo1234!):");
  for (const u of demoUsers) {
    console.log(`  ${u.email} (${u.role})`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
