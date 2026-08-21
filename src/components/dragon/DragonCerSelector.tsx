import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CER_CATALOG } from "@/data/cerCatalog";
import { CER_DATA } from "@/components/multynijol/dev/DevCERPreferitiModule";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";

interface DragonCerSelectorProps {
  value: string;
  onChange: (itemId: string) => void;
  excludeItemId?: string;
  placeholder?: string;
}

const preferredCodes = new Set(CER_DATA.map((entry) => entry.codice).filter((code) => /^\d{6}$/.test(code)));

export function DragonCerSelector({ value, onChange, excludeItemId, placeholder = "Cerca CER o materiale..." }: DragonCerSelectorProps) {
  const { items, create } = useDragonItems();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = items.find((item) => item.id === value);
  const existingByCode = useMemo(() => new Map(items.map((item) => [item.codice_cer, item])), [items]);
  const normalized = search.trim().toLocaleLowerCase("it");
  const results = useMemo(() => CER_CATALOG
    .filter((entry) => {
      const item = existingByCode.get(entry.codice);
      if (item?.id === excludeItemId) return false;
      return !normalized || entry.codice.includes(normalized.replace(/\s/g, "")) || entry.descrizione.toLocaleLowerCase("it").includes(normalized);
    })
    .sort((a, b) => Number(preferredCodes.has(b.codice)) - Number(preferredCodes.has(a.codice)) || a.codice.localeCompare(b.codice))
    .slice(0, 120), [excludeItemId, existingByCode, normalized]);

  const choose = async (code: string) => {
    const existing = existingByCode.get(code);
    if (existing) {
      onChange(existing.id);
      setOpen(false);
      setSearch("");
      return;
    }
    const catalogEntry = CER_CATALOG.find((entry) => entry.codice === code);
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
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {results.map((entry) => {
              const existing = existingByCode.get(entry.codice);
              return (
                <Button key={entry.codice} type="button" variant="ghost" className="h-auto w-full justify-start px-2 py-2 text-left" onClick={() => choose(entry.codice)} disabled={create.isPending}>
                  <span className="w-16 shrink-0 font-mono text-xs">{entry.codice}</span>
                  <span className="min-w-0 flex-1 whitespace-normal text-xs">{entry.descrizione}</span>
                  {preferredCodes.has(entry.codice) && <Star className="h-3 w-3 shrink-0 text-amber-400" />}
                  {existing ? <Badge variant="outline" className="shrink-0 text-[10px]">Dragon</Badge> : <Badge variant="outline" className="shrink-0 text-[10px]">Globale</Badge>}
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