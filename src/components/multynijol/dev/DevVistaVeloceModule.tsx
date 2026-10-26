import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, CheckCircle, Pencil, Plus, RefreshCw, Loader2, Search, Zap, Printer } from "lucide-react";
import { keepOpenOnDarkLemon } from "@/lib/dialogGuards";
import { resolveWorkflowStatus } from "@/lib/firWorkflowStatus";
import { FirDettaglioLettura } from "@/components/fir/FirDettaglioLettura";
import { ConfermaFormularioRegistro } from "@/components/rentri/ConfermaFormularioRegistro";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { NuovoFirCartaceoBox } from "@/components/fir/NuovoFirCartaceoBox";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const MULTY_CF = "12347770013";
const NIYOL_CF = "09879800010";

export type TipoFormulario = "multy-impianto" | "conto-proprio" | "multy-trasporto-niyol" | "niyol";

const TIPI: Record<TipoFormulario, { label: string; cls: string }> = {
  "multy-impianto": { label: "Multy Impianto", cls: "border-emerald-500/40 text-emerald-300" },
  "conto-proprio": { label: "Conto proprio Multy", cls: "border-lime-500/40 text-lime-300" },
  "multy-trasporto-niyol": { label: "Multy · trasporto Niyol", cls: "border-sky-500/40 text-sky-300" },
  niyol: { label: "Niyol", cls: "border-cyan-500/40 text-cyan-300" },
};

const cf = (v: unknown) => String(v ?? "").replace(/\s+/g, "").toUpperCase();
const first = (...v: unknown[]) => v.find((x) => x !== null && x !== undefined && String(x).trim() !== "");

/** Classifica un formulario in base al tenant e al codice fiscale del trasportatore. */
export function classificaFormulario(form: any): TipoFormulario {
  if (form.tenant_id === NIYOL_TENANT_ID) return "niyol";
  const tr = cf(first(form.trasportatore_codice_fiscale, form.form_data?.trasportatore_codice_fiscale));
  if (tr === MULTY_CF) return "conto-proprio";
  if (tr === NIYOL_CF) return "multy-trasporto-niyol";
  return "multy-impianto";
}

const tenantDi = (t: TipoFormulario) => (t === "niyol" ? NIYOL_TENANT_ID : MULTY_TENANT_ID);
const contestoDi = (t: TipoFormulario) => (t === "niyol" ? "niyol" : "multyproget");

