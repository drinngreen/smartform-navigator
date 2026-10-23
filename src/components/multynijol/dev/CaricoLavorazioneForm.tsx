import { useState } from "react";
import { FilePlus2, Save, Undo2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CER_CATALOG } from "@/data/cerCatalog";
import type { CaricoLavorazioneMetadata } from "@/lib/caricoLavorazioneMetadata";

interface Props {
  data: string; cer: string; kg: string; note: string;
  metadata: CaricoLavorazioneMetadata;
  busy: boolean; loading: boolean; preview: React.ReactNode;
  onData: (value: string) => void; onCer: (value: string) => void;
  onKg: (value: string) => void; onNote: (value: string) => void;
  onMetadata: (value: CaricoLavorazioneMetadata) => void;
  onConfirm: () => void; onReset: () => void;
}

function Choice({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="space-y-1"><Label htmlFor={id}>{label}</Label><div id={id} aria-label={label}>
    <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select></div></div>;
}

export function CaricoLavorazioneForm(p: Props) {
  const [cerSearch, setCerSearch] = useState(false);
  const [search, setSearch] = useState("");
  const m = p.metadata;
  const change = <K extends keyof CaricoLavorazioneMetadata>(key: K, value: CaricoLavorazioneMetadata[K]) => p.onMetadata({ ...m, [key]: value });
  const chooseCer = (value: string) => {
    p.onCer(value);
    const entry = CER_CATALOG.find(c => c.codice === value.replace(/\D/g, ""));
    if (entry) change("descrizione", entry.descrizione);
  };
  const results = CER_CATALOG.filter(c => `${c.codice} ${c.descrizione}`.toLowerCase().includes(search.toLowerCase())).slice(0, 40);
  return <section aria-label="Carico di lavorazione" className="border border-border bg-background text-foreground">
    <header className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3">
      <h2 className="text-base font-semibold">Gestione registrazioni carico — Carico di lavorazione</h2>
      <div className="flex shrink-0 gap-1">
        <Button type="button" size="icon" variant="ghost" title="Nuova registrazione" aria-label="Nuova registrazione" disabled={p.busy} onClick={p.onReset}><FilePlus2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" title="Conferma carico di lavorazione" aria-label="Conferma carico di lavorazione" disabled={p.busy || p.loading} onClick={p.onConfirm}><Save className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" title="Ripristina campi" aria-label="Ripristina campi" disabled={p.busy} onClick={p.onReset}><Undo2 className="h-4 w-4" /></Button>
      </div>
    </header>
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><Label>Registro:</Label><span className="border border-border bg-input px-3 py-2">Multy Impianto</span><span className="text-muted-foreground">Reg. Produttore-Destinatario</span></div>
    <Tabs defaultValue="registrazione" className="px-4 pb-4">
      <TabsList className="mb-3"><TabsTrigger value="registrazione">Registrazione</TabsTrigger><TabsTrigger value="secondari">Dati secondari</TabsTrigger></TabsList>
      <TabsContent value="registrazione" forceMount className="data-[state=inactive]:hidden">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_minmax(230px,1.15fr)_minmax(135px,.65fr)_minmax(260px,1.65fr)]">
          <fieldset className="min-w-0 space-y-3 border border-border p-3"><legend className="px-1 text-sm font-medium">Scarico/Carico</legend>
            <RadioGroup value="carico" className="flex gap-4" disabled><div className="flex items-center gap-2"><RadioGroupItem id="lavorazione-scarico" value="scarico" /><Label htmlFor="lavorazione-scarico">Scarico</Label></div><div className="flex items-center gap-2"><RadioGroupItem id="lavorazione-carico" value="carico" /><Label htmlFor="lavorazione-carico">Carico</Label></div></RadioGroup>
            <div className="space-y-1"><Label htmlFor="lavorazione-causale">Causale</Label><Input id="lavorazione-causale" value="Carico da Lavorazione" readOnly /></div>
            <div className="space-y-1"><Label htmlFor="lavorazione-cer">CER</Label><div className="flex gap-1"><Input id="lavorazione-cer" value={p.cer} onChange={e => chooseCer(e.target.value)} /><Button type="button" size="icon" variant="outline" className="shrink-0" title="Cerca CER" aria-label="Cerca CER" onClick={() => setCerSearch(!cerSearch)}><Search className="h-4 w-4" /></Button></div></div>
            {cerSearch && <div className="space-y-2"><Input aria-label="Ricerca codice o descrizione CER" value={search} onChange={e => setSearch(e.target.value)} placeholder="Codice o descrizione" /><div className="max-h-44 overflow-y-auto border border-border">{results.map(c => <Button type="button" key={c.codice} variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left text-xs" onClick={() => { chooseCer(c.codice); setCerSearch(false); }}>{c.codice}{c.pericoloso ? "*" : ""} — {c.descrizione}</Button>)}</div></div>}
            <div className="space-y-1"><Label htmlFor="lavorazione-data">Del</Label><Input id="lavorazione-data" type="date" min="2026-09-22" max={new Date().toISOString().slice(0, 10)} value={p.data} onChange={e => p.onData(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="lavorazione-numero-movimento">N.</Label><Input id="lavorazione-numero-movimento" value="" readOnly /></div><div className="space-y-1"><Label htmlFor="lavorazione-interno">Int.</Label><Input id="lavorazione-interno" value="" placeholder="Al salvataggio" readOnly /></div></div>
          </fieldset>
          <fieldset className="min-w-0 space-y-3 border border-border p-3"><legend className="px-1 text-sm font-medium">Caratteristiche del rifiuto</legend>
            <div className="space-y-1"><Label htmlFor="lavorazione-descrizione">b) Descrizione</Label><Textarea id="lavorazione-descrizione" rows={3} value={m.descrizione} onChange={e => change("descrizione", e.target.value)} /></div>
            <Choice id="lavorazione-stato" label="c) Stato fisico" value={m.statoFisico} onChange={v => change("statoFisico", v)} options={[{ value: "", label: "Seleziona" }, { value: "1", label: "1 — Solido pulverulento" }, { value: "2", label: "2 — Solido non pulverulento" }, { value: "3", label: "3 — Fangoso palabile" }, { value: "4", label: "4 — Liquido" }]} />
            <div className="space-y-2"><Label>d) Classi di pericolosità</Label><div className="grid grid-cols-3 gap-x-2 gap-y-2">{Array.from({ length: 15 }, (_, i) => `HP${String(i + 1).padStart(2, "0")}`).map(hp => <div key={hp} className="flex items-center gap-1.5"><Checkbox id={`lavorazione-${hp}`} checked={m.classiPericolo.includes(hp)} onCheckedChange={checked => change("classiPericolo", checked === true ? [...m.classiPericolo, hp] : m.classiPericolo.filter(h => h !== hp))} /><Label htmlFor={`lavorazione-${hp}`} className="text-xs">{hp}</Label></div>)}</div></div>
            <Choice id="lavorazione-destinazione" label="e) Rifiuto destinato a" value={m.destinazione} onChange={v => change("destinazione", v)} options={[{ value: "Deposito Temp.", label: "Deposito Temp." }, ...Array.from({ length: 13 }, (_, i) => ({ value: `R${i + 1}`, label: `R${i + 1}` })), ...Array.from({ length: 15 }, (_, i) => ({ value: `D${i + 1}`, label: `D${i + 1}` }))]} />
            <div className="space-y-2"><Label>Provenienza rifiuto RENTRI</Label><RadioGroup value={m.urbano ? "urbano" : "speciale"} onValueChange={v => change("urbano", v === "urbano")} className="flex flex-wrap gap-3"><div className="flex items-center gap-2"><RadioGroupItem id="lavorazione-urbano" value="urbano" /><Label htmlFor="lavorazione-urbano">Urbano</Label></div><div className="flex items-center gap-2"><RadioGroupItem id="lavorazione-speciale" value="speciale" /><Label htmlFor="lavorazione-speciale">Speciale</Label></div></RadioGroup></div>
            <Choice id="lavorazione-origine" label="Origine del rifiuto (MUD)" value={m.origine} onChange={v => change("origine", v)} options={[{ value: "Rifiuto", label: "Rifiuto" }, { value: "Materiale", label: "Materiale" }]} />
          </fieldset>
          <fieldset className="min-w-0 space-y-5 border border-border p-3"><legend className="px-1 text-sm font-medium">Quantità</legend>
            {[{ id: "kg", label: "Kg", value: p.kg, onChange: p.onKg }, { id: "litri", label: "Litri", value: m.litri, onChange: (v: string) => change("litri", v) }, { id: "metri-cubi", label: "Metri cubi", value: m.metriCubi, onChange: (v: string) => change("metriCubi", v) }, { id: "numero", label: "Numero", value: m.numero, onChange: (v: string) => change("numero", v) }].map(f => <div key={f.id} className="space-y-1"><Label htmlFor={`lavorazione-${f.id}`}>{f.label}:</Label><Input id={`lavorazione-${f.id}`} inputMode="decimal" value={f.value} placeholder="0,00" className="text-right tabular-nums" onChange={e => f.onChange(e.target.value)} /></div>)}
          </fieldset>
          <fieldset className="flex min-w-0 flex-col gap-3 border border-border p-3"><legend className="px-1 text-sm font-medium">Annotazioni</legend>
            <div className="flex flex-1 flex-col gap-1"><Label htmlFor="lavorazione-nota">Nota:</Label><Textarea id="lavorazione-nota" className="min-h-44 flex-1" value={p.note} onChange={e => p.onNote(e.target.value)} /></div>
            <div className="flex flex-1 flex-col gap-1 border-t border-border pt-3"><Label htmlFor="lavorazione-nota-interna">Nota interna (non in stampa):</Label><Textarea id="lavorazione-nota-interna" className="min-h-32 flex-1" value={m.notaInterna} onChange={e => change("notaInterna", e.target.value)} /></div>
          </fieldset>
        </div>
      </TabsContent>
      <TabsContent value="secondari"><dl className="grid gap-4 border border-border p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Registro</dt><dd>Multy Impianto — Produttore-Destinatario</dd></div><div><dt className="text-muted-foreground">Tipo operazione</dt><dd>Carico da Lavorazione</dd></div><div><dt className="text-muted-foreground">Formulario</dt><dd>Senza formulario</dd></div><div><dt className="text-muted-foreground">Data</dt><dd>{p.data.split("-").reverse().join("/")}</dd></div></dl></TabsContent>
      <footer className="mt-4 space-y-3 border-t border-border pt-4">{p.preview}<div className="flex justify-end"><Button type="button" disabled={p.busy || p.loading} onClick={p.onConfirm} className="gap-2">{p.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Conferma carico di lavorazione</Button></div></footer>
    </Tabs>
  </section>;
}