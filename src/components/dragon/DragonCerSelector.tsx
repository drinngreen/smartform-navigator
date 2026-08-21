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
  const existingByCode = useMemo(() => new Map(items.map((item) => [item.codice_cer, item])), [items]);
  const preferredCodes = useMemo(() => new Set(preferiti.map((entry) => entry.codice)), [preferiti]);
  const normalized = search.trim().toLocaleLowerCase("it");
  const digits = normalized.replace(/\D/g, "");

  const results = useMemo(() => {
    const base = showAll || normalized.length > 0 ? tutti : preferiti;
    return base.filter((entry) => {
      const item = existingByCode.get(entry.codice);
      if (item && item.id === excludeItemId) return false;
      if (!normalized) return true;
      const code = entry.codice.toLocaleLowerCase("it");
      const matchCode = digits.length > 0 && code.replace(/\D/g, "").includes(digits);
      const matchText = entry.descrizione.toLocaleLowerCase("it").includes(normalized);
      return matchCode || matchText;
    }).slice(0, 300);
  }, [digits, excludeItemId, existingByCode, normalized, preferiti, showAll, tutti]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const choose = async (code: string) => {
    const existing = existingByCode.get(code);
    if (existing) {
      onChange(existing.id);
      setOpen(false);
      return;
    }
    const catalogEntry = tutti.find((entry) => entry.codice === code);
    if (!catalogEntry) return;
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