const fmtData = (v: unknown) => {
  const m = String(v ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};

const ETICHETTE: Record<string, string> = { bozza: "Bozza", verifica: "Verifica RENTRI", inviato: "Inviato al RENTRI", chiuso: "Chiuso" };

export function DevVistaVeloceModule() {
  const [filtro, setFiltro] = useState<"tutti" | TipoFormulario>("tutti");
  const [search, setSearch] = useState("");
  const [aperto, setAperto] = useState<{ form: any; modo: "vedi" | "conferma" | "modifica" } | null>(null);
  const [nuovo, setNuovo] = useState<{ tipo: TipoFormulario; formato: "digitale" | "cartaceo" } | null>(null);
  const [tipoNuovo, setTipoNuovo] = useState<TipoFormulario>("multy-impianto");
  const [formatoNuovo, setFormatoNuovo] = useState<"digitale" | "cartaceo">("digitale");

  const { data: forms = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["vista-veloce-formulari"],
    queryFn: async () => {
      const load = async (tid: string) => {
        const { data, error } = await supabase.functions.invoke("admin-user-manage", { body: { action: "list_fir_forms", tenant_id: tid } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return (data.forms || []).map((f: any) => ({ ...f, tenant_id: f.tenant_id || tid }));
      };
      const [m, n] = await Promise.all([load(MULTY_TENANT_ID), load(NIYOL_TENANT_ID)]);
      const seen = new Set<string>();
      return [...m, ...n].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
    },
  });

  const righe = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms
      .map((f: any) => {
        const fd = f.form_data || {};
        return {
          form: f,
          tipo: classificaFormulario(f),
          stato: resolveWorkflowStatus(f.status, fd) as string,
          cartaceo: fd.formato_fir === "cartaceo",
          cer: String(first(f.codice_eer, fd.cer, fd.codice_eer) ?? "—"),
          produttore: String(first(f.produttore_denominazione, fd.produttore_denominazione) ?? "—"),
          destinatario: String(first(f.destinatario_denominazione, fd.destinatario_denominazione) ?? "—"),
          kgDestino: first(fd.quantita_destino, fd.peso_ricevuto, fd.quantita_accettata),
          data: first(fd.data_emissione, f.data_partenza, fd.data_partenza, f.created_at),
        };
      })
      .filter((r) => filtro === "tutti" || r.tipo === filtro)
      .filter((r) => !q || [r.form.numero_fir, r.cer, r.produttore, r.destinatario, TIPI[r.tipo].label].join(" ").toLowerCase().includes(q))
      .sort((a, b) => String(b.data ?? "").localeCompare(String(a.data ?? "")));
  }, [forms, filtro, search]);

  const conteggi = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of forms) { const t = classificaFormulario(f); c[t] = (c[t] || 0) + 1; }
    return c;
  }, [forms]);

  const af = aperto?.form;
  const tipoAperto = af ? classificaFormulario(af) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-card/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary"><Zap className="h-4 w-4" /><span className="font-semibold">Vista veloce formulari</span></div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Nuovo formulario per</span>
            <Select value={tipoNuovo} onValueChange={(v) => setTipoNuovo(v as TipoFormulario)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPI) as TipoFormulario[]).map((t) => <SelectItem key={t} value={t}>{TIPI[t].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Formato</span>
            <Select value={formatoNuovo} onValueChange={(v) => setFormatoNuovo(v as any)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="digitale">Digitale (RENTRI)</SelectItem>
                <SelectItem value="cartaceo">Cartaceo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2" onClick={() => setNuovo({ tipo: tipoNuovo, formato: formatoNuovo })}><Plus className="h-4 w-4" /> Crea formulario</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filtro === "tutti" ? "default" : "outline"} onClick={() => setFiltro("tutti")}>Tutti ({forms.length})</Button>
        {(Object.keys(TIPI) as TipoFormulario[]).map((t) => (
          <Button key={t} size="sm" variant={filtro === t ? "default" : "outline"} onClick={() => setFiltro(t)}>{TIPI[t].label} ({conteggi[t] || 0})</Button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 w-64" placeholder="Cerca FIR, CER, soggetto..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button size="icon" variant="outline" onClick={() => refetch()} aria-label="Aggiorna">{isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/30">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>{["Tipo", "N. FIR", "Stato", "Data", "CER", "Produttore", "Destinatario", "Kg a destino", ""].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {!isLoading && righe.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nessun formulario</td></tr>}
            {righe.map((r) => (
              <tr key={r.form.id} className="cursor-pointer border-t border-border/10 hover:bg-muted/20" onClick={() => setAperto({ form: r.form, modo: "vedi" })}>
                <td className="p-2"><Badge variant="outline" className={TIPI[r.tipo].cls}>{TIPI[r.tipo].label}</Badge>{r.cartaceo && <Badge variant="outline" className="ml-1">Cartaceo</Badge>}</td>
                <td className="p-2 font-mono">{r.form.numero_fir || "—"}</td>
                <td className="p-2"><Badge variant={r.stato === "chiuso" ? "default" : "secondary"}>{ETICHETTE[r.stato] ?? r.stato}</Badge></td>
                <td className="p-2 text-xs">{fmtData(r.data)}</td>
                <td className="p-2 font-mono">{r.cer}</td>
                <td className="p-2">{r.produttore}</td>
                <td className="p-2">{r.destinatario}</td>
                <td className="p-2 font-mono">{r.kgDestino != null ? `${r.kgDestino} kg` : "—"}</td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Vedi" onClick={() => setAperto({ form: r.form, modo: "vedi" })}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Conferma nel registro" onClick={() => setAperto({ form: r.form, modo: "conferma" })}><CheckCircle className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Modifica" onClick={() => setAperto({ form: r.form, modo: "modifica" })}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!aperto} onOpenChange={(o) => { if (!o) { setAperto(null); refetch(); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={keepOpenOnDarkLemon} onInteractOutside={keepOpenOnDarkLemon} onFocusOutside={keepOpenOnDarkLemon}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              FIR {af?.numero_fir || "N/D"} {tipoAperto && <Badge variant="outline" className={TIPI[tipoAperto].cls}>{TIPI[tipoAperto].label}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {af && tipoAperto && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" variant={aperto!.modo === "vedi" ? "default" : "outline"} onClick={() => setAperto({ form: af, modo: "vedi" })}><Eye className="h-4 w-4 mr-1" />Dettaglio</Button>
                <Button size="sm" variant={aperto!.modo === "conferma" ? "default" : "outline"} onClick={() => setAperto({ form: af, modo: "conferma" })}><CheckCircle className="h-4 w-4 mr-1" />Conferma registro</Button>
                <Button size="sm" variant={aperto!.modo === "modifica" ? "default" : "outline"} onClick={() => setAperto({ form: af, modo: "modifica" })}><Pencil className="h-4 w-4 mr-1" />Modifica</Button>
              </div>
              {aperto!.modo === "vedi" && <FirDettaglioLettura numeroFir={af.numero_fir} cliente={af.tenant_id === NIYOL_TENANT_ID ? "niyol" : "multy"} form={af} />}
              {aperto!.modo === "conferma" && (
                <ConfermaFormularioRegistro numeroFir={af.numero_fir} tenantId={tenantDi(tipoAperto)} cartaceo={af.form_data?.formato_fir === "cartaceo"} />
              )}
              {aperto!.modo === "modifica" && (
                <MNFIRFormComplete key={af.id} tenantId={tenantDi(tipoAperto)} mnContext={contestoDi(tipoAperto) as any} firFormId={af.id} draftData={af} enableFatturazione />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!nuovo} onOpenChange={(o) => { if (!o) { setNuovo(null); refetch(); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={keepOpenOnDarkLemon} onInteractOutside={keepOpenOnDarkLemon} onFocusOutside={keepOpenOnDarkLemon}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {nuovo?.formato === "cartaceo" ? <Printer className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Nuovo formulario {nuovo?.formato} — {nuovo && TIPI[nuovo.tipo].label}
            </DialogTitle>
          </DialogHeader>
          {nuovo && (nuovo.formato === "cartaceo"
            ? <NuovoFirCartaceoBox tenantId={tenantDi(nuovo.tipo)} mnContext={contestoDi(nuovo.tipo) as "multyproget" | "niyol"} />
            : <MNFIRFormComplete key={`${nuovo.tipo}-new`} tenantId={tenantDi(nuovo.tipo)} mnContext={contestoDi(nuovo.tipo) as any} enableFatturazione creationMode />)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
