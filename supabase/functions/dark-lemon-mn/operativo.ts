import { GIACENZE_21_09 } from "./giacenze21.ts";
// Strumenti operativi di DARK LEMON: ogni scrittura avviene in due passi
// (anteprima senza scrivere -> conferma esplicita "CONFERMO" dell'operatrice).
// Regola assoluta: nulla con data fino al 21/09/2026 incide sulle giacenze.

export const GIACENZE_FINAL_DATE = "2026-09-21";
const TENANT_MULTY = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

let ultimoMessaggioUtente = "";
export function impostaUltimoMessaggio(testo: unknown) {
  ultimoMessaggioUtente = typeof testo === "string" ? testo : Array.isArray(testo)
    ? testo.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join(" ")
    : "";
}
const haConfermato = () => /\bCONFERMO\b/i.test(ultimoMessaggioUtente);
const NO_CONFERMA = {
  error: "Operazione non eseguita: serve che l'operatrice scriva CONFERMO dopo aver visto l'anteprima.",
};

const normFir = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normCer = (s: unknown) => String(s ?? "").trim().toUpperCase().replace(/^(\d{2})[ .]?(\d{2})[ .]?(\d{2})/, "$1$2$3");
const r2 = (n: number) => Math.round(n * 100) / 100;

const def = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

export const toolsOperativi = [
  def("prepara_fattura_formulario",
    "Prepara (senza salvare) la fattura di uno o più formulari partendo dal numero FIR: trova il formulario, il cliente, i kg accettati e il prezzo dal contratto. Mostra l'anteprima e chiedi CONFERMO.",
    {
      numeri_fir: { type: "array", items: { type: "string" } },
      cliente: { type: "string", description: "ID anagrafica, ragione sociale o P.IVA se il cliente non si deduce dal formulario" },
      prezzo_unitario: { type: "number", description: "€/kg se non c'è un contratto" },
      aliquota_iva: { type: "number" },
      reverse_charge: { type: "boolean" },
    }, ["numeri_fir"]),
  def("conferma_fattura_formulario",
    "Dopo CONFERMO: salva la fattura in bozza con gli stessi dati dell'anteprima. Poi, se l'operatrice lo chiede o conferma l'invio, usa send_fattura_sibill.",
    {
      numeri_fir: { type: "array", items: { type: "string" } },
      cliente: { type: "string" },
      prezzo_unitario: { type: "number" },
      aliquota_iva: { type: "number" },
      reverse_charge: { type: "boolean" },
    }, ["numeri_fir"]),
  def("operazione_magazzino",
    "Operazione straordinaria di magazzino senza formulario (Multy Impianto), come la scheda «Operazioni di magazzino». Senza conferma restituisce l'anteprima del saldo; con confirm=true (dopo CONFERMO) la registra. Rifiuta date fino al 21/09/2026 e saldi negativi.",
    {
      tipo: { type: "string", enum: ["carico", "scarico", "rettifica+", "rettifica-"] },
      cer: { type: "string" }, kg: { type: "number" },
      data: { type: "string", description: "AAAA-MM-GG, dopo il 21/09/2026" },
      motivo: { type: "string", description: "Obbligatorio per le rettifiche" },
      confirm: { type: "boolean" },
    }, ["tipo", "cer", "kg", "data"]),
  def("annulla_operazione_magazzino",
    "Annulla un'operazione di magazzino creando il movimento contrario (mai cancellazioni). Senza confirm mostra cosa farà; con confirm=true (dopo CONFERMO) la esegue.",
    { registro_id: { type: "string" }, confirm: { type: "boolean" } }, ["registro_id"]),
  def("saldo_giacenze",
    "Saldo giacenze Multy Impianto per CER a una data (fotografia 21/09 + operazioni umane successive: registro con incide_giacenze, cernite confermate, conferimenti privati dopo il 21/09). Sola lettura.",
    { data: { type: "string" }, cer: { type: "string" } }),
  def("conferimento_privato",
    "Conferimento di un privato (Multy Impianto). Senza confirm restituisce l'anteprima; con confirm=true (dopo CONFERMO) lo salva: la ricevuta si genera da sola. Incide sulle giacenze solo se la data è dopo il 21/09/2026.",
    {
      privato_id: { type: "string" }, nome_privato: { type: "string" }, cf_pi: { type: "string" },
      cer: { type: "string" }, kg: { type: "number" }, data: { type: "string" },
      importo_pagato: { type: "number" }, metodo_pag: { type: "string" }, targa_automezzo: { type: "string" },
      note: { type: "string" }, confirm: { type: "boolean" },
    }, ["cer", "kg"]),
  def("upsert_anagrafica_azienda",
    "Crea o aggiorna un'azienda in anagrafica (tenant attivo). Senza confirm mostra i dati; con confirm=true (dopo CONFERMO) salva.",
    {
      id: { type: "string", description: "Se presente aggiorna, altrimenti crea" },
      campi: { type: "object", description: "ragione_sociale, partita_iva, codice_fiscale, indirizzo, cap, citta, provincia, pec, codice_destinatario, telefono, email" },
      confirm: { type: "boolean" },
    }, ["campi"]),
];

