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
import { Plus, Heart, Activity, Syringe, Stethoscope, AlertTriangle } from "lucide-react";
import { useListParticipants, getListParticipantsQueryKey } from "@workspace/api-client-react";

interface Mesure { id: number; participant_id: number; date_mesure: string; poids_kg?: number; taille_cm?: number; imc?: number; imc_classification?: string; etat_nutritionnel?: string; note?: string; }
interface Vaccination { id: number; participant_id: number; vaccin: string; date_administration?: string; date_prochaine_dose?: string; centre?: string; }
interface Visite { id: number; participant_id: number; date_visite: string; motif?: string; diagnostic?: string; traitement?: string; }

function imcColor(c?: string) {
  if (!c) return "";
  if (c.includes("sévère") || c.includes("Obésité")) return "bg-red-100 text-red-800";
  if (c.includes("modérée") || c.includes("Surpoids")) return "bg-orange-100 text-orange-800";
  if (c === "Normal") return "bg-green-100 text-green-800";
  return "bg-yellow-100 text-yellow-800";
}

export default function Sante() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("mesures");
  const [dialogType, setDialogType] = useState<"mesure" | "vaccination" | "visite" | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: participants = [] } = useListParticipants({ page: 1, page_size: 200 }, { query: { queryKey: getListParticipantsQueryKey({ page: 1, page_size: 200 }) } });
  const participantList = (participants as any)?.items ?? participants;

  const { data: mesures = [] } = useQuery<Mesure[]>({
    queryKey: ["/api/sante/mesures"],
    queryFn: () => apiFetch("/api/sante/mesures"),
  });
  const { data: vaccinations = [] } = useQuery<Vaccination[]>({
    queryKey: ["/api/sante/vaccinations"],
    queryFn: () => apiFetch("/api/sante/vaccinations"),
  });
  const { data: visites = [] } = useQuery<Visite[]>({
    queryKey: ["/api/sante/visites"],
    queryFn: () => apiFetch("/api/sante/visites"),
  });

  const createMut = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const endpoint = dialogType === "mesure" ? "/api/sante/mesures" : dialogType === "vaccination" ? "/api/sante/vaccinations" : "/api/sante/visites";
      const res = await apiClient(endpoint, { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sante"] });
      toast({ title: "Enregistré" });
      setDialogType(null);
      setForm({});
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const p = (k: string) => form[k] ?? "";
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const participantName = (id: number) => {
    const p = participantList.find((x: any) => x.id === id);
    return p ? `${p.nom_prenoms} (${p.id_participant ?? ""})` : `#${id}`;
  };

  const alertesIMC = mesures.filter(m => m.imc_classification && m.imc_classification !== "Normal");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Module Santé</h1>
          <p className="text-muted-foreground mt-1">Suivi médical des participants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setDialogType("vaccination"); setForm({}); }}><Syringe className="w-4 h-4 mr-2" />Vaccination</Button>
          <Button variant="outline" onClick={() => { setDialogType("visite"); setForm({}); }}><Stethoscope className="w-4 h-4 mr-2" />Visite</Button>
          <Button onClick={() => { setDialogType("mesure"); setForm({}); }}><Plus className="w-4 h-4 mr-2" />Mesure</Button>
        </div>
      </div>

      {alertesIMC.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-orange-700"><AlertTriangle className="w-4 h-4" />Alertes IMC ({alertesIMC.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alertesIMC.slice(0, 8).map(m => (
              <Badge key={m.id} className={imcColor(m.imc_classification)}>
                {participantName(m.participant_id)} — {m.imc_classification} ({m.imc?.toFixed(1)})
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mesures"><Activity className="w-4 h-4 mr-1" />Mesures ({mesures.length})</TabsTrigger>
          <TabsTrigger value="vaccinations"><Syringe className="w-4 h-4 mr-1" />Vaccins ({vaccinations.length})</TabsTrigger>
          <TabsTrigger value="visites"><Stethoscope className="w-4 h-4 mr-1" />Visites ({visites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mesures">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {mesures.slice(0, 30).map(m => (
              <Card key={m.id}>
                <CardContent className="pt-4 space-y-2">
                  <p className="font-medium text-sm">{participantName(m.participant_id)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.date_mesure).toLocaleDateString("fr-FR")}</p>
                  <div className="flex gap-2 flex-wrap">
                    {m.poids_kg && <Badge variant="outline">{m.poids_kg} kg</Badge>}
                    {m.taille_cm && <Badge variant="outline">{m.taille_cm} cm</Badge>}
                    {m.imc && <Badge variant="outline">IMC: {Number(m.imc).toFixed(1)}</Badge>}
                    {m.imc_classification && <Badge className={imcColor(m.imc_classification)}>{m.imc_classification}</Badge>}
                  </div>
                  {m.note && <p className="text-xs text-muted-foreground">{m.note}</p>}
                </CardContent>
              </Card>
            ))}
            {mesures.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">Aucune mesure enregistrée</p>}
          </div>
        </TabsContent>

        <TabsContent value="vaccinations">
          <div className="mt-4 space-y-3">
            {vaccinations.slice(0, 30).map(v => (
              <Card key={v.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{participantName(v.participant_id)}</p>
                    <p className="text-sm"><span className="font-medium">{v.vaccin}</span> {v.date_administration && `— ${new Date(v.date_administration).toLocaleDateString("fr-FR")}`}</p>
                    {v.centre && <p className="text-xs text-muted-foreground">{v.centre}</p>}
                  </div>
                  {v.date_prochaine_dose && (
                    <Badge variant={new Date(v.date_prochaine_dose) < new Date() ? "destructive" : "outline"}>
                      Rappel: {new Date(v.date_prochaine_dose).toLocaleDateString("fr-FR")}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            {vaccinations.length === 0 && <p className="text-center py-8 text-muted-foreground">Aucune vaccination enregistrée</p>}
          </div>
        </TabsContent>

        <TabsContent value="visites">
          <div className="mt-4 space-y-3">
            {visites.slice(0, 30).map(v => (
              <Card key={v.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{participantName(v.participant_id)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(v.date_visite).toLocaleDateString("fr-FR")} {v.motif && `— ${v.motif}`}</p>
                    </div>
                  </div>
                  {v.diagnostic && <p className="text-sm mt-1"><span className="font-medium">Diagnostic:</span> {v.diagnostic}</p>}
                  {v.traitement && <p className="text-sm"><span className="font-medium">Traitement:</span> {v.traitement}</p>}
                </CardContent>
              </Card>
            ))}
            {visites.length === 0 && <p className="text-center py-8 text-muted-foreground">Aucune visite enregistrée</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialogType} onOpenChange={(o) => !o && setDialogType(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "mesure" ? "Nouvelle mesure" : dialogType === "vaccination" ? "Nouvelle vaccination" : "Nouvelle visite médicale"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Participant *</Label>
              <Select value={p("participant_id")} onValueChange={v => set("participant_id", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir un participant..." /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {participantList.map((pt: any) => (
                    <SelectItem key={pt.id} value={String(pt.id)}>{pt.nom_prenoms}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dialogType === "mesure" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Date *</Label><Input type="date" value={p("date_mesure")} onChange={e => set("date_mesure", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Poids (kg)</Label><Input type="number" step="0.1" value={p("poids_kg")} onChange={e => set("poids_kg", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Taille (cm)</Label><Input type="number" step="0.1" value={p("taille_cm")} onChange={e => set("taille_cm", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Périmètre (cm)</Label><Input type="number" step="0.1" value={p("perimetre")} onChange={e => set("perimetre", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>Note</Label><Textarea value={p("note")} onChange={e => set("note", e.target.value)} rows={2} /></div>
              </>
            )}

            {dialogType === "vaccination" && (
              <>
                <div className="space-y-1"><Label>Vaccin *</Label><Input value={p("vaccin")} onChange={e => set("vaccin", e.target.value)} placeholder="DTC, Polio, BCG..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Date administration</Label><Input type="date" value={p("date_administration")} onChange={e => set("date_administration", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Prochaine dose</Label><Input type="date" value={p("date_prochaine_dose")} onChange={e => set("date_prochaine_dose", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>Centre de santé</Label><Input value={p("centre")} onChange={e => set("centre", e.target.value)} /></div>
              </>
            )}

            {dialogType === "visite" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Date *</Label><Input type="date" value={p("date_visite")} onChange={e => set("date_visite", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Motif</Label><Input value={p("motif")} onChange={e => set("motif", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>Diagnostic</Label><Textarea value={p("diagnostic")} onChange={e => set("diagnostic", e.target.value)} rows={2} /></div>
                <div className="space-y-1"><Label>Traitement</Label><Textarea value={p("traitement")} onChange={e => set("traitement", e.target.value)} rows={2} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Annuler</Button>
            <Button onClick={() => {
              if (!p("participant_id")) { toast({ title: "Participant requis", variant: "destructive" }); return; }
              const data: Record<string, unknown> = { participant_id: parseInt(p("participant_id")), ...form };
              if (p("poids_kg")) data.poids_kg = parseFloat(p("poids_kg"));
              if (p("taille_cm")) data.taille_cm = parseFloat(p("taille_cm"));
              if (p("perimetre")) data.perimetre = parseFloat(p("perimetre"));
              delete data.participant_id;
              createMut.mutate({ participant_id: parseInt(p("participant_id")), ...data });
            }} disabled={createMut.isPending}>
              {createMut.isPending ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
