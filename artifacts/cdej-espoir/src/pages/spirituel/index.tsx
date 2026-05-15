import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Star, Plus } from "lucide-react";
import { useListParticipants, getListParticipantsQueryKey } from "@workspace/api-client-react";

interface Spirituel { participant_id: number; est_baptise?: boolean; date_bapteme?: string; eglise_bapteme?: string; est_confirme?: boolean; ecoles_dimanche?: boolean; catechese?: boolean; chorale?: boolean; theatre?: boolean; memorisation_biblique?: string; distinctions?: string; observations?: string; }

export default function Spirituel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Spirituel>>({});
  const [edited, setEdited] = useState(false);

  const { data: participants = [] } = useListParticipants({ page: 1, page_size: 200 }, { query: { queryKey: getListParticipantsQueryKey({ page: 1, page_size: 200 }) } });
  const participantList = (participants as any)?.items ?? participants;

  const { data: spirituel, isLoading } = useQuery<Spirituel | null>({
    queryKey: ["/api/spirituel", selectedId],
    queryFn: () => selectedId ? apiFetch(`/api/spirituel/${selectedId}`) : Promise.resolve(null),
    enabled: !!selectedId,
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<Spirituel>) => apiClient(`/api/spirituel/${selectedId}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/spirituel", selectedId] });
      toast({ title: "Fiche spirituelle mise à jour" });
      setEdited(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setEdited(false);
  };

  const handleChange = (field: keyof Spirituel, value: unknown) => {
    setForm(f => ({ ...f, [field]: value }));
    setEdited(true);
  };

  const current = { ...spirituel, ...form };
  const cb = (field: keyof Spirituel) => (
    <Checkbox
      checked={!!current[field]}
      onCheckedChange={(v) => handleChange(field, !!v)}
      id={field}
    />
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Star className="w-7 h-7" />Module Spirituel</h1>
        <p className="text-muted-foreground mt-1">Suivi spirituel et activités CDEJ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader><CardTitle className="text-base">Sélectionner un participant</CardTitle></CardHeader>
            <CardContent className="space-y-1 max-h-96 overflow-y-auto">
              {participantList.map((p: any) => (
                <button key={p.id} onClick={() => handleSelect(p.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted transition-colors ${selectedId === p.id ? "bg-primary/10 font-medium text-primary" : ""}`}>
                  {p.nom_prenoms}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedId ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Sélectionnez un participant pour voir sa fiche spirituelle</CardContent></Card>
          ) : isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Chargement...</CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Fiche spirituelle</CardTitle>
                {edited && <Button size="sm" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Sauvegarder</Button>}
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Baptême et confirmation</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">{cb("est_baptise")}<Label htmlFor="est_baptise">Baptisé(e)</Label></div>
                      {current.est_baptise && (
                        <>
                          <div className="space-y-1"><Label>Date de baptême</Label><Input type="date" value={current.date_bapteme ?? ""} onChange={e => handleChange("date_bapteme", e.target.value)} /></div>
                          <div className="space-y-1"><Label>Église</Label><Input value={current.eglise_bapteme ?? ""} onChange={e => handleChange("eglise_bapteme", e.target.value)} /></div>
                        </>
                      )}
                      <div className="flex items-center gap-2">{cb("est_confirme")}<Label htmlFor="est_confirme">Confirmé(e)</Label></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Activités CDEJ</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">{cb("ecoles_dimanche")}<Label htmlFor="ecoles_dimanche">École du Dimanche</Label></div>
                      <div className="flex items-center gap-2">{cb("catechese")}<Label htmlFor="catechese">Catéchèse</Label></div>
                      <div className="flex items-center gap-2">{cb("chorale")}<Label htmlFor="chorale">Chorale</Label></div>
                      <div className="flex items-center gap-2">{cb("theatre")}<Label htmlFor="theatre">Théâtre</Label></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Mémorisation biblique</Label>
                  <Select value={current.memorisation_biblique ?? ""} onValueChange={v => handleChange("memorisation_biblique", v)}>
                    <SelectTrigger><SelectValue placeholder="Niveau..." /></SelectTrigger>
                    <SelectContent>
                      {["Débutant", "Intermédiaire", "Avancé", "Expert"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Distinctions et récompenses</Label>
                  <Textarea value={current.distinctions ?? ""} onChange={e => handleChange("distinctions", e.target.value)} rows={2} />
                </div>

                <div className="space-y-1">
                  <Label>Observations spirituelles</Label>
                  <Textarea value={current.observations ?? ""} onChange={e => handleChange("observations", e.target.value)} rows={3} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {current.est_baptise && <Badge className="bg-blue-100 text-blue-800">Baptisé(e)</Badge>}
                  {current.est_confirme && <Badge className="bg-purple-100 text-purple-800">Confirmé(e)</Badge>}
                  {current.ecoles_dimanche && <Badge variant="outline">École du Dimanche</Badge>}
                  {current.catechese && <Badge variant="outline">Catéchèse</Badge>}
                  {current.chorale && <Badge variant="outline">Chorale</Badge>}
                  {current.theatre && <Badge variant="outline">Théâtre</Badge>}
                  {current.memorisation_biblique && <Badge className="bg-yellow-100 text-yellow-800">{current.memorisation_biblique}</Badge>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