export const NOMI_OPERATIVI = new Set(toolsOperativi.map((t) => t.function.name));

// ---------------- Giacenze (stesso calcolo della pagina Giacenze) ----------------
async function movimentiSuccessivi(db: any) {
  const out: { data: string; cer: string; carico: number; scarico: number }[] = [];
  const { data: reg } = await db.from("registro_generale")
    .select("data_movimento,cer,quantita,segno,carico_scarico")
    .eq("tenant_id", TENANT_MULTY).eq("registro", "MULTY_IMPIANTO").eq("stato_movimento", "effettivo")
    .eq("incide_giacenze", true).gt("data_movimento", GIACENZE_FINAL_DATE);
  for (const r of reg ?? []) {
    const kg = Number(r.quantita ?? 0);
    const car = r.segno === "+" || String(r.carico_scarico ?? "").toLowerCase() === "carico";
    out.push({ data: String(r.data_movimento).slice(0, 10), cer: normCer(r.cer), carico: car ? kg : 0, scarico: car ? 0 : kg });
  }
  const { data: b } = await db.from("dragon_transform_batches")
    .select("execution_date,input_quantity,source:dragon_items!dragon_transform_batches_source_item_id_fkey(codice_cer),outputs:dragon_transform_batch_outputs(output_quantity,item:dragon_items(codice_cer))")
    .eq("company_id", TENANT_MULTY).eq("status", "CONFERMATA").gt("execution_date", GIACENZE_FINAL_DATE);
  for (const x of b ?? []) {
    const d = String(x.execution_date).slice(0, 10);
    out.push({ data: d, cer: String(x.source?.codice_cer ?? ""), carico: 0, scarico: Number(x.input_quantity ?? 0) });
    for (const o of x.outputs ?? []) out.push({ data: d, cer: String(o.item?.codice_cer ?? ""), carico: Number(o.output_quantity ?? 0), scarico: 0 });
  }
  const { data: c } = await db.from("privati_conferimenti").select("data,cer,kg_pesati")
    .eq("tenant_id", TENANT_MULTY).gt("data", `${GIACENZE_FINAL_DATE}T23:59:59.999`);
  for (const x of c ?? []) out.push({ data: String(x.data).slice(0, 10), cer: normCer(x.cer), carico: Number(x.kg_pesati ?? 0), scarico: 0 });
  return out;
}

async function base21(_db: any): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  for (const x of GIACENZE_21_09) m.set(String(x.cer), (m.get(String(x.cer)) ?? 0) + Number(x.saldo));
  return m;
}

async function saldiAl(db: any, data: string, extra: { data: string; cer: string; carico: number; scarico: number }[] = []) {
  const base = await base21(db);
  const movs = [...(await movimentiSuccessivi(db)), ...extra];
  const calc = (giorno: string) => {
    const s = new Map(base);
    if (giorno <= GIACENZE_FINAL_DATE) return s;
    for (const mv of movs) if (mv.data > GIACENZE_FINAL_DATE && mv.data <= giorno) s.set(mv.cer, r2((s.get(mv.cer) ?? 0) + mv.carico - mv.scarico));
    return s;
  };
  return { calc, movs };
}

