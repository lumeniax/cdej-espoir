import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, Users, Heart, DollarSign, GraduationCap, CalendarCheck, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const EXPORTS = [
  { label: "Participants", url: "/api/export/participants.csv", icon: Users, color: "text-blue-600" },
  { label: "Présences", url: "/api/export/presences.csv", icon: CalendarCheck, color: "text-green-600" },
  { label: "Santé", url: "/api/export/sante.csv", icon: Heart, color: "text-red-600" },
  { label: "Finances", url: "/api/export/finances.csv", icon: DollarSign, color: "text-yellow-600" },
  { label: "Enseignants", url: "/api/export/enseignants.csv", icon: GraduationCap, color: "text-purple-600" },
];

interface PreviewRow { ligne: number; nom: string; sexe: string; date_naissance: string | null; village: string | null; errors: string[]; valid: boolean; }
interface Preview { mapping: Record<string, string | null>; preview: PreviewRow[]; total: number; valid: number; }

function readXlsx(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(e.target!.result as ArrayBuffer);
        const ws = wb.worksheets[0];
        const headers: string[] = [];
        ws.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? "")));
        const rows: Record<string, unknown>[] = [];
        ws.eachRow((row, ri) => {
          if (ri === 1) return;
          const obj: Record<string, unknown> = {};
          row.eachCell((cell, ci) => { if (headers[ci - 1]) obj[headers[ci - 1]] = cell.value; });
          rows.push(obj);
        });
        resolve({ headers, rows });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function ImportExport() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: { ligne: number; error: string }[] } | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [step, setStep] = useState<"select" | "preview" | "result">("select");
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setXlsxFile(file);
    setPreview(null);
    setImportResult(null);
    setStep("select");
    setLoading(true);
    try {
      const data = await readXlsx(file);
      setParsedData(data);
      const res = await apiClient("/api/import/participants/preview", {
        method: "POST",
        body: JSON.stringify({ rows: data.rows, headers: data.headers }),
      });
      if (!res.ok) throw new Error("Erreur de prévisualisation");
      const prev = await res.json() as Preview;
      setPreview(prev);
      setStep("preview");
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    if (!parsedData || !preview) return;
    setLoading(true);
    try {
      const res = await apiClient("/api/import/participants", {
        method: "POST",
        body: JSON.stringify({ rows: parsedData.rows, mapping: preview.mapping }),
      });
      const result = await res.json();
      setImportResult(result);
      setStep("result");
      toast({ title: `Import terminé: ${result.inserted} créés, ${result.skipped} ignorés` });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Import / Export</h1>
        <p className="text-muted-foreground mt-1">Exporter les données en CSV ou importer depuis Excel</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Exports CSV</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {EXPORTS.map(exp => {
            const Icon = exp.icon;
            return (
              <Card key={exp.url} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-6 pb-4 flex flex-col items-center gap-3 text-center">
                  <div className={`p-3 rounded-full bg-muted group-hover:scale-110 transition-transform ${exp.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-sm">{exp.label}</p>
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <a href={exp.url} download>
                      <Download className="w-3.5 h-3.5 mr-1.5" />CSV
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Import Excel — Participants</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-green-600" />Assistant d'import</CardTitle>
              <CardDescription>Format .xlsx ou .xls. Les colonnes sont détectées automatiquement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors ${xlsxFile ? "border-green-400 bg-green-50" : ""}`} onClick={() => fileRef.current?.click()}>
                {xlsxFile ? (
                  <div>
                    <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-700">{xlsxFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(xlsxFile.size / 1024).toFixed(1)} Ko</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Cliquer pour choisir un fichier Excel</p>
                    <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .xlsm</p>
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.xlsm" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>

              {loading && <p className="text-center text-sm text-muted-foreground">Analyse en cours...</p>}

              {step === "preview" && preview && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3.5 h-3.5 mr-1" />{preview.valid} valides</Badge>
                    <Badge className="bg-gray-100 text-gray-800">{preview.total} total</Badge>
                    {preview.total - preview.valid > 0 && <Badge className="bg-red-100 text-red-800"><XCircle className="w-3.5 h-3.5 mr-1" />{preview.total - preview.valid} ignorés</Badge>}
                  </div>
                  <Button className="w-full" onClick={doImport} disabled={loading || preview.valid === 0}>
                    <Upload className="w-4 h-4 mr-2" />Importer {preview.valid} participant{preview.valid > 1 ? "s" : ""}
                  </Button>
                </div>
              )}

              {step === "result" && importResult && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
                  <p className="font-semibold text-green-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />Import terminé</p>
                  <p className="text-sm"><span className="font-medium">{importResult.inserted}</span> participant(s) créé(s)</p>
                  <p className="text-sm text-muted-foreground"><span className="font-medium">{importResult.skipped}</span> ligne(s) ignorée(s)</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600">Ligne {e.ligne}: {e.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-5 h-5 text-blue-600" />Aperçu des données</CardTitle></CardHeader>
            <CardContent>
              {step === "select" && <p className="text-sm text-muted-foreground">Sélectionnez un fichier pour voir un aperçu des données avant import.</p>}
              {step === "preview" && preview && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {preview.preview.map(row => (
                    <div key={row.ligne} className={`text-xs rounded p-2 ${row.valid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                      <div className="flex items-center gap-2">
                        {row.valid ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                        <span className="font-medium">L.{row.ligne}</span>
                        <span>{row.nom || "(vide)"}</span>
                        {row.sexe && <Badge variant="outline" className="text-xs py-0">{row.sexe}</Badge>}
                        {row.date_naissance && <span className="text-muted-foreground">{row.date_naissance}</span>}
                      </div>
                      {row.errors.length > 0 && <p className="text-red-600 mt-1 pl-5">{row.errors.join(", ")}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
