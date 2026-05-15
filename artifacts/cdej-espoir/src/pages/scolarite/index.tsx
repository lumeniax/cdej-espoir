import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, GraduationCap, DollarSign, TrendingDown } from "lucide-react";
import { useListParticipants, getListParticipantsQueryKey } from "@workspace/api-client-react";

interface Bulletin { id: number; participant_id: number; annee_scolaire: string; trimestre?: number; ecole?: string; classe?: string; moyenne?: number; rang?: number; total_eleves?: number; appreciation?: string; observation?: string; }
interface FraisScolaire { id: number; participant_id: number; annee_scolaire: string; type_frais: string; montant: number; date_paiement?: string; statut?: string; }

function moyenneColor(m?: number) {
  if (m == null) return "";
  if (m >= 15) return "text-green-600 font-bold";
  if (m >= 10) return "text-blue-600 font-bold";
  if (m >= 7) return "text-orange-600 font-bold";
  return "text-red-600 font-bold";
}

export default function Scolarite() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("bulletins");
  const [dialogType, setDialogType] = useState<"bulletin" | "frais" | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: participants = [] } = useListParticipants({ page: 1, page_size: 200 }, { query: { queryKey: getListParticipantsQueryKey({ page: 1, page_size: 200 }) } });
  const participantList = (participants as any)?.items ?? participants;

  const { data: bulletins = [] } = useQuery<Bulletin[]>({
    queryKey: ["/api/scolarite/bulletins"],
    queryFn: () => apiFetch("/api/scolarite/bulletins"),
  });
  const { data: frais = [] } = useQuery<FraisScolaire[]>({
    queryKey: ["/api/scolarite/frais"],
    queryFn: () => apiFetch("/api/scolarite/frais"),
  });

  const createMut = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const ep = dialogType === "bulletin" ? "/api/scolarite/bulletins" : "/api/scolarite/frais";
      const res = await apiClient(ep, { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scolarite"] });
      toast({ title: "Enregistré" });
      setDialogType(null); setForm({});
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const p = (k: string) => form[k] ?? "";
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const pName = (id: number) => {
    const found = participantList.find((x: any) => x.id === id);
    return found ? found.nom_prenoms : `#${id}`;
  };

  const difficulte = bulletins.filter(b => b.moyenne != null && b.moyenne < 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Module Scolarité</h1>
          <p className="text-muted-foreground mt-1">Bulletins, résultats et frais scolaires</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setDialogType("frais"); setForm({}); }}><DollarSign className="w-4 h-4 mr-2" />Frais scolaires</Button>
          <Button onClick={() => { setDialogType("bulletin"); setForm({}); }}><Plus className="w-4 h-4 mr-2" />Bulletin</Button>
        </div>
      </div>

      {difficulte.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-700"><TrendingDown className="w-4 h-4" />{difficulte.length} enfant{difficulte.length > 1 ? "s" : ""} en difficulté scolaire</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {difficulte.slice(0, 8).map(b => (
              <Badge key={b.id} variant="destructive">{pName(b.participant_id)} — {b.moyenne}/20 ({b.annee_scolaire})</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="bulletins"><BookOpen className="w-4 h-4 mr-1" />Bulletins ({bulletins.length})</TabsTrigger>
          <TabsTrigger value="frais"><DollarSign className="w-4 h-4 mr-1" />Frais ({frais.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bulletins">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {bulletins.map(b => (
              <Card key={b.id}>
                <CardContent className="pt-4 space-y-2">
                  <p className="font-semibold text-sm">{pName(b.participant_id)}</p>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <Badge variant="outline">{b.annee_scolaire}</Badge>
                    {b.trimestre && <Badge variant="outline">T{b.trimestre}</Badge>}
                    {b.classe && <Badge variant="outline">{b.classe}</Badge>}
                  </div>
                  {b.moyenne != null && (
                    <p className={`text-xl ${moyenneColor(b.moyenne)}`}>{Number(b.moyenne).toFixed(2)}/20
                      {b.rang && <span className="text-sm font-normal text-muted-foreground ml-2">— {b.rang}e/{b.total_eleves}</span>}
                    </p>
                  )}
                  {b.appreciation && <p className="text-xs text-muted-foreground italic">{b.appreciation}</p>}
                </CardContent>
              </Card>
            ))}
            {bulletins.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">Aucun bulletin enregistré</p>}
          </div>
        </TabsContent>

        <TabsContent value="frais">
          <div className="mt-4 space-y-3">
            {frais.map(f => (
              <Card key={f.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{pName(f.participant_id)}</p>
                    <p className="text-sm">{f.type_frais} — <span className="font-semibold">{Number(f.montant).toLocaleString("fr-FR")} FCFA</span></p>
                    <p className="text-xs text-muted-foreground">{f.annee_scolaire} {f.date_paiement && `— payé le ${new Date(f.date_paiement).toLocaleDateString("fr-FR")}`}</p>
                  </div>
                  <Badge variant={f.statut === "paye" ? "default" : "destructive"}>{f.statut ?? "payé"}</Badge>
                </CardContent>
              </Card>
            ))}
            {frais.length === 0 && <p className="text-center py-8 text-muted-foreground">Aucun frais enregistré</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialogType} onOpenChange={(o) => !o && setDialogType(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{dialogType === "bulletin" ? "Nouveau bulletin" : "Frais scolaire"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Participant *</Label>
              <Select value={p("participant_id")} onValueChange={v => set("participant_id", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {participantList.map((pt: any) => (
                    <SelectItem key={pt.id} value={String(pt.id)}>{pt.nom_prenoms}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Année scolaire *</Label><Input value={p("annee_scolaire")} onChange={e => set("annee_scolaire", e.target.value)} placeholder="2024-2025" /></div>
              {dialogType === "bulletin" && <div className="space-y-1"><Label>Trimestre</Label>
                <Select value={p("trimestre")} onValueChange={v => set("trimestre", v)}>
                  <SelectTrigger><SelectValue placeholder="T..." /></SelectTrigger>
                  <SelectContent>{[1,2,3].map(t => <SelectItem key={t} value={String(t)}>Trimestre {t}</SelectItem>)}</SelectContent>
                </Select>
              </div>}
              {dialogType === "frais" && <div className="space-y-1"><Label>Type de frais *</Label><Input value={p("type_frais")} onChange={e => set("type_frais", e.target.value)} placeholder="Inscription, fournitures..." /></div>}
            </div>
            {dialogType === "bulletin" && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>Moyenne /20</Label><Input type="number" step="0.01" min="0" max="20" value={p("moyenne")} onChange={e => set("moyenne", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Rang</Label><Input type="number" value={p("rang")} onChange={e => set("rang", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Total élèves</Label><Input type="number" value={p("total_eleves")} onChange={e => set("total_eleves", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>École</Label><Input value={p("ecole")} onChange={e => set("ecole", e.target.value)} /></div>
                <div className="space-y-1"><Label>Classe</Label><Input value={p("classe")} onChange={e => set("classe", e.target.value)} /></div>
                <div className="space-y-1"><Label>Appréciation</Label><Input value={p("appreciation")} onChange={e => set("appreciation", e.target.value)} /></div>
              </>
            )}
            {dialogType === "frais" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Montant (FCFA) *</Label><Input type="number" value={p("montant")} onChange={e => set("montant", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Date paiement</Label><Input type="date" value={p("date_paiement")} onChange={e => set("date_paiement", e.target.value)} /></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Annuler</Button>
            <Button onClick={() => {
              if (!p("participant_id") || !p("annee_scolaire")) { toast({ title: "Champs requis manquants", variant: "destructive" }); return; }
              const data: Record<string, unknown> = { participant_id: parseInt(p("participant_id")), annee_scolaire: p("annee_scolaire") };
              if (dialogType === "bulletin") {
                if (p("trimestre")) data.trimestre = parseInt(p("trimestre"));
                if (p("moyenne")) data.moyenne = parseFloat(p("moyenne"));
                if (p("rang")) data.rang = parseInt(p("rang"));
                if (p("total_eleves")) data.total_eleves = parseInt(p("total_eleves"));
                if (p("ecole")) data.ecole = p("ecole");
                if (p("classe")) data.classe = p("classe");
                if (p("appreciation")) data.appreciation = p("appreciation");
              } else {
                if (!p("type_frais") || !p("montant")) { toast({ title: "Champs requis manquants", variant: "destructive" }); return; }
                data.type_frais = p("type_frais");
                data.montant = parseFloat(p("montant"));
                if (p("date_paiement")) data.date_paiement = p("date_paiement");
              }
              createMut.mutate(data);
            }} disabled={createMut.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