async function verificaNonNegativo(db: any, nuovo: { data: string; cer: string; carico: number; scarico: number }) {
  const { calc, movs } = await saldiAl(db, nuovo.data, [nuovo]);
  const date = Array.from(new Set(movs.map((m) => m.data).filter((d) => d >= nuovo.data))).sort();
  for (const d of date) {
    const v = calc(d).get(nuovo.cer) ?? 0;
    if (v < -0.0005) return `CER ${nuovo.cer} andrebbe a ${v.toLocaleString("it-IT")} kg il ${d.split("-").reverse().join("/")}: operazione rifiutata`;
  }
  return null;
}

const oggi = () => new Date().toISOString().slice(0, 10);

// ---------------- Fatture da formulario ----------------
async function cercaFormulario(db: any, tenantId: string, numero: string) {
  const n = normFir(numero);
  const { data: ff } = await db.from("fir_forms").select("id,numero_fir,codice_eer,form_data,quantita,tenant_id")
    .eq("tenant_id", tenantId).limit(2000);
  const f = (ff ?? []).find((x: any) => normFir(x.numero_fir) === n);
  const { data: rg } = await db.from("registro_generale").select("id,numero_formulario,cer,descrizione,quantita,peso_destino,data_movimento,raw,registro")
    .eq("tenant_id", tenantId).ilike("numero_formulario", `%${(n.match(/\d{6}/) ?? [n.slice(-4)])[0]}%`).limit(200);
  const r = (rg ?? []).find((x: any) => normFir(x.numero_formulario) === n);
  if (!f && !r) return null;
  const fd = f?.form_data ?? {};
  const raw = r?.raw ?? {};
  return {
    numero_fir: f?.numero_fir ?? r?.numero_formulario,
    fir_form_id: f?.id ?? null,
    cer: normCer(f?.codice_eer ?? fd.cer ?? r?.cer),
    descrizione: r?.descrizione ?? fd.descrizione_rifiuto ?? "",
    kg: [r?.peso_destino, fd.quantita_destino, fd.peso_ricevuto, r?.quantita, f?.quantita].map(Number).find((v) => v > 0) ?? 0,
    produttore: fd.produttore_denominazione ?? fd.produttore_ragione_sociale ?? raw.produttore ?? raw.Produttore ?? null,
    produttore_piva: fd.produttore_piva ?? fd.produttore_cf ?? raw.produttore_cf ?? null,
  };
}

async function cercaCliente(db: any, tenantId: string, testo?: string | null, piva?: string | null) {
  const sel = "id,ragione_sociale,partita_iva,codice_fiscale,indirizzo,cap,citta,provincia";
  if (piva) {
    const p = String(piva).replace(/\D/g, "");
    const { data } = await db.from("anagrafica_aziende_mp").select(sel).or(`partita_iva.eq.${p},codice_fiscale.eq.${p}`).limit(1);
    if (data?.[0]) return data[0];
  }
  if (testo && /^[0-9a-f-]{36}$/i.test(String(testo).trim())) {
    const { data } = await db.from("anagrafica_aziende_mp").select(sel).eq("id", String(testo).trim()).maybeSingle();
    if (data) return data;
  }
  if (testo) {
    const t = String(testo).trim();
    const p = t.replace(/\D/g, "");
    if (p.length === 11) return cercaCliente(db, tenantId, null, p);
    const { data } = await db.from("anagrafica_aziende_mp").select(sel).ilike("ragione_sociale", `%${t.replace(/[%,]/g, "")}%`).limit(5);
    if (data?.length === 1) return data[0];
    if (data?.length > 1) return { ambiguo: data.map((x: any) => x.ragione_sociale) };
  }
  return null;
}

