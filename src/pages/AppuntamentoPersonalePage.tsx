import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Persona {
  id: string;
  nome: string;
  messaggio_disponibilita: string;
  risposta_riccardo: string;
}

export default function AppuntamentoPersonalePage() {
  const [persone, setPersone] = useState<Persona[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from("appuntamenti_personale")
      .select("*")
      .order("created_at")
      .then(({ data }) => {
        if (data) setPersone(data as Persona[]);
      });
  }, []);

  const save = useCallback(async (id: string, field: string, value: string) => {
    setSaving((s) => ({ ...s, [id + field]: true }));
    await supabase
      .from("appuntamenti_personale")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving((s) => ({ ...s, [id + field]: false }));
  }, []);

  const update = (id: string, field: string, value: string) => {
    setPersone((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
          📅 Appuntamento con Riccardo
        </h1>
        <p className="text-center text-slate-400 mb-1 text-sm">
          Periodo: <span className="text-amber-400 font-semibold">Giovedì 12 Marzo – Venerdì 20 Marzo 2026</span>
        </p>
        <p className="text-center text-slate-500 mb-6 text-xs">
          Scrivi la tua disponibilità oraria. Riccardo risponderà nel campo giallo.
        </p>

        <div className="space-y-4">
          {persone.map((p) => (
            <div key={p.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="font-semibold text-lg text-emerald-400 mb-3">{p.nome}</div>

              <div className="grid gap-3 md:grid-cols-2">
                {/* Disponibilità */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Disponibilità oraria per appuntamento
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 text-slate-100 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
                    placeholder="Es: Lunedì 17 marzo ore 10-12, Mercoledì 19 marzo pomeriggio..."
                    value={p.messaggio_disponibilita}
                    onChange={(e) => update(p.id, "messaggio_disponibilita", e.target.value)}
                    onBlur={(e) => save(p.id, "messaggio_disponibilita", e.target.value)}
                  />
                  {saving[p.id + "messaggio_disponibilita"] && (
                    <span className="text-xs text-emerald-500">Salvataggio...</span>
                  )}
                </div>

                {/* Risposta Riccardo */}
                <div>
                  <label className="text-xs text-amber-400 mb-1 block">
                    Risposta di Riccardo
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-amber-700/50 bg-amber-950/40 text-amber-100 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-amber-800"
                    placeholder="Riccardo scriverà qui..."
                    value={p.risposta_riccardo}
                    onChange={(e) => update(p.id, "risposta_riccardo", e.target.value)}
                    onBlur={(e) => save(p.id, "risposta_riccardo", e.target.value)}
                  />
                  {saving[p.id + "risposta_riccardo"] && (
                    <span className="text-xs text-amber-500">Salvataggio...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
