import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListImc, useCreateImcMesure, useDeleteImcMesure, useListParticipants, getListImcQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ImcMesure = {
  id: number;
  participant_id: number;
  participant_nom?: string | null;
  date_mesure: string;
  poids_kg: number;
  taille_cm: number;
  imc: number;
  classification: string;
  action_recommandee?: string | null;
};

function classifyColor(classification: string): string {
  if (!classification) return "bg-gray-100 text-gray-800";
  if (classification.includes("sévère")) return "bg-red-100 text-red-800";
  if (classification.includes("modérée")) return "bg-orange-100 text-orange-800";
  if (classification.includes("Surpoids")) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function calcImc(poids: number, taille: number): number {
  if (!poids || !taille || taille <= 0) return 0;
  return poids / Math.pow(taille / 100, 2);
}

function classifyImc(imc: number): string {
  if (imc <= 0) return "";
  if (imc < 16) return "Malnutrition aiguë sévère";
  if (imc < 17) return "Malnutrition aiguë modérée";
  if (imc >= 25 && imc < 30) return "Surpoids";
  return "IMC dans la plage normale";
}

export default function ImcTracking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchP, setSearchP] = useState("");
  const [selParticipant, setSelParticipant] = useState("");
  const [poids, setPoids] = useState("");
  const [taille, setTaille] = useState("");
  const [dateMesure, setDateMesure] = useState(new Date().toISOString().split("T")[0]);

  const { data: imcData = [], isLoading } = useListImc({});
  const { data: participantsData } = useListParticipants({ q: searchP, page: 1, page_size: 100 });
  const createMutation = useCreateImcMesure();
  const deleteMutation = useDeleteImcMesure();

  const mesures: ImcMesure[] = Array.isArray(imcData) ? imcData as ImcMesure[] : [];
  const participants = participantsData?.items || [];

  const poidsNum = parseFloat(poids);
  const tailleNum = parseFloat(taille);
  const imcPreview = calcImc(poidsNum, tailleNum);
  const classPreview = classifyImc(imcPreview);

  function handleCreate() {
    if (!selParticipant || !poids || !taille) return;
    createMutation.mutate({ data: { participant_id: Number(selParticipant), poids_kg: poidsNum, taille_cm: tailleNum, date_mesure: dateMesure } as Parameters<typeof createMutation.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListImcQueryKey() });
        toast({ title: "Mesure enregistrée" });
        setSelParticipant(""); setPoids(""); setTaille(""); setDateMesure(new Date().toISOString().split("T")[0]);
      },
      onError: () => toast({ title: "Erreur d'enregistrement", variant: "destructive" })
    });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate({ id } as Parameters<typeof deleteMutation.mutate>[0], {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListImcQueryKey() }); toast({ title: "Mesure supprimée" }); }
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Suivi IMC</h1>
        <p className="text-muted-foreground text-sm">Indice de Masse Corporelle — suivi nutritionnel des participants</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Nouvelle mesure</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Rechercher un participant</Label>
              <Input placeholder="Nom ou identifiant..." value={searchP} onChange={e => setSearchP(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Participant</Label>
              <Select value={selParticipant} onValueChange={setSelParticipant}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{participants.map((p: { id: number; nom_prenoms: string; id_participant: string }) => <SelectItem key={p.id} value={String(p.id)}>{p.nom_prenoms} ({p.id_participant})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Poids (kg)</Label>
              <Input type="number" step="0.1" min="0.1" value={poids} onChange={e => setPoids(e.target.value)} placeholder="Ex: 25.5" />
            </div>
            <div className="space-y-1">
              <Label>Taille (cm)</Label>
              <Input type="number" step="0.1" min="1" value={taille} onChange={e => setTaille(e.target.value)} placeholder="Ex: 130.0" />
            </div>
            <div className="space-y-1">
              <Label>Date de mesure</Label>
              <Input type="date" value={dateMesure} onChange={e => setDateMesure(e.target.value)} />
            </div>
            {imcPreview > 0 && (
              <div className="flex items-center">
                <div className="p-3 rounded border bg-muted/50 w-full">
                  <p className="text-sm text-muted-foreground">IMC calculé</p>
                  <p className="text-2xl font-bold">{imcPreview.toFixed(1)}</p>
                  <Badge className={classifyColor(classPreview)}>{classPreview}</Badge>
                </div>
              </div>
            )}
          </div>
          <Button onClick={handleCreate} disabled={!selParticipant || !poids || !taille || createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />{createMutation.isPending ? "Enregistrement..." : "Enregistrer la mesure"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique des mesures ({mesures.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead className="text-right">Poids (kg)</TableHead>
                <TableHead className="text-right">Taille (cm)</TableHead>
                <TableHead className="text-right">IMC</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : mesures.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune mesure enregistrée</TableCell></TableRow>
              ) : mesures.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.date_mesure).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{m.participant_nom || `Participant #${m.participant_id}`}</TableCell>
                  <TableCell className="text-right">{Number(m.poids_kg).toFixed(1)}</TableCell>
                  <TableCell className="text-right">{Number(m.taille_cm).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-bold">{Number(m.imc).toFixed(1)}</TableCell>
                  <TableCell><Badge className={classifyColor(m.classification)}>{m.classification}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