async function prezzoContratto(db: any, clienteId: string, cer: string, ragione?: string) {
  const { data: perId } = await db.from("contratti_clienti").select("id,stato").eq("cliente_id", clienteId);
  const { data: perNome } = ragione ? await db.from("contratti_clienti").select("id,stato").ilike("cliente_ragione_sociale", ragione.replace(/[%_]/g, "")) : { data: [] };
  const contr = [...(perId ?? []), ...(perNome ?? [])];
  const ids = (contr ?? []).filter((c: any) => c.stato !== "recesso").map((c: any) => c.id);
  if (!ids.length) return null;
  const { data: righe } = await db.from("contratti_clienti_righe").select("articolo_cer,prezzo_unitario,aliquota_iva,unita_misura,attiva").in("contratto_id", ids).eq("attiva", true);
  const r = (righe ?? []).find((x: any) => normCer(x.articolo_cer) === cer);
  return r ? { prezzo: Number(r.prezzo_unitario), aliquota: Number(r.aliquota_iva ?? 22), um: r.unita_misura } : null;
}

async function componiFattura(db: any, tenantId: string, args: any) {
  const nums: string[] = Array.isArray(args.numeri_fir) ? args.numeri_fir : [args.numeri_fir].filter(Boolean);
  if (!nums.length) return { error: "Indica il numero del formulario." };
  const forms = [];
  for (const n of nums) {
    const f = await cercaFormulario(db, tenantId, n);
    if (!f) return { error: `Formulario ${n} non trovato nei registri del programma. Se è un FIR digitale presente solo sul RENTRI, va prima registrato dalla scheda «FIR → Giacenze» della Console RENTRI, oppure indicami kg accettati e cliente.` };
    if (!(f.kg > 0)) return { error: `Formulario ${n}: kg accettati non presenti, impossibile fatturare.` };
    forms.push(f);
  }
  const cli: any = await cercaCliente(db, tenantId, args.cliente ?? forms[0].produttore, forms[0].produttore_piva);
  if (!cli) return { error: "Cliente non trovato in anagrafica: indicami ragione sociale o P.IVA.", formulari: forms };
  if (cli.ambiguo) return { error: "Più clienti corrispondono: quale?", candidati: cli.ambiguo };
  if (!cli.partita_iva && !cli.codice_fiscale) return { error: `Il cliente ${cli.ragione_sociale} non ha P.IVA né codice fiscale.` };
  const righe = [];
  for (const f of forms) {
    const c = await prezzoContratto(db, cli.id, f.cer, cli.ragione_sociale);
    const prezzo = Number(args.prezzo_unitario ?? c?.prezzo ?? NaN);
    if (!Number.isFinite(prezzo)) return { error: `Nessun prezzo a contratto per CER ${f.cer} di ${cli.ragione_sociale}: indicami il prezzo €/kg.`, formulari: forms };
    const rc = Boolean(args.reverse_charge);
    const aliq = rc ? 0 : Number(args.aliquota_iva ?? c?.aliquota ?? 22);
    const imp = r2(f.kg * prezzo);
    righe.push({
      fir_form_id: f.fir_form_id, numero_fir: f.numero_fir, cer: f.cer,
      descrizione: `Smaltimento CER ${f.cer}${f.descrizione ? " " + f.descrizione : ""} - FIR ${f.numero_fir}`,
      quantita: f.kg, unita_misura: "kg", prezzo_unitario: prezzo, imponibile: imp, aliquota_iva: aliq,
      iva: r2(imp * aliq / 100), totale: r2(imp * (1 + aliq / 100)), reverse_charge: rc, tipo_riga: "servizio",
      fonte_prezzo: args.prezzo_unitario != null ? "indicato" : "contratto",
    });
  }
  const imponibile = r2(righe.reduce((s, r) => s + r.imponibile, 0));
  const iva = r2(righe.reduce((s, r) => s + r.iva, 0));
  return { cliente: cli, righe, imponibile, iva, totale: r2(imponibile + iva) };
}

