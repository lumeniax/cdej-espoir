import { useGetDashboard, useListSessions, useListImc } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, TrendingUp, UserMinus, Activity,
  Syringe, Wallet, Calendar, MapPin, Download, Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area
} from "recharts";
import { useMemo } from "react";
import { usePdfExport } from "@/hooks/use-pdf-export";

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const IMC_COLORS: Record<string, string> = {
  "Malnutrition aiguë sévère": "#ef4444",
  "Malnutrition aiguë modérée": "#f97316",
  "IMC dans la plage normale": "#22c55e",
  "Surpoids": "#eab308",
};

function StatCard({
  title, value, sub, icon: Icon, iconClass, valueClass, loading,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  valueClass?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="hover-elevate">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-[110px]" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[60px] mb-2" />
          <Skeleton className="h-3 w-[130px]" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconClass ?? "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${iconClass ? iconClass.replace("bg-", "text-").replace("/10", "") : "text-primary"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueClass ?? ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default function Dashboard() {
  const { data: dashboard, isLoading: loadingDash } = useGetDashboard();
  const { data: sessions, isLoading: loadingSess } = useListSessions();
  const { data: imcData, isLoading: loadingImc } = useListImc();

  const loading = loadingDash || loadingSess || loadingImc;

  const presenceTrendData = useMemo(() => {
    if (!sessions?.length) return [];
    const byMonth: Record<string, { present: number; absent: number; total: number }> = {};

    sessions.forEach(s => {
      const d = new Date(s.date_session);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { present: 0, absent: 0, total: 0 };
      byMonth[key].present += s.nb_presents ?? 0;
      byMonth[key].absent += s.nb_absents ?? 0;
      byMonth[key].total += (s.nb_presents ?? 0) + (s.nb_absents ?? 0);
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([key, v]) => {
        const [year, month] = key.split("-");
        const label = `${MOIS_FR[parseInt(month) - 1]} ${year.slice(2)}`;
        const taux = v.total > 0 ? Math.round((v.present / v.total) * 100) : 0;
        return { mois: label, presents: v.present, absents: v.absent, taux };
      });
  }, [sessions]);

  const imcDistributionData = useMemo(() => {
    if (!imcData?.length) return [];
    const counts: Record<string, number> = {};
    imcData.forEach(m => {
      const key = m.classification || "Non classifié";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [imcData]);

  const imcEvolutionData = useMemo(() => {
    if (!imcData?.length) return [];
    const byMonth: Record<string, Record<string, number>> = {};

    imcData.forEach(m => {
      const d = new Date(m.date_mesure);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = {};
      const cat = m.classification || "Non classifié";
      byMonth[key][cat] = (byMonth[key][cat] ?? 0) + 1;
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([key, cats]) => {
        const [year, month] = key.split("-");
        return { mois: `${MOIS_FR[parseInt(month) - 1]} ${year.slice(2)}`, ...cats };
      });
  }, [imcData]);

  const villageData = useMemo(() =>
    (dashboard?.par_village ?? []).slice(0, 8).map(v => ({
      village: v.village.length > 12 ? v.village.slice(0, 12) + "…" : v.village,
      fullName: v.village,
      nb: v.nb,
    })),
    [dashboard]
  );

  const ageData = (dashboard?.tranches_age ?? []).map(t => ({ name: t.tranche, count: t.nb }));
  const programmeData = Object.entries(dashboard?.programme ?? {}).map(([k, v]) => ({ name: k, value: v }));
  const sexeData = Object.entries(dashboard?.sexe ?? {}).map(([k, v]) => ({
    name: k === "M" ? "Garçons" : "Filles", value: v,
  }));

  const totalTauxPresence = useMemo(() => {
    if (!presenceTrendData.length) return null;
    const last3 = presenceTrendData.slice(-3);
    const avg = last3.reduce((acc, d) => acc + d.taux, 0) / last3.length;
    return Math.round(avg);
  }, [presenceTrendData]);

  const { exportToPdf, exporting } = usePdfExport();

  const handleExport = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    exportToPdf("dashboard-export-area", `CDEJ-Espoir-TG0154-Dashboard-${dateStr}.pdf`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble du centre CDEJ Espoir TG0154</p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || loading}
          className="shrink-0 gap-2"
          variant="outline"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Export en cours…</>
          ) : (
            <><Download className="w-4 h-4" /> Exporter PDF</>
          )}
        </Button>
      </div>

      {/* Zone capturée pour le PDF */}
      <div id="dashboard-export-area" className="space-y-8">

      {/* En-tête PDF (visible dans le PDF, caché à l'écran via print-only) */}
      <div className="hidden pdf-header-block" style={{ display: "none" }}>
        <div className="flex items-center justify-between border-b pb-4 mb-2">
          <div>
            <h2 className="text-2xl font-bold text-green-900">CDEJ Espoir TG0154</h2>
            <p className="text-sm text-gray-600">Rapport du tableau de bord — {new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Total participants : <strong>{dashboard?.total_participants ?? "—"}</strong></div>
            <div>Actifs : <strong>{dashboard?.participants_actifs ?? "—"}</strong></div>
          </div>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="col-span-1">
          <StatCard
            title="Total Participants"
            value={dashboard?.total_participants ?? 0}
            sub={`${dashboard?.participants_actifs ?? 0} actifs`}
            icon={Users}
            iconClass="bg-primary/10"
            loading={loadingDash}
          />
        </div>
        <div className="col-span-1">
          <StatCard
            title="Alertes Absences"
            value={dashboard?.nb_alertes_non_resolues ?? 0}
            sub="Non résolues"
            icon={AlertTriangle}
            iconClass="bg-destructive/10"
            valueClass={(dashboard?.nb_alertes_non_resolues ?? 0) > 0 ? "text-destructive" : ""}
            loading={loadingDash}
          />
        </div>
        <div className="col-span-1">
          <StatCard
            title="Taux Présence"
            value={totalTauxPresence !== null ? `${totalTauxPresence}%` : "—"}
            sub="Moyenne 3 derniers mois"
            icon={Activity}
            iconClass="bg-chart-2/10"
            loading={loadingSess}
          />
        </div>
        <div className="col-span-1">
          <StatCard
            title="Vaccins en retard"
            value={dashboard?.vaccins_en_retard ?? 0}
            sub="Rappels dépassés"
            icon={Syringe}
            iconClass="bg-orange-500/10"
            valueClass={(dashboard?.vaccins_en_retard ?? 0) > 0 ? "text-orange-600" : ""}
            loading={loadingDash}
          />
        </div>
        <div className="col-span-1">
          <StatCard
            title="Dépenses du mois"
            value={dashboard?.depenses_mois ? `${(dashboard.depenses_mois).toLocaleString("fr-FR")} FCFA` : "0 FCFA"}
            sub="Mois en cours"
            icon={Wallet}
            iconClass="bg-chart-3/10"
            loading={loadingDash}
          />
        </div>
        <div className="col-span-1">
          <StatCard
            title="Départs prochains"
            value={dashboard?.departs_prochains?.length ?? 0}
            sub="Dans les 90 jours"
            icon={UserMinus}
            iconClass="bg-chart-5/10"
            loading={loadingDash}
          />
        </div>
      </div>

      {/* Row 2: Courbe de présences + Répartition par village */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Courbe de présences */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <CardTitle>Courbe de présences</CardTitle>
            </div>
            <CardDescription>Évolution mensuelle des présences et absences</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[280px]">
            {loadingSess ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : presenceTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Aucune session enregistrée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={presenceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorAbsents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    formatter={(v: number, name: string) => [v, name === "presents" ? "Présents" : "Absents"]}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend formatter={v => v === "presents" ? "Présents" : "Absents"} />
                  <Area
                    type="monotone" dataKey="presents" stroke="hsl(var(--primary))"
                    strokeWidth={2} fill="url(#colorPresents)" dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone" dataKey="absents" stroke="hsl(var(--destructive))"
                    strokeWidth={2} fill="url(#colorAbsents)" dot={{ r: 3, fill: "hsl(var(--destructive))" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Répartition par village */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-chart-3" />
              <CardTitle>Par village</CardTitle>
            </div>
            <CardDescription>Top 8 villages d'origine</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[280px]">
            {loadingDash ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : villageData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée de village
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical"
                  data={villageData}
                  margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="village" type="category" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11 }} width={70}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    formatter={(v: number) => [v, "Participants"]}
                  />
                  <Bar dataKey="nb" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]}>
                    {villageData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: IMC distribution + IMC evolution + Programmes/Sexe */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IMC donut */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>État nutritionnel (IMC)</CardTitle>
            <CardDescription>Répartition des classifications actuelles</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[260px]">
            {loadingImc ? (
              <Skeleton className="h-[230px] w-full rounded-lg" />
            ) : imcDistributionData.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground text-sm h-[230px]">
                Aucune mesure IMC enregistrée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={imcDistributionData}
                    cx="50%" cy="45%"
                    innerRadius={65} outerRadius={90}
                    paddingAngle={4} dataKey="value"
                  >
                    {imcDistributionData.map((entry, i) => (
                      <Cell key={i} fill={IMC_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    formatter={(v: number, _n: string, props: { payload?: { name: string } }) => [v, props?.payload?.name ?? ""]}
                  />
                  <Legend
                    verticalAlign="bottom" height={50}
                    formatter={v => <span className="text-xs">{v.length > 20 ? v.slice(0, 20) + "…" : v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* IMC évolution */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Évolution IMC</CardTitle>
            <CardDescription>Tendance mensuelle des classifications</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[260px]">
            {loadingImc ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : imcEvolutionData.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground text-sm h-[230px]">
                Aucune mesure IMC enregistrée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={imcEvolutionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                  />
                  {Object.keys(IMC_COLORS).map(cat => (
                    <Line
                      key={cat} type="monotone" dataKey={cat}
                      stroke={IMC_COLORS[cat]} strokeWidth={2}
                      dot={{ r: 3 }} activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tranches d'âge */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Tranches d'âge</CardTitle>
            <CardDescription>Effectifs par tranche</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[260px]">
            {loadingDash ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ageData} margin={{ top: 10, right: 10, left: -25, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fontSize: 9 }} angle={-30} textAnchor="end" dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    formatter={(v: number) => [v, "Participants"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Programmes + Sexe + Anniversaires + Départs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Programmes</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={programmeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {programmeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                <Legend verticalAlign="bottom" height={30} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Répartition par sexe</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sexeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  <Cell fill="hsl(var(--chart-4))" />
                  <Cell fill="hsl(var(--chart-5))" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                <Legend verticalAlign="bottom" height={30} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Anniversaires prochains */}
        {dashboard?.anniversaires_prochains && dashboard.anniversaires_prochains.length > 0 && (
          <Card className="md:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-chart-4" />
                <CardTitle className="text-base">Anniversaires (14j)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.anniversaires_prochains.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-sm truncate max-w-[130px]" title={a.nom}>{a.nom}</span>
                  <Badge variant={a.jours === 0 ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                    {a.jours === 0 ? "Aujourd'hui !" : `dans ${a.jours}j`}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Départs prochains */}
        {dashboard?.departs_prochains && dashboard.departs_prochains.length > 0 && (
          <Card className="md:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-destructive" />
                <CardTitle className="text-base">Départs prochains (90j)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.departs_prochains.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-sm truncate block max-w-[120px]" title={d.nom}>{d.nom}</span>
                    <span className="text-xs text-muted-foreground">{d.id_fmt}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2 border-destructive/50 text-destructive">
                    {d.jours}j
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alertes Absences */}
      {dashboard?.alertes_absences && dashboard.alertes_absences.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="bg-destructive/5 rounded-t-xl border-b border-destructive/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-destructive">Alertes d'absences répétées</CardTitle>
            </div>
            <CardDescription>Élèves ayant accumulé plusieurs absences consécutives</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Participant</th>
                    <th className="px-6 py-3 font-medium">Enseignant</th>
                    <th className="px-6 py-3 font-medium text-center">Absences</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboard.alertes_absences.map((alerte, i) => (
                    <tr key={i} className="bg-card hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{alerte.eleve}</td>
                      <td className="px-6 py-4">{alerte.enseignant}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="destructive" className="font-bold">{alerte.nb_absences}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      </div>{/* end #dashboard-export-area */}
    </div>
  );
}
