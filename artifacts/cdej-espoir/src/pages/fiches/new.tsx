import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateFichePaiement, getListFichesPaiementQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Ligne = { id: string; nom: string; contact: string; montant: string };

export default function FicheNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateFichePaiement();

  const [dateFiche, setDateFiche] = useState(new Date().toISOString().split("T")[0]);
  const [motivations, setMotivations] = useState("");
  const [preparePar, setPreparePar] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ id: "1", nom: "", contact: "", montant: "" }]);

  function addLigne() {
    setLignes(prev => [...prev, { id: String(Date.now()), nom: "", contact: "", montant: "" }]);
  }

  function removeLigne(id: string) {
    setLignes(prev => prev.filter(l => l.id !== id));
  }

  function updateLigne(id: string, field: keyof Ligne, value: string) {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }

  const totalMontant = lignes.reduce((sum, l) => sum + (parseFloat(l.montant) || 0), 0);

  function handleSubmit() {
    if (!dateFiche) return;
    const lignesData = lignes.filter(l => l.nom.trim()).map((l, i) => ({
      ordre: i + 1, nom: l.nom.trim(), contact: l.contact.trim() || undefined, montant: parseFloat(l.montant) || 0
    }));

    createMutation.mutate({ data: {
      date_fiche: dateFiche,
      motivations: motivations.trim() || undefined,
      prepare_par: preparePar.trim() || undefined,
      lignes: lignesData as Parameters<typeof createMutation.mutate>[0]["data"]["lignes"],
    } as Parameters<typeof createMutation.mutate>[0]["data"] }, {
      onSuccess: (fiche: unknown) => {
        queryClient.invalidateQueries({ queryKey: getListFichesPaiementQueryKey() });
        toast({ title: "Fiche créée avec succès" });
        navigate(`/fiches-paiement/${(fiche as { id: number }).id}`);
      },
      onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" })
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/fiches-paiement"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Nouvelle fiche de paiement</h1>
          <p className="text-muted-foreground text-sm">Créer une fiche de collecte de fonds</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Date <span className="text-destructive">*</span></Label>
            <Input type="date" value={dateFiche} onChange={e => setDateFiche(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Préparé par</Label>
            <Input value={preparePar} onChange={e => setPreparePar(e.target.value)} placeholder="Nom du responsable" />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Motivations / Objet</Label>
            <Textarea value={motivations} onChange={e => setMotivations(e.target.value)} placeholder="Objet de la collecte..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lignes de paiement</CardTitle>
            <Button variant="outline" size="sm" onClick={addLigne}><Plus className="h-4 w-4 mr-2" />Ajouter une ligne</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground pb-1 border-b">
            <span className="col-span-5">Nom</span>
            <span className="col-span-3">Contact</span>
            <span className="col-span-3 text-right">Montant (FCFA)</span>
            <span className="col-span-1"></span>
          </div>
          {lignes.map((l, i) => (
            <div key={l.id} className="grid grid-cols-12 gap-2">
              <Input className="col-span-5" value={l.nom} onChange={e => updateLigne(l.id, "nom", e.target.value)} placeholder={`Nom ${i + 1}`} />
              <Input className="col-span-3" value={l.contact} onChange={e => updateLigne(l.id, "contact", e.target.value)} placeholder="Contact" />
              <Input className="col-span-3 text-right" type="number" min="0" step="100" value={l.montant} onChange={e => updateLigne(l.id, "montant", e.target.value)} placeholder="0" />
              <Button variant="ghost" size="sm" className="col-span-1" onClick={() => removeLigne(l.id)} disabled={lignes.length <= 1}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
            </div>
          ))}
          <Separator />
          <div className="flex justify-end items-center gap-4">
            <span className="text-muted-foreground font-medium">Total :</span>
            <span className="text-xl font-bold">{totalMontant.toLocaleString("fr-FR")} FCFA</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/fiches-paiement"><Button variant="outline">Annuler</Button></Link>
        <Button onClick={handleSubmit} disabled={!dateFiche || createMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{createMutation.isPending ? "Création..." : "Créer la fiche"}
        </Button>
      </div>
    </div>
  );
}
