import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RefreshCw, FileSpreadsheet, FileText, ListOrdered, User, MapPin } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import { getCerDescrizioneCompleta } from "@/data/cerDescrizioni";

type Props = { tenantId: string };

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

const INVALIDATE_KEYS = [
  "privati-movimenti-widget",
  "dev-conferimenti-privato",
  "dev-conferimenti-anno",
  "privati-limiti-widget",
  "privati-targhe-widget",
  "dev-ricevute",
  "dev-ricevute-registro",
  "dev-registro-movimenti",
  "dev-movimenti-multy",
  "dev-mag-movimenti",
  "dev-mag-giacenze",
  "dev-giacenze",
];

/**
 * Elenco unico di TUTTI i movimenti (conferimenti) dei privati.
 * Permette di selezionare un privato dalla tendina ed eliminare i suoi singoli movimenti
 * (anche in blocco): la cancellazione propaga in cascata su movimenti_impianto / ricevute /
 * pagamenti, le giacenze vengono ricalcolate e i progressivi DBT rinumerati.
 */
export function PrivatiMovimentiWidget({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [anno, setAnno] = useState<string>(String(new Date().getFullYear()));
  const [privato, setPrivato] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [completingAddr, setCompletingAddr] = useState(false);

  const { data: movimenti, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["privati-movimenti-widget", tenantId, anno],
    queryFn: async () => {
      let q = supabase
        .from("privati_conferimenti")
        .select("id, data, nome_privato, cf_pi, cer, kg_pesati, importo_pagato, metodo_pag, targa_automezzo, modello_automezzo, numero_progressivo, anno_dbt, impianto_id, privato_id, note, tipo_utenza, stato_rifiuto, numero_fir, codice_ce, prezzo_kg, created_at")
        .eq("tenant_id", tenantId)
        .order("data", { ascending: false })
        .limit(5000);
      if (anno !== "all") {
        q = q.gte("data", `${anno}-01-01`).lte("data", `${anno}-12-31`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  /** Anagrafica privati: usata come fallback per mezzo/targa mancanti sul movimento. */
  const { data: anagrafiche } = useQuery({
    queryKey: ["privati-anagrafica-veicoli", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anagrafica_privati")
        .select("id, nome, cognome, denominazione, codice_fiscale, automezzo, modello_automezzo, targa_automezzo, veicoli, indirizzo, cap, comune_residenza, provincia")
        .eq("tenant_id", tenantId)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  /** Rubrica sincronizzata: seconda fonte per recuperare indirizzi presenti ma non replicati nell'anagrafica privati. */
  const { data: contatti } = useQuery({
    queryKey: ["privati-rubrica-export", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rubrica_contatti")
        .select("anagrafica_id, nome, cognome, ragione_sociale, codice_fiscale, indirizzo, cap, comune, provincia")
        .eq("tenant_id", tenantId)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  /** Chiave normalizzata: maiuscolo, senza punteggiatura, token ordinati (nome/cognome invertiti). */
  const normKey = (v: string) =>
    String(v || "")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ");

  const normCf = (v: string) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const formatLuogo = (indirizzo: unknown, cap: unknown, comune: unknown, provincia: unknown) => {
    const localita = [String(cap || "").trim(), String(comune || "").trim()].filter(Boolean).join(" ");
    const localitaConProvincia = localita
      ? `${localita}${provincia ? ` (${String(provincia).trim()})` : ""}`
      : "";
    return [String(indirizzo || "").trim(), localitaConProvincia].filter(Boolean).join(", ") || null;
  };

  const anagraficaMap = useMemo(() => {
    const map = new Map<string, { targa: string | null; modello: string | null; luogo: string | null }>();
    for (const a of anagrafiche ?? []) {
      const veicoli = Array.isArray(a.veicoli) ? a.veicoli : [];
      const first = veicoli.find((v: any) => v?.targa) || {};
      const targa = a.targa_automezzo || first.targa || null;
      const modello = a.modello_automezzo || a.automezzo || first.modello || null;
      const luogo = formatLuogo(a.indirizzo, a.cap, a.comune_residenza, a.provincia);
      if (!targa && !modello && !luogo) continue;
      const nome = [a.nome, a.cognome].filter(Boolean).join(" ").trim() || a.denominazione || "";
      const cf = normCf(a.codice_fiscale);
      const keys = [
        a.id ? `ID:${a.id}` : "",
        cf,
        // tolleranza su singolo carattere errato nel CF (errori di battitura anagrafica)
        cf ? `CF7:${cf.slice(0, 4)}${cf.slice(5)}` : "",
        normKey(nome),
        normKey(a.denominazione || ""),
      ].filter(Boolean);
      for (const k of keys) {
        const current = map.get(k);
        map.set(k, {
          targa: current?.targa || targa,
          modello: current?.modello || modello,
          luogo: current?.luogo || luogo,
        });
      }
    }
    for (const c of contatti ?? []) {
      const luogo = formatLuogo(c.indirizzo, c.cap, c.comune, c.provincia);
      if (!luogo) continue;
      const nome = [c.nome, c.cognome].filter(Boolean).join(" ").trim() || c.ragione_sociale || "";
      const keys = [
        c.anagrafica_id ? `ID:${c.anagrafica_id}` : "",
        normCf(c.codice_fiscale),
        normKey(nome),
        normKey(c.ragione_sociale || ""),
      ].filter(Boolean);
      for (const k of keys) {
        const current = map.get(k);
        map.set(k, { targa: current?.targa || null, modello: current?.modello || null, luogo: current?.luogo || luogo });
      }
    }
    return map;
  }, [anagrafiche, contatti]);

  /** Ritorna mezzo/targa del movimento, con fallback sull'anagrafica del privato. */
  const resolveVeicolo = (m: any) => {
    const cf = normCf(m.cf_pi);
    const fromAnag =
      (m.privato_id ? anagraficaMap.get(`ID:${m.privato_id}`) : undefined) ||
      anagraficaMap.get(cf) ||
      (cf ? anagraficaMap.get(`CF7:${cf.slice(0, 4)}${cf.slice(5)}`) : undefined) ||
      anagraficaMap.get(normKey(m.nome_privato || ""));
    return {
      targa: m.targa_automezzo || fromAnag?.targa || null,
      modello: m.modello_automezzo || fromAnag?.modello || null,
      luogo: fromAnag?.luogo || null,
    };
  };

  /** Elenco privati (chiave = CF se presente, altrimenti nome) ricavato dai movimenti. */
  const privatiOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const m of movimenti ?? []) {
      const key = String(m.cf_pi || m.nome_privato || "—").trim().toUpperCase();
      const label = `${m.nome_privato || "—"}${m.cf_pi ? ` · ${m.cf_pi}` : ""}`;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "it"));
  }, [movimenti]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (movimenti ?? []).filter((m) => {
      if (privato !== "all") {
        const key = String(m.cf_pi || m.nome_privato || "—").trim().toUpperCase();
        if (key !== privato) return false;
      }
      if (!s) return true;
      return [m.nome_privato, m.cf_pi, m.cer, m.targa_automezzo, m.modello_automezzo]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s));
    });
  }, [movimenti, search, privato]);

  const totKg = filtered.reduce((s, m) => s + Number(m.kg_pesati || 0), 0);
  const selectedRows = filtered.filter((m) => selected.has(m.id));

  const anni = useMemo(() => {
    const y = new Date().getFullYear();
    return [String(y), String(y - 1), String(y - 2), "all"];
  }, []);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map((m) => m.id)),
    );
  };

  /** Rinumera i progressivi DBT rimasti per anno, in ordine cronologico. */
  const renumberProgressivi = async (anniToucher: number[]) => {
    for (const y of Array.from(new Set(anniToucher)).filter(Boolean)) {
      const { data, error } = await supabase
        .from("privati_conferimenti")
        .select("id, data, created_at, numero_progressivo")
        .eq("tenant_id", tenantId)
        .eq("anno_dbt", y)
        .order("data", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) { console.warn("Rinumerazione:", error.message); continue; }
      let n = 0;
      for (const row of (data ?? []) as any[]) {
        n += 1;
        if (Number(row.numero_progressivo) === n) continue;
        const { error: upErr } = await supabase
          .from("privati_conferimenti")
          .update({ numero_progressivo: n } as any)
          .eq("id", row.id);
        if (upErr) console.warn("Rinumerazione riga:", upErr.message);
      }
    }
  };

  /** Elimina un elenco di movimenti + ricalcolo giacenze + rinumerazione progressivi. */
  const deleteMovimenti = async (rows: any[]) => {
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("privati_conferimenti").delete().in("id", ids);
    if (error) throw error;

    // Ricalcolo giacenze per ogni coppia impianto/CER coinvolta
    const pairs = new Map<string, { impianto: string; cer: string }>();
    for (const r of rows) {
      if (r.impianto_id && r.cer) {
        pairs.set(`${r.impianto_id}|${r.cer}`, { impianto: r.impianto_id, cer: String(r.cer).trim() });
      }
    }
    for (const p of pairs.values()) {
      const { error: recalcError } = await supabase.rpc("recalculate_magazzino_giacenza", {
        p_tenant_id: tenantId,
        p_impianto_id: p.impianto,
        p_cer: p.cer,
      } as any);
      if (recalcError) console.warn("Ricalcolo giacenza:", recalcError.message);
    }

    await renumberProgressivi(
      rows.map((r) => Number(r.anno_dbt) || Number(String(r.data).slice(0, 4))).filter(Boolean),
    );

    setSelected(new Set());
    INVALIDATE_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handleDelete = async (m: any) => {
    const label = `${m.nome_privato || "privato"} · ${m.cer} · ${Number(m.kg_pesati).toLocaleString("it-IT")} kg · ${fmtDate(m.data)}`;
    if (!window.confirm(`Eliminare definitivamente questo movimento?\n\n${label}\n\nGiacenze e progressivi verranno aggiornati.`)) return;
    setDeletingId(m.id);
    try {
      await deleteMovimenti([m]);
      toast.success("Movimento eliminato: giacenze e progressivi aggiornati");
    } catch (e: any) {
      toast.error("Errore eliminazione: " + (e?.message || e));
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    const kg = selectedRows.reduce((s, m) => s + Number(m.kg_pesati || 0), 0);
    if (!window.confirm(
      `Eliminare ${selectedRows.length} movimenti selezionati (${kg.toLocaleString("it-IT")} kg)?\n\n` +
      `Ricevute e pagamenti collegati saranno rimossi in cascata.\nGiacenze e progressivi verranno ricalcolati.\n\nOperazione irreversibile.`,
    )) return;
    setBulkBusy(true);
    try {
      await deleteMovimenti(selectedRows);
      toast.success(`✅ ${selectedRows.length} movimenti eliminati: giacenze e progressivi aggiornati`);
    } catch (e: any) {
      toast.error("Errore eliminazione: " + (e?.message || e));
    } finally {
      setBulkBusy(false);
    }
  };

  /** Righe normalizzate con tutti i parametri di legge (art. 190 D.Lgs. 152/2006). */
  const buildExportRows = () =>
    [...filtered]
      .sort((a, b) => String(a.data).localeCompare(String(b.data)) || (a.numero_progressivo ?? 0) - (b.numero_progressivo ?? 0))
      .map((m, i) => ({
        ...m,
        n_riga: i + 1,
        progressivo: m.numero_progressivo ? `${m.numero_progressivo}/${m.anno_dbt ?? String(m.data).slice(0, 4)}` : "—",
        data_it: fmtDate(m.data),
        descrizione: getCerDescrizioneCompleta(m.cer),
        causale: "CARICO",
        stato_fisico: m.stato_rifiuto || "SOLIDO NON PULVERULENTO",
        pericoloso: /\*/.test(String(m.cer)) ? "SI" : "NO",
        operazione: "R13 - Messa in riserva",
        produttore: `${m.nome_privato || "—"} (privato/utenza domestica)`,
        destinatario: "MULTYPROGET SRL - impianto autorizzato",
        documento: m.numero_fir ? `FIR ${m.numero_fir}` : `Ricevuta n. ${m.numero_progressivo ?? "—"}/${m.anno_dbt ?? String(m.data).slice(0, 4)}`,
        kg: Number(m.kg_pesati || 0),
        importo: Number(m.importo_pagato || 0),
        modello_automezzo: resolveVeicolo(m).modello ?? "",
        targa_automezzo: resolveVeicolo(m).targa ?? "",
        luogo_produzione: resolveVeicolo(m).luogo ?? "",
      }));

  const EXPORT_COLUMNS = [
    { header: "N.", key: "n_riga", width: 6 },
    { header: "Progressivo/Anno", key: "progressivo", width: 16 },
    { header: "Data movimento", key: "data_it", width: 14 },
    { header: "Causale", key: "causale", width: 10 },
    { header: "Codice EER (CER)", key: "cer", width: 16 },
    { header: "Descrizione rifiuto", key: "descrizione", width: 44 },
    { header: "Pericoloso", key: "pericoloso", width: 11 },
    { header: "Stato fisico", key: "stato_fisico", width: 24 },
    { header: "Quantita (kg)", key: "kg", width: 13 },
    { header: "Operazione R/D", key: "operazione", width: 22 },
    { header: "Produttore / Detentore", key: "produttore", width: 36 },
    { header: "Codice fiscale", key: "cf_pi", width: 20 },
    { header: "Luogo di produzione del rifiuto", key: "luogo_produzione", width: 34 },
    { header: "Tipo utenza", key: "tipo_utenza", width: 16 },
    { header: "Mezzo", key: "modello_automezzo", width: 18 },
    { header: "Targa", key: "targa_automezzo", width: 12 },
    { header: "Destinatario / Impianto", key: "destinatario", width: 34 },
    { header: "Documento di riferimento", key: "documento", width: 26 },
    { header: "Importo EUR", key: "importo", width: 12 },
    { header: "Metodo pagamento", key: "metodo_pag", width: 18 },
    { header: "Annotazioni", key: "note", width: 30 },
  ];

  const exportHeaderLines = (rows: any[]) => [
    "REGISTRO CRONOLOGICO DI CARICO E SCARICO - art. 190 D.Lgs. 152/2006",
    "MULTYPROGET SRL - conferimenti da utenze domestiche / privati",
    `Periodo: ${anno === "all" ? "tutti gli anni" : anno}${privato !== "all" ? ` - Soggetto: ${privato}` : ""}`,
    `Movimenti: ${rows.length} - Totale kg: ${rows.reduce((s, r) => s + r.kg, 0).toLocaleString("it-IT")}`,
    `Estratto il ${new Date().toLocaleDateString("it-IT")}`,
  ];

  const handleExport = () => {
    try {
      const rows = buildExportRows();
      if (!rows.length) return toast.error("Nessun movimento da esportare");
      // NB: il nome del foglio non può contenere : \ / ? * [ ]
      exportToExcel(
        rows,
        EXPORT_COLUMNS,
        `registro_movimenti_privati_${anno}`,
        "Registro CS Privati",
        exportHeaderLines(rows),
      );
      toast.success(`Export Excel generato: ${rows.length} movimenti`);
    } catch (e: any) {
      toast.error("Errore export Excel: " + (e?.message || e));
    }
  };

  const handleExportPdf = () => {
    try {
      const rows = buildExportRows();
      if (!rows.length) return toast.error("Nessun movimento da esportare");
exportToPdf(
        rows,
        EXPORT_COLUMNS,
        `registro_movimenti_privati_${anno}`,
        exportHeaderLines(rows).join("\n"),
        { fontSize: 9.5 },
      );
      toast.success(`Export PDF generato: ${rows.length} movimenti`);
    } catch (e: any) {
      toast.error("Errore export PDF: " + (e?.message || e));
    }
  };

  /** ---- VERSIONE BREVE: stesse voci del modulo allegato (registro cronologico) ---- */
  const SHORT_COLUMNS = [
    { header: "N.", key: "n_riga", width: 6 },
    { header: "Data", key: "data_it", width: 12 },
    { header: "Caus.", key: "causale", width: 10 },
    { header: "Cod. EER", key: "cer", width: 11 },
    { header: "Descrizione del rifiuto", key: "descrizione", width: 40 },
    { header: "Stato", key: "stato_breve", width: 7 },
    { header: "Produttore / conferente", key: "nome_privato", width: 26 },
    { header: "Codice fiscale", key: "cf_pi", width: 18 },
    { header: "Luogo di produzione del rifiuto", key: "luogo_produzione", width: 32 },
    { header: "MEZZO", key: "modello_automezzo", width: 16 },
    { header: "TARGA", key: "targa_automezzo", width: 12 },
    { header: "Carico (kg)", key: "carico_kg", width: 11 },
    { header: "Scarico (kg)", key: "scarico_kg", width: 11 },
    { header: "Giacenza (kg)", key: "giacenza_kg", width: 12 },
  ];

  const buildShortRows = () => {
    let progressiva = 0;
    return buildExportRows().map((r: any) => {
      const v = resolveVeicolo(r);
      progressiva += Number(r.kg || 0);
      return {
        ...r,
        stato_breve: /liquid/i.test(String(r.stato_fisico)) ? "L" : "S",
        nome_privato: r.nome_privato || "—",
        luogo_produzione: v.luogo || "—",
        modello_automezzo: v.modello || "—",
        targa_automezzo: v.targa || "NON REGISTRATA",
        carico_kg: Number(r.kg || 0),
        scarico_kg: "—",
        giacenza_kg: progressiva,
      };
    });
  };

  const shortHeader = (rows: any[]) => [
    `REGISTRO CRONOLOGICO DI CARICO / SCARICO — UTENZE PRIVATE — ANNO ${anno === "all" ? "TUTTI" : anno}`,
    "Multyproget S.r.l. — Impianto di recupero — Tenuto ai sensi dell'art. 190 del D.Lgs. 152/2006 e s.m.i.",
    `Movimenti: ${rows.length} — Totale kg: ${rows.reduce((s, r) => s + r.carico_kg, 0).toLocaleString("it-IT")}`,
  ];

  const handleExportShort = (kind: "pdf" | "xlsx") => {
    try {
      const rows = buildShortRows();
      if (!rows.length) return toast.error("Nessun movimento da esportare");
      const name = `registro_privati_breve_${anno}`;
      if (kind === "pdf") {
        exportToPdf(rows, SHORT_COLUMNS, name, shortHeader(rows).join("\n"), { fontSize: 10.5 });
      } else {
        exportToExcel(rows, SHORT_COLUMNS, name, "Registro breve", shortHeader(rows));
      }
      toast.success(`Export versione breve generato: ${rows.length} movimenti`);
    } catch (e: any) {
      toast.error("Errore export versione breve: " + (e?.message || e));
    }
  };

  /**
   * Completa gli indirizzi mancanti in anagrafica privati recuperandoli dalla rubrica
   * (match per codice fiscale, poi per nome/cognome normalizzato).
   */
  const handleCompletaIndirizzi = async () => {
    if (completingAddr) return;
    setCompletingAddr(true);
    try {
      const rubricaMap = new Map<string, any>();
      for (const c of contatti ?? []) {
        if (!String(c.indirizzo || "").trim()) continue;
        const nome = [c.nome, c.cognome].filter(Boolean).join(" ").trim() || c.ragione_sociale || "";
        for (const k of [
          c.anagrafica_id ? `ID:${c.anagrafica_id}` : "",
          normCf(c.codice_fiscale),
          normKey(nome),
        ].filter(Boolean)) {
          if (!rubricaMap.has(k)) rubricaMap.set(k, c);
        }
      }

      const daCompletare = (anagrafiche ?? []).filter((a) => !String(a.indirizzo || "").trim());
      let aggiornati = 0;
      const nonTrovati: string[] = [];

      for (const a of daCompletare) {
        const nome = [a.nome, a.cognome].filter(Boolean).join(" ").trim() || a.denominazione || "";
        const cf = normCf(a.codice_fiscale);
        const hit =
          rubricaMap.get(`ID:${a.id}`) ||
          (cf ? rubricaMap.get(cf) : undefined) ||
          rubricaMap.get(normKey(nome));
        if (!hit) {
          nonTrovati.push(nome || cf || a.id);
          continue;
        }
        const payload: Record<string, any> = { indirizzo: String(hit.indirizzo).trim() };
        if (!String(a.cap || "").trim() && hit.cap) payload.cap = String(hit.cap).trim();
        if (!String(a.comune_residenza || "").trim() && hit.comune) payload.comune_residenza = String(hit.comune).trim();
        if (!String(a.provincia || "").trim() && hit.provincia) payload.provincia = String(hit.provincia).trim();
        const { error } = await supabase.from("anagrafica_privati").update(payload).eq("id", a.id);
        if (error) throw error;
        aggiornati += 1;
      }

      for (const k of INVALIDATE_KEYS) queryClient.invalidateQueries({ queryKey: [k] });
      queryClient.invalidateQueries({ queryKey: ["privati-anagrafica-veicoli"] });
      queryClient.invalidateQueries({ queryKey: ["dev-privati"] });

      if (!daCompletare.length) toast.success("Nessun indirizzo mancante: anagrafica già completa");
      else if (aggiornati) toast.success(`Indirizzi completati: ${aggiornati}. Non trovati in rubrica: ${nonTrovati.length}`);
      else toast.warning(`Nessun indirizzo recuperabile dalla rubrica (${nonTrovati.length} privati da compilare a mano)`);
    } catch (e: any) {
      toast.error("Errore completamento indirizzi: " + (e?.message || e));
    } finally {
      setCompletingAddr(false);
    }
  };


  return (
    <Card className="bg-card/60 border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-4 w-4 text-emerald-400" />
          Movimenti Privati — elenco completo
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {filtered.length} movimenti · {totKg.toLocaleString("it-IT")} kg
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={privato} onValueChange={(v) => { setPrivato(v); setSelected(new Set()); }}>
            <SelectTrigger className="w-80 h-9">
              <User className="h-4 w-4 mr-1 text-emerald-400" />
              <SelectValue placeholder="Scegli privato..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i privati</SelectItem>
              {privatiOptions.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label} ({p.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Cerca per nome, CF, CER o targa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 h-9"
          />
          <Select value={anno} onValueChange={(v) => { setAnno(v); setSelected(new Set()); }}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anni.map((a) => (
                <SelectItem key={a} value={a}>{a === "all" ? "Tutti gli anni" : a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Aggiorna
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={() => handleExportShort("pdf")} className="gap-1 bg-emerald-600 hover:bg-emerald-500 text-white">
            <FileText className="h-4 w-4" /> Esporta versione breve (PDF)
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportShort("xlsx")} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" /> Breve (Excel)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddrDialogOpen(true)}
            className="gap-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            <MapPin className="h-4 w-4" />
            Completa indirizzi
          </Button>

          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            disabled={selectedRows.length === 0 || bulkBusy}
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4" />
            {bulkBusy ? "Eliminazione..." : `Elimina selezionati (${selectedRows.length})`}
          </Button>
        </div>

        <div className="max-h-[520px] overflow-auto rounded-lg border border-border/30">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/95 backdrop-blur">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 w-8">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                    aria-label="Seleziona tutti"
                  />
                </th>
                <th className="p-2">Data</th>
                <th className="p-2">DBT</th>
                <th className="p-2">Privato</th>
                <th className="p-2">CER</th>
                <th className="p-2">Descrizione</th>
                <th className="p-2 text-right">Kg</th>
                <th className="p-2 text-right">€</th>
                <th className="p-2">Targa</th>
                <th className="p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Caricamento...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Nessun movimento trovato</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="border-t border-border/20 hover:bg-muted/20">
                    <td className="p-2">
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggleRow(m.id)}
                        aria-label="Seleziona movimento"
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap">{fmtDate(m.data)}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">
                      {m.numero_progressivo != null ? `#${m.numero_progressivo}/${m.anno_dbt ?? String(m.data).slice(0, 4)}` : "—"}
                    </td>
                    <td className="p-2">{m.nome_privato || "—"}</td>
                    <td className="p-2 font-mono text-xs">{m.cer}</td>
                    <td className="p-2 text-xs text-muted-foreground">{getCerDescrizioneCompleta(m.cer)}</td>
                    <td className="p-2 text-right font-mono">{Number(m.kg_pesati || 0).toLocaleString("it-IT")}</td>
                    <td className="p-2 text-right font-mono">{Number(m.importo_pagato || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 font-mono text-xs">{resolveVeicolo(m).targa || "—"}</td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === m.id}
                        onClick={() => handleDelete(m)}
                        title="Elimina movimento e ricalcola giacenze"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
