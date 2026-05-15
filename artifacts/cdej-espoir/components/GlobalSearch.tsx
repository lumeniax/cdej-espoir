import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/apiClient";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { Users, Search } from "lucide-react";

interface SearchResult {
  id: number;
  type: "participant";
  label: string;
  subtitle?: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Search on query change
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{ participants?: { id: number; nom_prenoms: string; numero_ordre: number }[] }>(
          `/api/participants?q=${encodeURIComponent(query)}&limit=10`
        );
        const r: SearchResult[] = [];
        if (data?.participants) {
          for (const p of data.participants) {
            r.push({ id: p.id, type: "participant", label: p.nom_prenoms, subtitle: `TG015400${String(p.numero_ordre).padStart(3,'0')}`, href: `/participants/${p.id}` });
          }
        }
        setResults(r);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    setLocation(href);
  }, [setLocation]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground w-full transition-colors"
        data-testid="button-global-search"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">Rechercher...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-sidebar-border px-1.5 text-xs text-sidebar-foreground/50">
          <span>Ctrl</span><span>K</span>
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher participants, enseignants..."
          value={query}
          onValueChange={setQuery}
          data-testid="input-global-search"
        />
        <CommandList>
          <CommandEmpty>{loading ? "Recherche en cours..." : query.length < 2 ? "Saisissez au moins 2 caractères" : "Aucun résultat"}</CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Participants">
              {results.map(r => (
                <CommandItem
                  key={r.id}
                  value={r.label}
                  onSelect={() => handleSelect(r.href)}
                  data-testid={`search-result-${r.id}`}
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{r.label}</span>
                  {r.subtitle && <span className="ml-2 text-xs text-muted-foreground">{r.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
