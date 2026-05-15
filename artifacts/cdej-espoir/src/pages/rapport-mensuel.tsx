import { useState } from "react";
import { useGetRapportMensuel } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  CalendarCheck,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileDown,
  Loader2,
} from "lucide-react";
import { usePdfExport } from "@/hooks/use-pdf-export";

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const COLORS_PRESENCE = ["#16a34a", "#dc2626"];
const COLORS_FINANCE = ["#2563eb", "#dc2626", "#16a34a"];

function StatCard({
  title, value, sub, icon: Icon, color = "text-foreground",
}: { title: string; value: string | number; sub?: string; icon: React.ElementType; color?: string }) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function RapportMensuel() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, isFetching } = useGetRapportMensuel({ year, month });
  const { exportToPdf, exporting: isExporting } = usePdfExport();

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const presenceData = data ? [
    { name: "Présents", value: data.presences.total_presents },
    { name: "Absents", value: data.presences.total_absents },
  ] : [];

  const financeData = data ? [
    { name: "Recettes", montant: data.finances.recettes },
    { name: "Dépenses", montant: data.finances.depenses },
    { name: "Solde", montant: Math.abs(data.finances.solde) },
  ] : [];

  const handleExport = () => {
    const label = data?.periode.label ?? `${MOIS_FR[month - 1]} ${year}`;
    exportToPdf("rapport-export-area", `CDEJ-Espoir-Rapport-${year}-${String(month).padStart(2, "0")}.pdf`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapport mensuel</h1>
          <p className="text-muted-foreground text-sm">
            Synthèse d'activité — CDEJ Espoir TG0154
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOIS_FR.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || isLoading || !data}
          >
            {isExporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération…</>
            ) : (
              <><FileDown className="h-4 w-4 mr-2" />Exporter PDF</>
            )}
          </Button>
        </div>
      </div>

      {(isLoading || isFetching) && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du rapport…
        </div>
      )}

      {data && (
        <div id="rapport-export-area" className="space-y-6">
          <div className="pdf-header-block hidden text-center py-4 border-b mb-4">
            <p className="text-2xl font-bold">CDEJ Espoir — TG0154</p>
            <p className="text-lg text-muted-foreground">Rapport mensuel d'activité — {data.periode.label}</p>
            <p className="text-sm text-muted-foreground">Généré le {new Date().toLocaleDateString("fr-FR")}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-base px-3 py-1">
              {data.periode.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {data.periode.firstDay} → {data.periode.lastDay}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Sessions de présence"
              value={data.presences.nb_sessions}
              sub={`Taux moyen : ${data.presences.taux_moyen}%`}
              icon={CalendarCheck}
              color="text-emerald-600"
            />
            <StatCard
              title="Participants actifs"
              value={data.participants.actifs}
              sub={`${data.participants.nouveaux} nouveau(x) ce mois`}
              icon={Users}
              color="text-blue-600"
            />
            <StatCard
              title="Solde du mois"
              value={`${data.finances.solde >= 0 ? "+" : ""}${data.finances.solde.toLocaleString("fr-FR")} XOF`}
              sub={`${data.finances.nb_transactions} transaction(s)`}
              icon={data.finances.solde >= 0 ? TrendingUp : TrendingDown}
              color={data.finances.solde >= 0 ? "text-emerald-600" : "text-red-600"}
            />
            <StatCard
              title="Alertes actives"
              value={data.alertes.absences_non_resolues + data.alertes.vaccins_en_retard}
              sub={`${data.alertes.absences_non_resolues} absences · ${data.alertes.vaccins_en_retard} vaccins`}
              icon={AlertTriangle}
              color={data.alertes.absences_non_resolues + data.alertes.vaccins_en_retard > 0 ? "text-red-600" : "text-emerald-600"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Présences vs Absences</CardTitle>
              </CardHeader>
              <CardContent>
                {data.presences.total_presents + data.presences.total_absents === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Aucune session ce mois
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={presenceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ percent }) => `${Math.round(percent * 100)}%`}
                      >
                        {presenceData.map((_, i) => (
                          <Cell key={i} fill={COLORS_PRESENCE[i % COLORS_PRESENCE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}`, ""]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Synthèse financière (XOF)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.finances.nb_transactions === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Aucune transaction ce mois
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={financeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                      <Tooltip formatter={(v: number) => [`${v.toLocaleString("fr-FR")} XOF`, ""]} />
                      <Bar dataKey="montant" radius={[4, 4, 0, 0]}>
                        {financeData.map((_, i) => (
                          <Cell key={i} fill={COLORS_FINANCE[i % COLORS_FINANCE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Finances détaillées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recettes</span>
                  <span className="text-blue-600 font-semibold">
                    +{data.finances.recettes.toLocaleString("fr-FR")} XOF
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dépenses</span>
                  <span className="text-red-600 font-semibold">
                    -{data.finances.depenses.toLocaleString("fr-FR")} XOF
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Solde net</span>
                  <span className={data.finances.solde >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {data.finances.solde >= 0 ? "+" : ""}{data.finances.solde.toLocaleString("fr-FR")} XOF
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Nouveaux participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.participants.nouveaux_liste.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Aucun nouveau participant ce mois.</p>
                ) : (
                  <ul className="space-y-1">
                    {data.participants.nouveaux_liste.map((nom, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        {nom}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {(data.alertes.absences_non_resolues > 0 || data.alertes.vaccins_en_retard > 0) && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Points d'attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-orange-800 dark:text-orange-300">
                {data.alertes.absences_non_resolues > 0 && (
                  <p>• {data.alertes.absences_non_resolues} alerte(s) d'absence non résolue(s)</p>
                )}
                {data.alertes.vaccins_en_retard > 0 && (
                  <p>• {data.alertes.vaccins_en_retard} vaccination(s) en retard</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