export async function handleOperativo(name: string, args: any, db: any, tenantId: string, adminUserId: string): Promise<any> {
  switch (name) {
    case "prepara_fattura_formulario": {
      const f = await componiFattura(db, tenantId, args);
      if ((f as any).error) return f;
      return { anteprima: true, ...f, istruzione: "Mostra cliente, righe e totali; chiedi all'operatrice di scrivere CONFERMO per salvare la bozza." };
    }
    case "conferma_fattura_formulario": {
      if (!haConfermato()) return NO_CONFERMA;
      const f: any = await componiFattura(db, tenantId, args);
      if (f.error) return f;
      const anno = new Date().getFullYear();
      const { data: numero, error: ne } = await db.rpc("next_fattura_number", { p_tenant_id: tenantId, p_anno: anno });
      if (ne) return { error: `Numerazione fattura fallita: ${ne.message}` };
      const c = f.cliente;
      const { data: fat, error } = await db.from("fatture").insert({
        tenant_id: tenantId, numero, anno, data_emissione: oggi(), cliente_id: c.id,
        cliente_ragione_sociale: c.ragione_sociale, cliente_partita_iva: c.partita_iva, cliente_codice_fiscale: c.codice_fiscale,
        cliente_indirizzo: [c.indirizzo, c.cap, c.citta, c.provincia].filter(Boolean).join(" "),
        tipo: "servizi", stato: "bozza", imponibile: f.imponibile, iva: f.iva, totale: f.totale,
        reverse_charge: f.righe.every((r: any) => r.reverse_charge), created_by: adminUserId || null,
        note: `Bozza preparata da DARK LEMON e confermata dall'operatrice (FIR ${f.righe.map((r: any) => r.numero_fir).join(", ")})`,
      }).select("id,numero,anno,totale,stato").maybeSingle();
      if (error || !fat) return { error: `Fattura non salvata: ${error?.message ?? "nessuna riga"}` };
      const { error: re } = await db.from("fatture_righe").insert(f.righe.map(({ fonte_prezzo: _fp, ...r }: any, i: number) => ({ ...r, fattura_id: fat.id, ordine: i })));
      if (re) return { error: `Fattura ${fat.numero} creata ma righe non salvate: ${re.message}` };
      return { success: true, fattura: fat, prossimo_passo: "Chiedi se inviarla a Sibill: con CONFERMO usa send_fattura_sibill con questo fattura_id." };
    }
    case "saldo_giacenze": {
      const d = String(args.data || oggi()).slice(0, 10);
      const { calc } = await saldiAl(db, d);
      const s = calc(d);
      if (args.cer) return { data: d, cer: normCer(args.cer), saldo_kg: s.get(normCer(args.cer)) ?? 0 };
      const righe = [...s.entries()].filter(([, v]) => Math.abs(v) > 0.0005).map(([cer, kg]) => ({ cer, kg }));
      return { data: d, totale_kg: r2(righe.reduce((a, r) => a + r.kg, 0)), righe };
    }
    case "operazione_magazzino": {
      const tipi: Record<string, { segno: "+" | "-"; op: string }> = {
        carico: { segno: "+", op: "Carico di Lavorazione" }, scarico: { segno: "-", op: "Scarico di Lavorazione" },
        "rettifica+": { segno: "+", op: "Rettifica inventariale +" }, "rettifica-": { segno: "-", op: "Rettifica inventariale −" },
      };
      const t = tipi[args.tipo];
      const data = String(args.data ?? "").slice(0, 10);
      const kg = Number(args.kg);
      const cer = normCer(args.cer);
      if (!t) return { error: "Tipo non valido" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data <= GIACENZE_FINAL_DATE) return { error: "Vietato: le giacenze fino al 21/09/2026 sono immutabili. Usa una data successiva." };
      if (!(kg > 0)) return { error: "Kg non validi" };
      if (String(args.tipo).startsWith("rettifica") && !String(args.motivo ?? "").trim()) return { error: "Per le rettifiche il motivo è obbligatorio." };
      const nuovo = { data, cer, carico: t.segno === "+" ? kg : 0, scarico: t.segno === "-" ? kg : 0 };
      const err = await verificaNonNegativo(db, nuovo);
      if (err) return { error: err };
      const { calc } = await saldiAl(db, data);
      const { calc: dopo } = await saldiAl(db, data, [nuovo]);
      const anteprima = {
        tipo: t.op, cer, kg, data,
        saldo_alla_data: { prima: calc(data).get(cer) ?? 0, dopo: dopo(data).get(cer) ?? 0 },
        saldo_oggi: { prima: calc(oggi()).get(cer) ?? 0, dopo: dopo(oggi()).get(cer) ?? 0 },
      };
      if (!args.confirm) return { anteprima, istruzione: "Mostra l'anteprima e chiedi CONFERMO." };
      if (!haConfermato()) return NO_CONFERMA;
      const { data: ins, error } = await db.from("registro_generale").insert({
        tenant_id: TENANT_MULTY, registro: "MULTY_IMPIANTO", data_movimento: data, cer, quantita: kg,
        segno: t.segno, carico_scarico: t.segno === "+" ? "Carico" : "Scarico", tipo_operazione: t.op,
        stato_movimento: "effettivo", incide_giacenze: true, created_by_agent: false,
        annotazioni: String(args.motivo ?? "").trim() || `${t.op} (confermata dall'operatrice tramite DARK LEMON)`,
      }).select("id").maybeSingle();
      if (error) return { error: error.message };
      return { success: true, registro_id: ins?.id, anteprima };
    }
    case "annulla_operazione_magazzino": {
      const { data: r } = await db.from("registro_generale").select("id,data_movimento,cer,quantita,segno,annotazioni,incide_giacenze,registro,tenant_id")
        .eq("id", args.registro_id).maybeSingle();
      if (!r || r.tenant_id !== TENANT_MULTY || r.registro !== "MULTY_IMPIANTO" || !r.incide_giacenze) return { error: "Operazione non trovata tra le operazioni di magazzino annullabili." };
      if (String(r.data_movimento) <= GIACENZE_FINAL_DATE) return { error: "Vietato: operazione con data fino al 21/09/2026." };
      const { data: gia } = await db.from("registro_generale").select("id").eq("annotazioni", `Annullo operazione ${r.id}`).limit(1);
      if (gia?.length) return { error: "Questa operazione è già stata annullata." };
      const segno = r.segno === "+" ? "-" : "+";
      const kg = Number(r.quantita);
      const nuovo = { data: String(r.data_movimento).slice(0, 10), cer: normCer(r.cer), carico: segno === "+" ? kg : 0, scarico: segno === "-" ? kg : 0 };
      const err = await verificaNonNegativo(db, nuovo);
      if (err) return { error: err };
      if (!args.confirm) return { anteprima: { annulla: r, movimento_contrario: nuovo }, istruzione: "Chiedi CONFERMO." };
      if (!haConfermato()) return NO_CONFERMA;
      const { error } = await db.from("registro_generale").insert({
        tenant_id: TENANT_MULTY, registro: "MULTY_IMPIANTO", data_movimento: nuovo.data, cer: nuovo.cer, quantita: kg,
        segno, carico_scarico: segno === "+" ? "Carico" : "Scarico",
        tipo_operazione: segno === "+" ? "Rettifica inventariale +" : "Rettifica inventariale −",
        stato_movimento: "effettivo", incide_giacenze: true, created_by_agent: false, annotazioni: `Annullo operazione ${r.id}`,
      });
      return error ? { error: error.message } : { success: true, annullata: r.id };
    }
    case "conferimento_privato": {
      const data = String(args.data || oggi()).slice(0, 10);
      const kg = Number(args.kg);
      if (!(kg > 0)) return { error: "Kg non validi" };
      const cer = normCer(args.cer);
      const anteprima = { cer, kg, data, incide_giacenze: data > GIACENZE_FINAL_DATE, privato: args.nome_privato ?? args.privato_id ?? null, importo_pagato: args.importo_pagato ?? null };
      if (!args.confirm) return { anteprima, istruzione: "Mostra l'anteprima e chiedi CONFERMO." };
      if (!haConfermato()) return NO_CONFERMA;
      const row: Record<string, unknown> = {
        tenant_id: TENANT_MULTY, impianto_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", cer, kg_pesati: kg, data: `${data}T12:00:00`,
      };
      for (const k of ["privato_id", "nome_privato", "cf_pi", "importo_pagato", "metodo_pag", "targa_automezzo", "note"]) if (args[k] != null) row[k] = args[k];
      const { data: ins, error } = await db.from("privati_conferimenti").insert(row).select("id,numero_progressivo,anno_dbt").maybeSingle();
      return error ? { error: error.message } : { success: true, conferimento: ins, anteprima };
    }
    case "upsert_anagrafica_azienda": {
      const ammessi = ["ragione_sociale", "partita_iva", "codice_fiscale", "indirizzo", "cap", "citta", "provincia", "pec", "codice_destinatario", "telefono", "email"];
      const campi: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(args.campi ?? {})) if (ammessi.includes(k)) campi[k] = v;
      if (!Object.keys(campi).length) return { error: "Nessun campo valido" };
      if (!args.id && !campi.ragione_sociale) return { error: "Per creare serve la ragione sociale." };
      if (!args.confirm) return { anteprima: { azione: args.id ? "aggiorna" : "crea", id: args.id ?? null, campi }, istruzione: "Chiedi CONFERMO." };
      if (!haConfermato()) return NO_CONFERMA;
      const q = args.id
        ? db.from("anagrafica_aziende_mp").update(campi).eq("id", args.id).select("id,ragione_sociale").maybeSingle()
        : db.from("anagrafica_aziende_mp").insert({ ...campi, tenant_id: tenantId }).select("id,ragione_sociale").maybeSingle();
      const { data, error } = await q;
      return error ? { error: error.message } : { success: true, azienda: data };
    }
  }
  return { error: `Strumento ${name} sconosciuto` };
}

