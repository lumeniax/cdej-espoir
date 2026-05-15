import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, TrendingDown, Download } from "lucide-react";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";

interface Transaction { id: number; participant_id?: number; type: string; categorie?: string; montant: number; date: string; description?: string; numero_recu?: string; donateur?: string; mode_reglement?: string; statut?: string; }
interface Stat { type: string; total: number; count: number; }

const TYPE_COLORS: Record<string, string> = {
  cotisation: "#3b82f6", paiement: "#22c55e", don: "#a855f7",
  don_nature: "#f59e0b", depense: "#ef4444", autre: "#6b7280",
};
const TYPE_LABELS: Record<string, string> = {
  cotisation: "Cotisation", paiement: "Paiement", don: "Don",
  don_nature: "Don en nature", depense: "Dépense", autre: "Autre",
};

export default function Finances() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: txData, isLoading } = useQuery<{ items: Transaction[]; total: number }>({
    queryKey: ["/api/finances", filterType],
    queryFn: () => apiFetch(`/api/finances${filterType !== "all" ? `?type=${filterType}` : ""}`),
  });
  const { data: stats = [] } = useQuery<Stat[]>({
    queryKey: ["/api/finances/stats"],
    queryFn: () => apiFetch("/api/finances/stats"),
  });

  const transactions = txData?.items ?? [];
  const revenus = stats.filter(s => !["depense"].includes(s.type)).reduce((a, s) => a + s.total, 0);
  const depenses = stats.filter(s => s.type === "depense").reduce((a, s) => a + s.total, 0);
  const solde = revenus - depenses;

  const createMut = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiClient("/api/finances", { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finances"] });
      toast({ title: "Transaction enregistrée" });
      setDialogOpen(false); setForm({});
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const p = (k: string) => form[k] ?? "";
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const pieData = stats.map(s => ({ name: TYPE_LABELS[s.type] ?? s.type, value: s.total, fill: TYPE_COLORS[s.type] ?? "#6b7280" }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Module Finances</h1>
          <p className="text-muted-foreground mt-1">Cotisations, dons, dépenses et paiements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href="/api/export/finances.csv" download><Download className="w-4 h-4 mr-2" />Export CSV</a></Button>
          <Button onClick={() => { setDialogOpen(true); setForm({ date: new Date().toISOString().split("T")[0] }); }}>
            <Plus className="w-4 h-4 mr-2" />Nouvelle transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-green-700 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Revenus totaux</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-700">{revenus.toLocaleString("fr-FR")} FCFA</p></CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700 flex items-center gap-2"><TrendingDown className="w-4 h-4" />Dépenses totales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-700">{depenses.toLocaleString("fr-FR")} FCFA</p></CardContent>
        </Card>
        <Card className={solde >= 0 ? "border-blue-200" : "border-orange-200"}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" />Solde</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${solde >= 0 ? "text-blue-700" : "text-orange-700"}`}>{solde.toLocaleString("fr-FR")} FCFA</p></CardContent>
        </Card>
      </div>

      {pieData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Répartition par type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie><Tooltip formatter={(v: number) => `${v.toLocaleString("fr-FR")} FCFA`} /><Legend /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {["all", "cotisation", "paiement", "don", "don_nature", "depense"].map(t => (
          <Button key={t} size="sm" variant={filterType === t ? "default" : "outline"} onClick={() => setFilterType(t)}>
            {t === "all" ? "Tous" : TYPE_LABELS[t]}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-center py-8 text-muted-foreground">Chargement...</p>}
        {transactions.map(t => (
          <Card key={t.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge style={{ backgroundColor: TYPE_COLORS[t.type], color: "white" }}>{TYPE_LABELS[t.type] ?? t.type}</Badge>
                  {t.categorie && <span className="text-sm text-muted-foreground">{t.categorie}</span>}
                  {t.numero_recu && <span className="text-xs text-muted-foreground">Reçu #{t.numero_recu}</span>}
                </div>
                <p className="text-sm mt-1">{t.description || t.donateur || "—"}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("fr-FR")} {t.mode_reglement && `— ${t.mode_reglement}`}</p>
              </div>
              <p className={`text-lg font-bold ${t.type === "depense" ? "text-red-600" : "text-green-600"}`}>
                {t.type === "depense" ? "-" : "+"}{Number(t.montant).toLocaleString("fr-FR")} FCFA
              </p>
            </CardContent>
          </Card>
        ))}
        {transactions.length === 0 && !isLoading && <p className="text-center py-8 text-muted-foreground">Aucune transaction</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Type *</Label>
                <Select value={p("type")} onValueChange={v => set("type", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Montant (FCFA) *</Label><Input type="number" value={p("montant")} onChange={e => set("montant", e.target.value)} /></div>
              <div className="space-y-1"><Label>Date *</Label><Input type="date" value={p("date")} onChange={e => set("date", e.target.value)} /></div>
              <div className="space-y-1"><Label>Mode règlement</Label>
                <Select value={p("mode_reglement")} onValueChange={v => set("mode_reglement", v)}>
                  <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>{["Espèces", "Mobile Money", "Chèque", "Virement", "Autre"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Catégorie</Label><Input value={p("categorie")} onChange={e => set("categorie", e.target.value)} /></div>
              <div className="space-y-1"><Label>N° Reçu</Label><Input value={p("numero_recu")} onChange={e => set("numero_recu", e.target.value)} /></div>
            </div>
            {["don", "don_nature"].includes(p("type")) && (
              <div className="space-y-1"><Label>Donateur</Label><Input value={p("donateur")} onChange={e => set("donateur", e.target.value)} /></div>
            )}
            <div className="space-y-1"><Label>Description</Label><Textarea value={p("description")} onChange={e => set("description", e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => {
              if (!p("type") || !p("montant") || !p("date")) { toast({ title: "Champs requis manquants", variant: "destructive" }); return; }
              createMut.mutate({ type: p("type"), montant: parseFloat(p("montant")), date: p("date"), categorie: p("categorie") || undefined, description: p("description") || undefined, numero_recu: p("numero_recu") || undefined, donateur: p("donateur") || undefined, mode_reglement: p("mode_reglement") || undefined });
            }} disabled={createMut.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
