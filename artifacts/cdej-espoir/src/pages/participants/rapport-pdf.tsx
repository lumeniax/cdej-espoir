import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, FileDown, Loader2, CalendarCheck, Activity, BookOpen,
  CheckCircle2, AlertTriangle, Minus,
} from "lucide-react";
import { usePdfExport } from "@/hooks/use-pdf-export";

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

type RapportParticipant = {
  participant: {
    id: number; numero: string; nom_prenoms: string; date_naissance: string | null;
    age: number | null; niveau_scolaire: string | null; classe: string | null; ecole: string | null;
    statut: string; electrophorese: string | null;
  };
  periode: { year: number; month: number; label: string; firstDay: string; lastDay: string };
  presences: {
    sessions: Array<{ date: string; enseignant: string | null; statut: string; motif: string | null }>;
    nb_present: number; nb_absent: number; nb_retard: number; nb_total: number; taux: number | null;
  };
  sante: {
    derniere_mesure: {
      date: string; poids_kg: number | null; taille_cm: number | null;
      imc: number | null; classification: string | null; etat_nutritionnel: string | null;
    } | null;
    vaccinations: Array<{ vaccin: string; date_administration: string | null; date_prochaine_dose: string | null; en_retard: boolean }>;
  };
  scolarite: {
    annee_scolaire: string;
    bulletins: Array<{
      trimestre: number | null; ecole: string | null; classe: string | null;
      moyenne: number | null; rang: number | null; total_eleves: number | null;
      appreciation: string | null; observation: string | null;
    }>;
    moyenne_annuelle: number | null;
  };
};

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

function StatutBadge({ statut }: { statut: string }) {
  if (statut === "P") return <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 print:text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />P</span>;
  if (statut === "A") return <span className="inline-flex items-center gap-1 font-semibold text-red-600 print:text-red-600"><AlertTriangle className="h-3.5 w-3.5" />A</span>;
  if (statut === "R") return <span className="inline-flex items-center gap-1 font-semibold text-amber-600 print:text-amber-600"><Minus className="h-3.5 w-3.5" />R</span>;
  return <span className="text-muted-foreground">—</span>;
}

function TauxBar({ taux }: { taux: number | null }) {
  if (taux === null) return null;
  const color = taux >= 80 ? "bg-emerald-500" : taux >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${taux}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{taux}%</span>
    </div>
  );
}

function MoyenneBadge({ moyenne }: { moyenne: number | null }) {
  if (moyenne === null) return <span className="text-muted-foreground">—</span>;
  const color = moyenne >= 14 ? "text-emerald-700" : moyenne >= 10 ? "text-blue-700" : "text-red-600";
  return <span className={`font-bold tabular-nums ${color}`}>{moyenne.toFixed(2)}</span>;
}

