import { useListFichesPaiement } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronRight, FileText } from "lucide-react";
import { Link } from "wouter";

type Fiche = { id: number; numero?: string | null; date_fiche: string; motivations?: string | null; total_montant: number; prepare_par?: string | null; statut: string };

const STATUTS: Record<string, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-gray-100 text-gray-700" },
  valide: { label: "Validé", cls: "bg-green-100 text-green-800" },
  annule: { label: "Annulé", cls: "bg-red-100 text-red-800" },
};

export default function FichesList() {
  const { data: fiches = [], isLoading } = useListFichesPaiement({});
  const list = Array.isArray(fiches) ? fiches as Fiche[] : [];

  const total = list.reduce((s, f) => s + Number(f.total_montant), 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fiches de paiement</h1>
          <p className="text-muted-foreground text-sm">{list.length} fiche{list.length > 1 ? "s" : ""} — Total : {total.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <Link href="/fiches-paiement/new">
          <Button><Plus className="h-4 w-4 mr-2" />Nouvelle fiche</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Liste des fiches</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Motivations</TableHead>
                <TableHead>Préparé par</TableHead>
                <TableHead className="text-right">Total (FCFA)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune fiche de paiement</TableCell></TableRow>
              ) : list.map(f => {
                const statut = STATUTS[f.statut] || { label: f.statut, cls: "bg-gray-100 text-gray-700" };
                return (
                  <TableRow key={f.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{f.numero || `#${f.id}`}</TableCell>
                    <TableCell>{new Date(f.date_fiche).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">{f.motivations || "—"}</TableCell>
                    <TableCell>{f.prepare_par || "—"}</TableCell>
                    <TableCell className="text-right font-bold">{Number(f.total_montant).toLocaleString("fr-FR")}</TableCell>
                    <TableCell><Badge className={statut.cls}>{statut.label}</Badge></TableCell>
                    <TableCell><Link href={`/fiches-paiement/${f.id}`}><Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button></Link></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
