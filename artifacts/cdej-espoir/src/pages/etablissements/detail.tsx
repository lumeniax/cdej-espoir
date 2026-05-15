import { useParams, Link } from "wouter";
import { useGetEtablissement, getGetEtablissementQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EtablissementDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const { data: etab, isLoading } = useGetEtablissement(numId, { query: { enabled: !!numId, queryKey: getGetEtablissementQueryKey(numId) } });

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!etab) return <div className="p-6"><p className="text-muted-foreground">Établissement non trouvé.</p></div>;

  const e = etab as typeof etab & { eleves?: Array<{ id: number; nom_prenoms: string; id_participant: string; sexe: string; programme?: string | null }> };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/etablissements"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{etab.nom}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {etab.adresse && <span><MapPin className="inline h-3 w-3 mr-1" />{etab.adresse}</span>}
            {etab.contact && <span><Phone className="inline h-3 w-3 mr-1" />{etab.contact}</span>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Élèves inscrits ({e.nb_eleves || 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Identifiant</TableHead><TableHead>Nom</TableHead><TableHead>Sexe</TableHead><TableHead>Programme</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {!e.eleves || e.eleves.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun élève inscrit</TableCell></TableRow>
              ) : e.eleves.map(el => (
                <TableRow key={el.id}>
                  <TableCell className="font-mono text-sm">{el.id_participant}</TableCell>
                  <TableCell className="font-medium">{el.nom_prenoms}</TableCell>
                  <TableCell>{el.sexe === "M" ? "M" : "F"}</TableCell>
                  <TableCell>{el.programme ? <Badge className={el.programme === "CDSP" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>{el.programme}</Badge> : "—"}</TableCell>
                  <TableCell><Link href={`/participants/${el.id}`}><Button variant="ghost" size="sm">Voir</Button></Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