export const PROMPT_OPERATIVO = `
### 11. MODALITÀ OPERATIVA (ottobre 2026) — sei l'assistente che fa tutto nel programma
- Puoi fare qualsiasi operazione del programma, ma OGNI scrittura segue due passi: 1) anteprima senza scrivere; 2) l'operatrice scrive CONFERMO; solo allora esegui (confirm=true). Senza CONFERMO il server rifiuta.
- "Fai fattura del formulario X": usa prepara_fattura_formulario → mostra cliente, kg accettati, prezzo (contratto o indicato), totali → chiedi CONFERMO → conferma_fattura_formulario (bozza) → chiedi se inviare a Sibill → con CONFERMO send_fattura_sibill. Mai invio a SDI/cassetto fiscale per prova.
- Giacenze: REGOLA ASSOLUTA — fino al 21/09/2026 sono fisse e immutabili. Dal 22/09 cambiano solo per: operazioni di magazzino (operazione_magazzino), formulari RENTRI accettati registrati dalla scheda «FIR → Giacenze», cernite confermate, conferimenti privati datati dopo il 21/09. Il saldo vale dal giorno dell'operazione in poi (a catena). Nessuna operazione può portare un CER sotto zero. Per leggere i saldi usa saldo_giacenze.
- Annullare: annulla_operazione_magazzino crea il movimento contrario; MAI cancellare righe.
- Privati: conferimento_privato (la ricevuta si genera da sola). Anagrafica aziende: upsert_anagrafica_azienda; privati: create_privato / update_privato.
- Formulari: puoi preparare/compilare bozze e inviarle al RENTRI solo con autorizzazione esplicita; la firma della partenza si fa dall'app RENTRI (non abbiamo firma via API). HTTP 202 = solo accettazione tecnica: mai dire che un FIR è partito/firmato senza averlo riletto dal RENTRI.
- Cernite: le prepari; la conferma si fa nella schermata Cernite, che rifiuta cernite che portano un CER sotto zero o con data fino al 21/09.
- Strumenti Dragon (dragon_*): Dragon è disattivato, non usarli per scrivere.
- Prove: per i test usa sola lettura (run_system_test, db_health_check, saldo_giacenze, anteprime). Non lasciare mai dati di prova nel programma.
- Novità da conoscere: scheda «Operazioni di magazzino» (Impianto), scheda «FIR → Giacenze» (Console RENTRI, registra con un click i formulari accettati dopo il 21/09), avviso «firma la partenza dall'app RENTRI» sui formulari inviati, pulsante «Aggiorna su Sibill» in anagrafica, stampa/PDF/Excel dell'elenco cernite, documento giacenze giorno per giorno dal 18/07 a oggi.
`;
