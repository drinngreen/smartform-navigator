import { useEffect, useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useConferimentoCerOptions } from "@/hooks/useConferimentoCerOptions";

interface DragonCerSelectorProps {
  value: string;
  onChange: (itemId: string) => void;
  excludeItemId?: string;
  placeholder?: string;
}

export function DragonCerSelector({ value, onChange, excludeItemId, placeholder = "Cerca CER o materiale..." }: DragonCerSelectorProps) {
  const { items, create } = useDragonItems();
  const { preferiti, tutti } = useConferimentoCerOptions();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const selected = items.find((item) => item.id === value);
  const describe = (codice?: string, fallback?: string | null) => {
    if (!codice) return fallback ?? "";
    const digits = codice.replace(/\D/g, "");
    const entry = tutti.find((e) => e.codice.replace(/\D/g, "") === digits);
    if (entry?.descrizione) return entry.descrizione;
    if (fallback && !/^cer\s*[\d\s*.]+$/i.test(fallback.trim())) return fallback;
    return "";
  };
  // Chiave normalizzata (maiuscole, senza separatori) per riconoscere lo stesso CER
  // scritto in modi diversi: "200140-fe", "200140 FE", "200140FE".
  const cerKey = (code: string) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const existingByCode = useMemo(() => {
    const map = new Map<string, (typeof items)[number]>();
    items.forEach((item) => {
      if (!item.codice_cer) return;
      map.set(cerKey(item.codice_cer), item);
    });
    return map;
  }, [items]);
  const preferredCodes = useMemo(() => new Set(preferiti.map((entry) => entry.codice)), [preferiti]);
  const normalized = search.trim().toLocaleLowerCase("it");
  const digits = normalized.replace(/\D/g, "");

  // Materiali Dragon con codice non presente nel catalogo europeo (es. "200140-FE", "200140-MIX"):
  // devono essere selezionabili, altrimenti le cernite non trovano le giacenze reali.
  const extraDragon = useMemo(() => {
    const catalogCodes = new Set(tutti.map((entry) => cerKey(entry.codice)));
    return items
      .filter((item) => item.attivo !== false && item.codice_cer && !catalogCodes.has(cerKey(item.codice_cer)))
      .map((item) => ({ codice: item.codice_cer, descrizione: item.descrizione || item.codice_cer, pericoloso: false }));
  }, [items, tutti]);

  const results = useMemo(() => {
    const base = [...extraDragon, ...(showAll || normalized.length > 0 ? tutti : preferiti)];
    const seen = new Set<string>();
    return base.filter((entry) => {
      const key = cerKey(entry.codice);
      if (seen.has(key)) return false;
      const item = existingByCode.get(key);
      if (item && item.id === excludeItemId) return false;
      if (normalized) {
        const code = entry.codice.toLocaleLowerCase("it");
        const matchCode = digits.length > 0 && code.replace(/\D/g, "").includes(digits);
        const matchText = entry.descrizione.toLocaleLowerCase("it").includes(normalized);
        if (!matchCode && !matchText) return false;
      }
      seen.add(key);
      return true;
    }).slice(0, 300);
  }, [digits, excludeItemId, existingByCode, extraDragon, normalized, preferiti, showAll, tutti]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const choose = async (code: string) => {
    const existing = existingByCode.get(cerKey(code));
    if (existing) {
      onChange(existing.id);
      setOpen(false);
      return;
    }
    const catalogEntry = tutti.find((entry) => cerKey(entry.codice) === cerKey(code));
    if (!catalogEntry) return;
    try {
      const created = await create.mutateAsync({
        codice_cer: catalogEntry.codice,
        descrizione: catalogEntry.descrizione,
        pericoloso: catalogEntry.pericoloso,
        item_type: "WASTE_CER",
        attivo: true,
        metadata: { source: "catalogo_cer_globale" },
      });
      onChange(created.id);
      setOpen(false);
    } catch (error) {
      // Se il materiale esiste già (codice scritto diversamente) lo riusiamo invece di bloccare la cernita.
      const fallback = items.find((item) => cerKey(item.codice_cer) === cerKey(code));
      if (fallback) {
        onChange(fallback.id);
        setOpen(false);
        return;
      }
      throw error;
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          className="min-w-0 flex-1 justify-start gap-2 text-left font-normal"
          onClick={() => setOpen(true)}
        >
          {selected ? (
            <>
              <span className="shrink-0 font-mono text-xs">{selected.codice_cer}</span>
              <span className="truncate text-xs text-muted-foreground">{describe(selected.codice_cer, selected.descrizione)}</span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
        </Button>
        {selected && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onChange("")} aria-label="Rimuovi CER selezionato">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[85vh] max-h-[85vh] w-[96vw] max-w-2xl flex-col gap-3 p-4 sm:p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Seleziona CER / materiale</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              inputMode="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 pl-9 text-base text-foreground placeholder:text-muted-foreground"
              placeholder="Codice CER o descrizione"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} className="accent-emerald-500" />
            <span>Mostra tutti i CER del catalogo europeo</span>
            <span className="ml-auto font-mono">{results.length} risultati</span>
          </label>

          <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
            {results.map((entry) => {
              const existing = existingByCode.get(entry.codice);
              const isSelected = existing?.id === value;
              return (
                <button
                  key={entry.codice}
                  type="button"
                  onClick={() => choose(entry.codice)}
                  disabled={create.isPending}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${isSelected ? "border-primary bg-primary/10" : "border-border/40 hover:bg-accent"}`}
                >
                  <span className="w-16 shrink-0 font-mono text-sm">{entry.codice}</span>
                  <span className="min-w-0 flex-1 text-sm leading-snug">{describe(entry.codice, entry.descrizione)}</span>
                  {preferredCodes.has(entry.codice) && <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />}
                  <span className="mt-0.5 shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold">
                    {existing ? "Dragon" : "Globale"}
                  </span>
                </button>
              );
            })}
            {results.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nessun CER trovato</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
