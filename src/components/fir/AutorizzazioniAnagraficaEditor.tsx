import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcolaScadenza } from "@/lib/autorizzazioneScadenza";

export interface AutorizzazioniEditorHandle { salva: () => Promise<boolean> }

interface Riga {
  id?: string;
  tipo: string;
  numero_autorizzazione: string;
  ente_rilascio: string;
  data_inizio: string;
  durata_anni: string;
  data_scadenza: string;
  operazioni: string;
  note: string;
  _rimuovi?: boolean;
}

const vuota = (): Riga => ({ tipo: "", numero_autorizzazione: "", ente_rilascio: "", data_inizio: "", durata_anni: "", data_scadenza: "", operazioni: "", note: "" });

/** Autorizzazioni del soggetto, modificabili dal formulario: tipologia, emissione, durata, scadenza, operazioni di destinazione. */
export const AutorizzazioniAnagraficaEditor = forwardRef<AutorizzazioniEditorHandle, { clienteId: string; tenantId: string | null }>(
  ({ clienteId, tenantId }, ref) => {
    const [righe, setRighe] = useState<Riga[]>([]);

    useEffect(() => {
      void (async () => {
        const { data } = await supabase.from("cliente_autorizzazioni" as any).select("*").eq("cliente_id", clienteId).order("data_scadenza", { ascending: false });
        setRighe(((data as any[]) ?? []).map((r) => ({
          id: r.id, tipo: r.tipo ?? "", numero_autorizzazione: r.numero_autorizzazione ?? "", ente_rilascio: r.ente_rilascio ?? "",
          data_inizio: r.data_inizio ?? "", durata_anni: r.durata_anni == null ? "" : String(r.durata_anni),
          data_scadenza: r.data_scadenza ?? "", operazioni: r.operazioni ?? "", note: r.note ?? "",
        })));
      })();
    }, [clienteId]);

    const set = (i: number, k: keyof Riga, v: string) => setRighe((p) => p.map((r, j) => {
      if (j !== i) return r;
      const n = { ...r, [k]: v };
      if (k === "data_inizio" || k === "durata_anni") {
        const sc = calcolaScadenza(n.data_inizio, n.durata_anni);
        if (sc) n.data_scadenza = sc;
      }
      return n;
    }));

    useImperativeHandle(ref, () => ({
      salva: async () => {
        for (const r of righe) {
          if (r._rimuovi) {
            if (r.id) {
              const { error } = await supabase.from("cliente_autorizzazioni" as any).delete().eq("id", r.id);
              if (error) { toast.error("Autorizzazione non rimossa: " + error.message); return false; }
            }
            continue;
          }
          if (!r.numero_autorizzazione.trim() && !r.tipo.trim()) continue;
          const payload = {
            cliente_id: clienteId, tenant_id: tenantId,
            tipo: r.tipo.trim() || null, numero_autorizzazione: r.numero_autorizzazione.trim() || null,
            ente_rilascio: r.ente_rilascio.trim() || null, data_inizio: r.data_inizio || null,
            durata_anni: r.durata_anni ? Number(r.durata_anni.replace(",", ".")) : null,
            data_scadenza: r.data_scadenza || null, operazioni: r.operazioni.trim() || null, note: r.note.trim() || null,
          };
          const q = r.id
            ? supabase.from("cliente_autorizzazioni" as any).update(payload as any).eq("id", r.id)
            : supabase.from("cliente_autorizzazioni" as any).insert(payload as any);
          const { error } = await q;
          if (error) { toast.error("Autorizzazione non salvata: " + error.message); return false; }
        }
        return true;
      },
    }), [righe, clienteId, tenantId]);

    const oggi = new Date().toISOString().slice(0, 10);

    return (
      <div className="mt-4 space-y-3 border-t pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Autorizzazioni</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setRighe((p) => [...p, vuota()])}>
            <Plus className="h-3 w-3" /> Aggiungi autorizzazione
          </Button>
        </div>
        {righe.filter((r) => !r._rimuovi).length === 0 && <p className="text-xs text-muted-foreground">Nessuna autorizzazione registrata.</p>}
        {righe.map((r, i) => r._rimuovi ? null : (
          <div key={r.id ?? `n${i}`} className="grid grid-cols-6 gap-2 rounded-md border p-2">
            <div className="col-span-2"><Label className="text-xs">Tipologia (es. Art. 208, AUA, Albo cat. 4)</Label><Input value={r.tipo} onChange={(e) => set(i, "tipo", e.target.value)} /></div>
            <div className="col-span-2"><Label className="text-xs">Numero autorizzazione</Label><Input value={r.numero_autorizzazione} onChange={(e) => set(i, "numero_autorizzazione", e.target.value)} /></div>
            <div className="col-span-2"><Label className="text-xs">Ente di rilascio</Label><Input value={r.ente_rilascio} onChange={(e) => set(i, "ente_rilascio", e.target.value)} /></div>
            <div className="col-span-2"><Label className="text-xs">Data di emissione</Label><Input type="date" value={r.data_inizio} onChange={(e) => set(i, "data_inizio", e.target.value)} /></div>
            <div><Label className="text-xs">Durata (anni)</Label><Input inputMode="decimal" value={r.durata_anni} onChange={(e) => set(i, "durata_anni", e.target.value)} /></div>
            <div className="col-span-2">
              <Label className="text-xs">Data di scadenza {r.data_scadenza && r.data_scadenza < oggi && <span className="text-destructive font-semibold">— SCADUTA</span>}</Label>
              <Input type="date" value={r.data_scadenza} onChange={(e) => set(i, "data_scadenza", e.target.value)} />
            </div>
            <div className="flex items-end justify-end">
              <Button type="button" size="icon" variant="ghost" aria-label="Rimuovi autorizzazione" onClick={() => setRighe((p) => p.map((x, j) => j === i ? { ...x, _rimuovi: true } : x))}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="col-span-3"><Label className="text-xs">Operazioni / destinazione (es. R13, R4, D15)</Label><Input value={r.operazioni} onChange={(e) => set(i, "operazioni", e.target.value)} /></div>
            <div className="col-span-3"><Label className="text-xs">Note</Label><Input value={r.note} onChange={(e) => set(i, "note", e.target.value)} /></div>
          </div>
        ))}
      </div>
    );
  },
);
AutorizzazioniAnagraficaEditor.displayName = "AutorizzazioniAnagraficaEditor";
