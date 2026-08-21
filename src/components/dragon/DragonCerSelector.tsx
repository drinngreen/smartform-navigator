import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const existingByCode = useMemo(() => new Map(items.map((item) => [item.codice_cer, item])), [items]);
  const preferredCodes = useMemo(() => new Set(preferiti.map((entry) => entry.codice)), [preferiti]);
  const normalized = search.trim().toLocaleLowerCase("it");
  const results = useMemo(() => (showAll ? tutti : preferiti)
    .filter((entry) => {
      const item = existingByCode.get(entry.codice);
      if (item?.id === excludeItemId) return false;
      return !normalized || entry.codice.includes(normalized.replace(/\s/g, "")) || entry.descrizione.toLocaleLowerCase("it").includes(normalized);
    }), [excludeItemId, existingByCode, normalized, preferiti, showAll, tutti]);

  const choose = async (code: string) => {
    const existing = existingByCode.get(code);
    if (existing) {
      onChange(existing.id);
      setOpen(false);
      setSearch("");
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
    setSearch("");
  };

  return (
    <div className="relative">
      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal" onClick={() => setOpen((current) => !current)}>
        {selected ? <><span className="font-mono">{selected.codice_cer}</span><span className="truncate">— {selected.descrizione}</span></> : placeholder}
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[22rem] rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" placeholder="Codice CER o descrizione" />
          </div>
          <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-border px-1 pb-2 text-xs">
            <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} className="accent-emerald-500" />
            <span className="text-muted-foreground">Mostra tutti i CER del catalogo europeo</span>
          </label>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {results.map((entry) => {
              const existing = existingByCode.get(entry.codice);
              return (
                <Button key={entry.codice} type="button" variant="ghost" className="h-auto w-full justify-start px-2 py-2 text-left" onClick={() => choose(entry.codice)} disabled={create.isPending}>
                  <span className="w-16 shrink-0 font-mono text-xs">{entry.codice}</span>
                  <span className="min-w-0 flex-1 whitespace-normal text-xs">{entry.descrizione}</span>
                  {preferredCodes.has(entry.codice) && <Star className="h-3 w-3 shrink-0 text-amber-400" />}
                  <span className="shrink-0 rounded-full border border-border bg-transparent px-2 py-1 text-[10px] font-semibold text-foreground">
                    {existing ? "Dragon" : "Globale"}
                  </span>
                </Button>
              );
            })}
            {results.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nessun CER trovato</p>}
          </div>
        </div>
      )}
    </div>
  );
}