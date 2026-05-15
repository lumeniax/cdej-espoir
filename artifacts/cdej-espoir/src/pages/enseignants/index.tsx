import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEnseignants, useCreateEnseignant, getListEnseignantsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function EnseignantsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: enseignants = [], isLoading } = useListEnseignants({});
  const createMutation = useCreateEnseignant();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [classe, setClasse] = useState("");

  function handleCreate() {
    if (!nom.trim()) return;
    createMutation.mutate({ data: { nom: nom.trim(), classe: classe.trim() || undefined, actif: true } as Parameters<typeof createMutation.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEnseignantsQueryKey() });
        toast({ title: "Enseignant créé" });
        setOpen(false); setNom(""); setClasse("");
      },
      onError: () => toast({ title: "Erreur de création", variant: "destructive" })
    });
  }

  const total = Array.isArray(enseignants) ? enseignants.reduce((s: number, e: { nb_eleves?: number }) => s + (e.nb_eleves || 0), 0) : 0;
  const actifs = Array.isArray(enseignants) ? enseignants.filter((e: { actif?: boolean }) => e.actif).length : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enseignants</h1>
          <p className="text-muted-foreground text-sm">{actifs} encadreur{actifs > 1 ? "s" : ""} actif{actifs > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nouvel enseignant</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{Array.isArray(enseignants) ? enseignants.length : 0}</div><p className="text-muted-foreground text-sm">Enseignants enregistrés</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{total}</div><p className="text-muted-foreground text-sm">Élèves pris en charge</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Liste des enseignants</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-center">Élèves</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : !Array.isArray(enseignants) || enseignants.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun enseignant enregistré</TableCell></TableRow>
              ) : (enseignants as Array<{ id: number; nom: string; classe?: string | null; nb_eleves?: number; actif?: boolean }>).map(e => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{e.nom}</TableCell>
                  <TableCell className="text-muted-foreground">{e.classe || "—"}</TableCell>
                  <TableCell className="text-center"><Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{e.nb_eleves || 0}</Badge></TableCell>
                  <TableCell><Badge className={e.actif ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{e.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                  <TableCell><Link href={`/enseignants/${e.id}`}><Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button></Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel enseignant</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Nom complet <span className="text-destructive">*</span></Label><Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Prénom NOM" /></div>
            <div className="space-y-1"><Label>Classe / Groupe</Label><Input value={classe} onChange={e => setClasse(e.target.value)} placeholder="Ex: Classe A (0-3 ans)" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!nom.trim() || createMutation.isPending}>{createMutation.isPending ? "Création..." : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
