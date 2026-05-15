import { useParams, Link } from "wouter";
import { useGetFichePaiement, getGetFichePaiementQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Fiche = {
  id: number; numero?: string | null; date_fiche: string; motivations?: string | null;
  total_montant: number; prepare_par?: string | null; valide_par?: string | null; statut: string;
  lignes?: Array<{ id: number; ordre: number; nom: string; contact?: string | null; montant: number }>;
};

const STATUTS: Record<string, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-gray-100 text-gray-700" },
  valide: { label: "Validé", cls: "bg-green-100 text-green-800" },
  annule: { label: "Annulé", cls: "bg-red-100 text-red-800" },
};

export default function FicheDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const { data: fiche, isLoading } = useGetFichePaiement(numId, { query: { enabled: !!numId, queryKey: getGetFichePaiementQueryKey(numId) } });

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!fiche) return <div className="p-6"><p className="text-muted-foreground">Fiche non trouvée.</p></div>;

  const f = fiche as unknown as Fiche;
  const statut = STATUTS[f.statut] || { label: f.statut, cls: "bg-gray-100 text-gray-700" };
  const lignes = f.lignes || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link href="/fiches-paiement"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{f.numero || `Fiche #${f.id}`}</h1>
              <Badge className={statut.cls}>{statut.label}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{new Date(f.date_fiche).toLocaleDateString("fr-FR")}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
      </div>

      {/* Printable section */}
      <div className="print-content">
        <div className="print-header hidden print:block text-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold">CDEJ ESPOIR — AVEDZE-AGBELOUVE</h2>
          <p className="text-sm text-gray-600">Centre de Développement de l'Enfant et de la Jeunesse</p>
          <p className="text-sm text-gray-600">Assemblées de Dieu — TOGO</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Informations de la fiche</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Numéro :</span> <span className="font-medium font-mono">{f.numero || `#${f.id}`}</span></div>
            <div><span className="text-muted-foreground">Date :</span> <span className="font-medium">{new Date(f.date_fiche).toLocaleDateString("fr-FR")}</span></div>
            <div><span className="text-muted-foreground">Préparé par :</span> <span className="font-medium">{f.prepare_par || "—"}</span></div>
            <div><span className="text-muted-foreground">Approuvé par :</span> <span className="font-medium">{f.valide_par || "—"}</span></div>
            {f.motivations && <div className="col-span-2"><span className="text-muted-foreground">Objet :</span> <span className="font-medium">{f.motivations}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Détail des paiements</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">N°</th>
                  <th className="text-left p-3 font-medium">Nom</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-right p-3 font-medium">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {lignes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Aucune ligne</td></tr>
                ) : lignes.map(l => (
                  <tr key={l.id} className="border-b">
                    <td className="p-3 text-muted-foreground">{l.ordre}</td>
                    <td className="p-3 font-medium">{l.nom}</td>
                    <td className="p-3 text-muted-foreground">{l.contact || "—"}</td>
                    <td className="p-3 text-right font-medium">{Number(l.montant).toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td colSpan={3} className="p-3 font-bold text-right">TOTAL</td>
                  <td className="p-3 font-bold text-right text-lg">{Number(f.total_montant).toLocaleString("fr-FR")} FCFA</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500 italic">
          "Instruis l'enfant selon la voie qu'il doit suivre, et quand il sera vieux, il ne s'en détournera pas." — Proverbes 22 : 6
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          nav, aside, [data-sidebar] { display: none !important; }
          body { padding: 0; margin: 0; }
        }
      `}</style>
    </div>
  );
}
