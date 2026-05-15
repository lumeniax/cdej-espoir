import { useState } from "react";
import { useLocation, Link } from "wouter";
import { 
  useListParticipants, 
  Participant 
} from "@workspace/api-client-react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Plus, 
  Download, 
  Users,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

export function getYearsRemainingBadgeColor(years: number | null | undefined) {
  if (years === null || years === undefined) return "bg-gray-100 text-gray-800 border-gray-200";
  if (years <= 1) return "bg-red-100 text-red-800 border-red-200";
  if (years <= 3) return "bg-orange-100 text-orange-800 border-orange-200";
  if (years <= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-green-100 text-green-800 border-green-200";
}

export function getProgrammeBadgeColor(programme: string | null | undefined) {
  if (programme === "CDSP") return "bg-blue-100 text-blue-800 border-blue-200";
  if (programme === "Survie") return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

export default function Participants() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [programme, setProgramme] = useState<string>("all");
  const [sexe, setSexe] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useListParticipants({
    q: debouncedSearch || undefined,
    programme: programme !== "all" ? programme : undefined,
    sexe: sexe !== "all" ? sexe : undefined,
    page,
    page_size: pageSize
  });

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Participants
          </h1>
          <p className="text-muted-foreground mt-1">Gérez les enfants et jeunes du centre</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Button onClick={() => setLocation("/participants/new")} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Nouveau participant
          </Button>
        </div>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (Nom, ID, Village)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={programme} onValueChange={setProgramme}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous prog.</SelectItem>
                  <SelectItem value="CDSP">CDSP</SelectItem>
                  <SelectItem value="Survie">Survie</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sexe} onValueChange={setSexe}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Sexe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous sexes</SelectItem>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Nom & Prénoms</TableHead>
                  <TableHead className="font-semibold">Âge</TableHead>
                  <TableHead className="font-semibold">Sexe</TableHead>
                  <TableHead className="font-semibold">Programme</TableHead>
                  <TableHead className="font-semibold text-right">Reste (ans)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Aucun participant trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((participant: Participant) => (
                    <TableRow 
                      key={participant.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setLocation(`/participants/${participant.id}`)}
                    >
                      <TableCell className="font-medium text-muted-foreground">{participant.id_participant}</TableCell>
                      <TableCell className="font-semibold">{participant.nom_prenoms}</TableCell>
                      <TableCell>{participant.age_clair || "-"}</TableCell>
                      <TableCell>{participant.sexe}</TableCell>
                      <TableCell>
                        {participant.programme ? (
                          <Badge variant="outline" className={getProgrammeBadgeColor(participant.programme)}>
                            {participant.programme}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={getYearsRemainingBadgeColor(participant.annees_restantes)}>
                          {participant.annees_restantes !== null ? participant.annees_restantes : "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {data && data.total > pageSize && (
            <div className="p-4 flex items-center justify-between border-t border-border">
              <span className="text-sm text-muted-foreground">
                Affichage {(page - 1) * pageSize + 1} à {Math.min(page * pageSize, data.total)} sur {data.total}
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Précédent
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page * pageSize >= data.total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