export default function ParticipantRapportPdf() {
  const { id } = useParams<{ id: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const reportRef = useRef<HTMLDivElement>(null);
  const { exportToPdf, exporting } = usePdfExport();

  const { data, isLoading, isFetching, isError } = useQuery<RapportParticipant>({
    queryKey: ["rapport-participant", id, year, month],
    queryFn: () => apiFetch(`/api/stats/rapport-participant?participant_id=${id}&year=${year}&month=${month}`),
    enabled: !!id,
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  function handleExport() {
    if (!data) return;
    const slug = data.participant.numero;
    exportToPdf("rapport-participant-area", `CDEJ-${slug}-${year}-${String(month).padStart(2,"0")}.pdf`);
  }

  if (isError) return (
    <div className="p-6">
      <p className="text-destructive">Impossible de charger le rapport.</p>
      <Link href={`/participants/${id}`}><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link href={`/participants/${id}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Rapport mensuel</h1>
            {data && <p className="text-muted-foreground text-sm">{data.participant.nom_prenoms}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOIS_FR.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} disabled={exporting || isLoading || !data} variant="outline">
            {exporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération…</> : <><FileDown className="h-4 w-4 mr-2" />Exporter PDF</>}
          </Button>
        </div>
      </div>

      {(isLoading || isFetching) && !data && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {data && (
        <div id="rapport-participant-area" ref={reportRef} className="space-y-6 bg-background">

          {/* ── En-tête ── */}
          <div className="border rounded-lg p-5 bg-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  CDEJ Espoir — TG0154
                </p>
                <h2 className="text-2xl font-bold">{data.participant.nom_prenoms}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {data.participant.numero}
                  {data.participant.age !== null && ` · ${data.participant.age} ans`}
                  {data.participant.date_naissance && ` · Né(e) le ${fmt(data.participant.date_naissance)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-primary">{data.periode.label}</p>
                <p className="text-xs text-muted-foreground">{data.periode.firstDay} → {data.periode.lastDay}</p>
                <p className="text-xs text-muted-foreground mt-1">Rapport généré le {new Date().toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={data.participant.statut === "actif" ? "border-emerald-500 text-emerald-700" : ""}>
                {data.participant.statut}
              </Badge>
              {data.participant.niveau_scolaire && (
                <Badge variant="outline">{data.participant.niveau_scolaire}</Badge>
              )}
              {data.participant.classe && (
                <Badge variant="outline">Classe : {data.participant.classe}</Badge>
              )}
              {data.participant.electrophorese && (
                <Badge variant="outline">Électrophorèse : {data.participant.electrophorese}</Badge>
              )}
            </div>
          </div>

          {/* ── Présences ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                Présences — {data.periode.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.presences.nb_total === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune session enregistrée ce mois.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Présent(s)", val: data.presences.nb_present, color: "text-emerald-700" },
                      { label: "Absent(s)", val: data.presences.nb_absent, color: "text-red-600" },
                      { label: "Retard(s)", val: data.presences.nb_retard, color: "text-amber-600" },
                      { label: "Sessions", val: data.presences.nb_total, color: "text-foreground" },
                    ].map(s => (
                      <div key={s.label} className="border rounded p-3 text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Taux de présence</p>
                    <TauxBar taux={data.presences.taux} />
                  </div>
                  {data.presences.sessions.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Date</th>
                            <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Enseignant</th>
                            <th className="text-center py-2 pr-4 text-muted-foreground font-medium">Statut</th>
                            <th className="text-left py-2 text-muted-foreground font-medium">Motif</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.presences.sessions.map((s, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2 pr-4 tabular-nums">{fmt(s.date)}</td>
                              <td className="py-2 pr-4">{s.enseignant ?? "—"}</td>
                              <td className="py-2 pr-4 text-center"><StatutBadge statut={s.statut} /></td>
                              <td className="py-2 text-muted-foreground text-xs">{s.motif ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Santé ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-rose-500" />
                Santé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.sante.derniere_mesure ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Dernière mesure : {fmt(data.sante.derniere_mesure.date)}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Poids", val: data.sante.derniere_mesure.poids_kg ? `${data.sante.derniere_mesure.poids_kg} kg` : "—" },
                      { label: "Taille", val: data.sante.derniere_mesure.taille_cm ? `${data.sante.derniere_mesure.taille_cm} cm` : "—" },
                      { label: "IMC", val: data.sante.derniere_mesure.imc ? data.sante.derniere_mesure.imc.toFixed(1) : "—" },
                      { label: "État", val: data.sante.derniere_mesure.etat_nutritionnel ?? data.sante.derniere_mesure.classification ?? "—" },
                    ].map(s => (
                      <div key={s.label} className="border rounded p-3 text-center">
                        <p className="text-base font-bold">{s.val}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune mesure enregistrée.</p>
              )}

              {data.sante.vaccinations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vaccinations</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Vaccin</th>
                          <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Administré</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Rappel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sante.vaccinations.map((v, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{v.vaccin}</td>
                            <td className="py-2 pr-4">{fmt(v.date_administration)}</td>
                            <td className="py-2">
                              {v.date_prochaine_dose ? (
                                <span className={v.en_retard ? "text-red-600 font-semibold" : ""}>
                                  {fmt(v.date_prochaine_dose)}
                                  {v.en_retard && " ⚠ En retard"}
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Scolarité ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Scolarité — Année {data.scolarite.annee_scolaire}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.scolarite.bulletins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun bulletin pour cette année scolaire.</p>
              ) : (
                <div className="space-y-3">
                  {data.scolarite.moyenne_annuelle !== null && (
                    <div className="border rounded p-3 inline-flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Moy. annuelle</p>
                        <MoyenneBadge moyenne={data.scolarite.moyenne_annuelle} />
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Trim.</th>
                          <th className="text-left py-2 pr-3 text-muted-foreground font-medium">École / Classe</th>
                          <th className="text-center py-2 pr-3 text-muted-foreground font-medium">Moyenne</th>
                          <th className="text-center py-2 pr-3 text-muted-foreground font-medium">Rang</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Appréciation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.scolarite.bulletins.map((b, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 pr-3 font-semibold">T{b.trimestre ?? "?"}</td>
                            <td className="py-2 pr-3">
                              {b.ecole ?? "—"}
                              {b.classe && <span className="text-muted-foreground ml-1">· {b.classe}</span>}
                            </td>
                            <td className="py-2 pr-3 text-center"><MoyenneBadge moyenne={b.moyenne} /></td>
                            <td className="py-2 pr-3 text-center">
                              {b.rang ? `${b.rang}${b.total_eleves ? `/${b.total_eleves}` : ""}` : "—"}
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">{b.appreciation ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pied de page */}
          <div className="text-center text-xs text-muted-foreground border-t pt-3">
            CDEJ Espoir TG0154 · Rapport individuel — {data.participant.nom_prenoms} · {data.periode.label}
          </div>
        </div>
      )}
    </div>
  );
}
