import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, AlertTriangle, TrendingUp, UserMinus, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const { data: dashboard, isLoading, isError } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px]">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
        <p className="text-muted-foreground">Impossible de charger les données du tableau de bord.</p>
      </div>
    );
  }

  // Format data for charts
  const ageData = dashboard.tranches_age?.map(t => ({
    name: t.tranche,
    count: t.nb
  })) || [];

  const programmeData = Object.entries(dashboard.programme || {}).map(([key, value]) => ({
    name: key,
    value: value
  }));

  const sexeData = Object.entries(dashboard.sexe || {}).map(([key, value]) => ({
    name: key === 'M' ? 'Garçons' : 'Filles',
    value: value
  }));

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble du centre CDEJ Espoir TG0154</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Participants
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.total_participants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Inscrits actifs
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertes Absences
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {dashboard.nb_alertes_non_resolues || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              À traiter rapidement
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plus Jeune
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center">
              <UserMinus className="w-5 h-5 text-chart-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboard.age_min?.valeur ? `${dashboard.age_min.valeur} ans` : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={dashboard.age_min?.participant}>
              {dashboard.age_min?.participant || '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plus Âgé
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-chart-2/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboard.age_max?.valeur ? `${dashboard.age_max.valeur} ans` : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={dashboard.age_max?.participant}>
              {dashboard.age_max?.participant || '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tranches d'âge Bar Chart */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Répartition par tranche d'âge</CardTitle>
            <CardDescription>Effectifs selon les tranches définies par le programme</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Programmes & Sexe Pie Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Programmes</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[200px] pb-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={programmeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {programmeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Répartition par sexe</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[200px] pb-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sexeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="hsl(var(--chart-4))" /> {/* Blue for boys */}
                    <Cell fill="hsl(var(--chart-5))" /> {/* Purple for girls */}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alertes Absences Table */}
      {dashboard.alertes_absences && dashboard.alertes_absences.length > 0 && (
        <Card className="border-destructive/20 shadow-sm">
          <CardHeader className="bg-destructive/5 rounded-t-xl border-b border-destructive/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-destructive">Alertes d'absences répétées</CardTitle>
            </div>
            <CardDescription>
              Élèves ayant accumulé plusieurs absences consécutives
            </CardDescription>
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
                        <Badge variant="destructive" className="font-bold">
                          {alerte.nb_absences}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
