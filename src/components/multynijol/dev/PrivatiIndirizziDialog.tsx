import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapPin, Save, Wand2, RefreshCw } from "lucide-react";

type Riga = {
  id: string;
  nome: string;
  cf: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  movimenti: number;
  fonte: "vuoto" | "parziale";
  suggerito?: boolean;
};

const normCf = (v: unknown) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normKey = (v: unknown) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  /** chiavi react-query da invalidare dopo il salvataggio (movimenti, export, giacenze...) */
  invalidateKeys?: string[];
}

/**
 * Pop-up di completamento indirizzi privati.
 * Mostra SOLO i privati con movimenti il cui indirizzo è mancante o incompleto (solo comune),
 * precompila dalla rubrica dove possibile e propaga il salvataggio ad anagrafica + rubrica,
 * invalidando le query dei movimenti così che export e stampe vedano subito il dato.
 */
export default function PrivatiIndirizziDialog({ open, onOpenChange, tenantId, invalidateKeys = [] }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [righe, setRighe] = useState<Riga[]>([]);
  const [filtro, setFiltro] = useState("");

  const carica = async () => {
    setLoading(true);
    try {
      const [anagRes, movRes, rubRes] = await Promise.all([
        supabase
          .from("anagrafica_privati")
          .select("id, nome, cognome, denominazione, codice_fiscale, indirizzo, cap, comune_residenza, provincia")
          .eq("tenant_id", tenantId)
          .limit(5000),
        supabase
          .from("privati_conferimenti")
          .select("privato_id, cf_pi, nome_privato")
          .eq("tenant_id", tenantId)
          .limit(10000),
        supabase
          .from("rubrica_contatti")
          .select("anagrafica_id, nome, cognome, ragione_sociale, codice_fiscale, indirizzo, cap, comune, provincia")
          .eq("tenant_id", tenantId)
          .limit(5000),
      ]);
      if (anagRes.error) throw anagRes.error;
      if (movRes.error) throw movRes.error;
      if (rubRes.error) throw rubRes.error;

      // conteggio movimenti per privato (id / cf / nome)
      const conteggio = new Map<string, number>();
      for (const m of movRes.data ?? []) {
        for (const k of [
          m.privato_id ? `ID:${m.privato_id}` : "",
          normCf(m.cf_pi),
          normKey(m.nome_privato),
        ].filter(Boolean)) {
          conteggio.set(k, (conteggio.get(k) || 0) + (k.startsWith("ID:") ? 1 : 0));
        }
        // fallback: se non c'è privato_id conta su CF/nome
        if (!m.privato_id) {
          for (const k of [normCf(m.cf_pi), normKey(m.nome_privato)].filter(Boolean)) {
            conteggio.set(k, (conteggio.get(k) || 0) + 1);
          }
        }
      }

      const rubrica = new Map<string, any>();
      for (const c of rubRes.data ?? []) {
        if (!String(c.indirizzo || "").trim()) continue;
        const nome = [c.nome, c.cognome].filter(Boolean).join(" ").trim() || c.ragione_sociale || "";
        for (const k of [
          c.anagrafica_id ? `ID:${c.anagrafica_id}` : "",
          normCf(c.codice_fiscale),
          normKey(nome),
        ].filter(Boolean)) {
          if (!rubrica.has(k)) rubrica.set(k, c);
        }
      }

      const out: Riga[] = [];
      for (const a of anagRes.data ?? []) {
        const nome = [a.nome, a.cognome].filter(Boolean).join(" ").trim() || a.denominazione || "";
        const cf = normCf(a.codice_fiscale);
        const nMov =
          (conteggio.get(`ID:${a.id}`) || 0) + (cf ? conteggio.get(cf) || 0 : 0) + (conteggio.get(normKey(nome)) || 0);
        if (!nMov) continue;

        let indirizzo = String(a.indirizzo || "").trim();
        let cap = String(a.cap || "").trim();
        let comune = String(a.comune_residenza || "").trim();
        let provincia = String(a.provincia || "").trim();
        if (indirizzo) continue; // già completo

        const hit = rubrica.get(`ID:${a.id}`) || (cf ? rubrica.get(cf) : undefined) || rubrica.get(normKey(nome));
        let suggerito = false;
        if (hit) {
          indirizzo = String(hit.indirizzo || "").trim();
          cap = cap || String(hit.cap || "").trim();
          comune = comune || String(hit.comune || "").trim();
          provincia = provincia || String(hit.provincia || "").trim();
          suggerito = true;
        }

        out.push({
          id: a.id,
          nome: nome || cf || a.id,
          cf: a.codice_fiscale || "",
          indirizzo,
          cap,
          comune,
          provincia,
          movimenti: nMov,
          fonte: comune ? "parziale" : "vuoto",
          suggerito,
        });
      }

      out.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
      setRighe(out);
    } catch (e: any) {
      toast.error("Errore caricamento indirizzi: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && tenantId) carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantId]);

  const visibili = useMemo(() => {
    const s = filtro.trim().toLowerCase();
    if (!s) return righe;
    return righe.filter((r) => `${r.nome} ${r.cf}`.toLowerCase().includes(s));
  }, [righe, filtro]);

  const compilabili = righe.filter((r) => r.indirizzo.trim());

  const setCampo = (id: string, campo: keyof Riga, valore: string) =>
    setRighe((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valore } : r)));

  const salva = async () => {
    if (!compilabili.length) {
      toast.warning("Nessun indirizzo da salvare: compila almeno una riga");
      return;
    }
    setSaving(true);
    try {
      let ok = 0;
      for (const r of compilabili) {
        const payload: Record<string, any> = { indirizzo: r.indirizzo.trim() };
        if (r.cap.trim()) payload.cap = r.cap.trim();
        if (r.comune.trim()) payload.comune_residenza = r.comune.trim();
        if (r.provincia.trim()) payload.provincia = r.provincia.trim().toUpperCase();
        const { error } = await supabase.from("anagrafica_privati").update(payload).eq("id", r.id);
        if (error) throw error;

        // propaga in rubrica (fonte usata da export e stampe)
        await supabase
          .from("rubrica_contatti")
          .update({
            indirizzo: r.indirizzo.trim(),
            ...(r.cap.trim() ? { cap: r.cap.trim() } : {}),
            ...(r.comune.trim() ? { comune: r.comune.trim() } : {}),
            ...(r.provincia.trim() ? { provincia: r.provincia.trim().toUpperCase() } : {}),
          })
          .eq("tenant_id", tenantId)
          .eq("anagrafica_id", r.id);
        ok += 1;
      }

      for (const k of [
        ...invalidateKeys,
        "privati-anagrafica-veicoli",
        "privati-rubrica-export",
        "privati-movimenti",
        "dev-privati",
      ]) {
        queryClient.invalidateQueries({ queryKey: [k] });
      }

      toast.success(`Indirizzi salvati e propagati ai movimenti: ${ok}`);
      await carica();
      if (righe.length - ok <= 0) onOpenChange(false);
    } catch (e: any) {
      toast.error("Errore salvataggio: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-amber-400" />
            Completa indirizzi privati
          </DialogTitle>
          <DialogDescription>
            Privati con movimenti e indirizzo mancante. I valori suggeriti dalla rubrica sono già precompilati:
            controlla, correggi e salva — l'indirizzo viene scritto in anagrafica e propagato a movimenti ed export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Cerca nome o codice fiscale..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-72 h-9"
          />
          <Button variant="outline" size="sm" onClick={carica} disabled={loading} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Ricarica
          </Button>
          <span className="text-xs text-muted-foreground">
            {righe.length} da completare · {compilabili.length} pronti al salvataggio
            {righe.some((r) => r.suggerito) && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-400">
                <Wand2 className="h-3 w-3" /> suggerimenti da rubrica
              </span>
            )}
          </span>
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-md border border-border/40">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr className="text-left">
                <th className="p-2 font-medium">Privato</th>
                <th className="p-2 font-medium">Mov.</th>
                <th className="p-2 font-medium">Indirizzo</th>
                <th className="p-2 font-medium">CAP</th>
                <th className="p-2 font-medium">Comune</th>
                <th className="p-2 font-medium">Prov.</th>
              </tr>
            </thead>
            <tbody>
              {visibili.map((r) => (
                <tr key={r.id} className="border-t border-border/30">
                  <td className="p-2">
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-xs text-muted-foreground">{r.cf || "— CF assente"}</div>
                  </td>
                  <td className="p-2 tabular-nums">{r.movimenti}</td>
                  <td className="p-2">
                    <Input
                      value={r.indirizzo}
                      onChange={(e) => setCampo(r.id, "indirizzo", e.target.value)}
                      placeholder="Via / n. civico"
                      className={`h-8 ${r.suggerito && r.indirizzo ? "border-amber-500/60" : ""}`}
                    />
                  </td>
                  <td className="p-2">
                    <Input value={r.cap} onChange={(e) => setCampo(r.id, "cap", e.target.value)} className="h-8 w-24" />
                  </td>
                  <td className="p-2">
                    <Input value={r.comune} onChange={(e) => setCampo(r.id, "comune", e.target.value)} className="h-8" />
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.provincia}
                      onChange={(e) => setCampo(r.id, "provincia", e.target.value)}
                      className="h-8 w-16"
                      maxLength={2}
                    />
                  </td>
                </tr>
              ))}
              {!visibili.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    {loading ? "Caricamento..." : "Nessun indirizzo mancante: anagrafica completa"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
          <Button onClick={salva} disabled={saving || !compilabili.length} className="gap-1 bg-amber-600 hover:bg-amber-500 text-white">
            <Save className="h-4 w-4" />
            {saving ? "Salvataggio..." : `Salva e trasmetti (${compilabili.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
