import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";
import { toast } from "sonner";

const TIPO_OPTIONS = [
  { value: "cliente", label: "Cliente" },
  { value: "fornitore", label: "Fornitore" },
  { value: "collaboratore_piva", label: "Collaboratore P.IVA" },
  { value: "dipendente", label: "Dipendente" },
  { value: "banca", label: "Banca" },
];

interface Props {
  item?: any;
  tenantId?: string;
  onClose: () => void;
}

export function AnagraficaFormDialog({ item, tenantId, onClose }: Props) {
  const isEdit = !!item;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    tipo_soggetto: item?.tipo_soggetto || "cliente",
    ragione_sociale: item?.ragione_sociale || "",
    nome: item?.nome || "",
    cognome: item?.cognome || "",
    codice_fiscale: item?.codice_fiscale || "",
    partita_iva: item?.partita_iva || "",
    indirizzo: item?.indirizzo || "",
    cap: item?.cap || "",
    comune: item?.comune || "",
    provincia: item?.provincia || "",
    nazione: item?.nazione || "IT",
    pec: item?.pec || "",
    codice_destinatario: item?.codice_destinatario || "0000000",
    iban: item?.iban || "",
    telefono: item?.telefono || "",
    email: item?.email || "",
    note: item?.note || "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tenant_id: tenantId || null };
      if (isEdit) {
        const { error } = await supabase.from("erp_anagrafiche" as any).update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("erp_anagrafiche" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-anagrafiche"] });
      toast.success(isEdit ? "Anagrafica aggiornata" : "Anagrafica creata");
      onClose();
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  const Field = ({ label, field, type = "text", span = 1 }: { label: string; field: string; type?: string; span?: number }) => (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={(form as any)[field] || ""}
        onChange={(e) => set(field, e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/30 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h3 className="text-lg font-semibold text-foreground">{isEdit ? "Modifica Anagrafica" : "Nuova Anagrafica"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/20"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Tipo Soggetto</label>
            <select
              value={form.tipo_soggetto}
              onChange={(e) => set("tipo_soggetto", e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground"
            >
              {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Field label="Ragione Sociale" field="ragione_sociale" />
          <Field label="Nome" field="nome" />
          <Field label="Cognome" field="cognome" />
          <Field label="P.IVA" field="partita_iva" />
          <Field label="Codice Fiscale" field="codice_fiscale" />
          <Field label="Indirizzo" field="indirizzo" span={2} />
          <Field label="CAP" field="cap" />
          <Field label="Comune" field="comune" />
          <Field label="Provincia" field="provincia" />
          <Field label="Nazione" field="nazione" />
          <Field label="PEC" field="pec" />
          <Field label="Codice Destinatario" field="codice_destinatario" />
          <Field label="IBAN" field="iban" span={2} />
          <Field label="Telefono" field="telefono" />
          <Field label="Email" field="email" />
          <div className="col-span-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Note</label>
            <textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border/30">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/20 transition-colors">Annulla</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.ragione_sociale || mutation.isPending}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? "Salvataggio..." : isEdit ? "Salva" : "Crea"}
          </button>
        </div>
      </div>
    </div>
  );
}
