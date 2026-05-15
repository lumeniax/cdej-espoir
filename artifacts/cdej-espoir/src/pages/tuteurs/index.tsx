import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { Plus, Search, UserCheck, Phone, MapPin, Pencil, Trash2 } from "lucide-react";

interface Tuteur {
  id: number; nom: string; prenoms?: string; telephone?: string;
  telephone_alternatif?: string; village?: string; quartier?: string;
  profession?: string; eglise?: string; situation_familiale?: string;
  niveau_alphabetisation?: string; personne_urgence_nom?: string;
  personne_urgence_tel?: string; observations?: string;
}

const RELATIONS = ["Père", "Mère", "Tuteur légal", "Oncle", "Tante", "Grand-père", "Grand-mère", "Frère", "Sœur", "Autre"];

function TuteurForm({ tuteur, onClose }: { tuteur?: Tuteur; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<Tuteur>>(tuteur ?? {});

  const mutation = useMutation({
    mutationFn: async (data: Partial<Tuteur>) => {
      const res = tuteur
        ? await apiClient(`/api/tuteurs/${tuteur.id}`, { method: "PUT", body: JSON.stringify(data) })
        : await apiClient("/api/tuteurs", { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tuteurs"] });
      toast({ title: tuteur ? "Tuteur mis à jour" : "Tuteur créé" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const set = (k: keyof Tuteur, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nom *</Label>
          <Input value={form.nom ?? ""} onChange={e => set("nom", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Prénoms</Label>
          <Input value={form.prenoms ?? ""} onChange={e => set("prenoms", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Téléphone</Label>
          <Input value={form.telephone ?? ""} onChange={e => set("telephone", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tél. alternatif</Label>
          <Input value={form.telephone_alternatif ?? ""} onChange={e => set("telephone_alternatif", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Village</Label>
          <Input value={form.village ?? ""} onChange={e => set("village", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Quartier</Label>
          <Input value={form.quartier ?? ""} onChange={e => set("quartier", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Profession</Label>
          <Input value={form.profession ?? ""} onChange={e => set("profession", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Église / Religion</Label>
          <Input value={form.eglise ?? ""} onChange={e => set("eglise", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Situation familiale</Label>
          <Select value={form.situation_familiale ?? ""} onValueChange={v => set("situation_familiale", v)}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {["Marié(e)", "Célibataire", "Veuf/Veuve", "Divorcé(e)", "Séparé(e)"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Niveau alphabétisation</Label>
          <Select value={form.niveau_alphabetisation ?? ""} onValueChange={v => set("niveau_alphabetisation", v)}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {["Analphabète", "Primaire", "Collège", "Lycée", "Supérieur"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Personne à prévenir</Label>
          <Input value={form.personne_urgence_nom ?? ""} onChange={e => set("personne_urgence_nom", e.target.value)} placeholder="Nom" />
        </div>
        <div className="space-y-1">
          <Label>Tél. urgence</Label>
          <Input value={form.personne_urgence_tel ?? ""} onChange={e => set("personne_urgence_tel", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Observations</Label>
        <Textarea value={form.observations ?? ""} onChange={e => set("observations", e.target.value)} rows={2} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.nom}>
          {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function Tuteurs() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTuteur, setEditTuteur] = useState<Tuteur | undefined>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tuteurs = [], isLoading } = useQuery<Tuteur[]>({
    queryKey: ["/api/tuteurs", debouncedSearch],
    queryFn: () => apiFetch(`/api/tuteurs${debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : ""}`),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient(`/api/tuteurs/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tuteurs"] }); toast({ title: "Tuteur supprimé" }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tuteurs / Familles</h1>
          <p className="text-muted-foreground mt-1">{tuteurs.length} tuteur{tuteurs.length > 1 ? "s" : ""} enregistré{tuteurs.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditTuteur(undefined); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau tuteur
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher par nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : tuteurs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun tuteur trouvé</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tuteurs.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">{t.nom} {t.prenoms}</p>
                      {t.profession && <p className="text-xs text-muted-foreground">{t.profession}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditTuteur(t); setDialogOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {t.telephone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> <span>{t.telephone}</span>
                    {t.telephone_alternatif && <span>/ {t.telephone_alternatif}</span>}
                  </div>
                )}
                {(t.village || t.quartier) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> <span>{[t.village, t.quartier].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {t.situation_familiale && <Badge variant="outline" className="text-xs">{t.situation_familiale}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTuteur ? "Modifier le tuteur" : "Nouveau tuteur"}</DialogTitle>
          </DialogHeader>
          <TuteurForm tuteur={editTuteur} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
