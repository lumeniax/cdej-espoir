import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEtablissements, useCreateEtablissement, getListEtablissementsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function EtablissementsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: etablissements = [], isLoading } = useListEtablissements({});
  const createMutation = useCreateEtablissement();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [contact, setContact] = useState("");

  function handleCreate() {
    if (!nom.trim()) return;
    createMutation.mutate({ data: { nom: nom.trim(), adresse: adresse.trim() || undefined, contact: contact.trim() || undefined, actif: true } as Parameters<typeof createMutation.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEtablissementsQueryKey() });
        toast({ title: "Établissement créé" });
        setOpen(false); setNom(""); setAdresse(""); setContact("");
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" })
    });
  }

  const list = Array.isArray(etablissements) ? etablissements as Array<{ id: number; nom: string; adresse?: string | null; contact?: string | null; nb_eleves?: number; actif?: boolean }> : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Établissements scolaires</h1>
          <p className="text-muted-foreground text-sm">{list.length} établissement{list.length > 1 ? "s" : ""} enregistré{list.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nouvel établissement</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Liste des établissements</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Élèves inscrits</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun établissement</TableCell></TableRow>
              ) : list.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nom}</TableCell>
                  <TableCell className="text-muted-foreground">{e.adresse || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.contact || "—"}</TableCell>
                  <TableCell className="text-center"><Badge variant="secondary">{e.nb_eleves || 0}</Badge></TableCell>
                  <TableCell><Link href={`/etablissements/${e.id}`}><Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button></Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel établissement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Nom <span className="text-destructive">*</span></Label><Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de l'établissement" /></div>
            <div className="space-y-1"><Label>Adresse</Label><Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse complète" /></div>
            <div className="space-y-1"><Label>Contact</Label><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="+228 9X XX XX XX" /></div>
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
