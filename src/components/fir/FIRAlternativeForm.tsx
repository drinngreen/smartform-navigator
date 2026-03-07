import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Zap } from "lucide-react";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";

interface TemplateField {
  id: string;
  name: string;
  type: "date" | "time" | "short_text" | "long_text" | "checkbox";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const PAGE_IMAGES = [pag1, pag2, pag3];

export function FIRAlternativeForm() {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);

  useEffect(() => {
    supabase
      .from("fir_form_templates")
      .select("fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data?.fields) {
          setFields(data.fields as unknown as TemplateField[]);
        }
        if (error) console.warn("[FIRAlternativeForm]", error.message);
        setLoading(false);
      });
  }, []);

  const handleChange = (id: string, val: string | boolean) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const pageFields = fields.filter((f) => f.page === activePage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-primary animate-pulse text-sm font-mono">Caricamento template...</div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm font-mono">Nessun template salvato</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <Zap className="h-4 w-4 text-amber-400" />
        <div className="flex flex-col">
          <span className="text-xs font-mono font-semibold text-amber-300 tracking-wider">
            MODULO ALTERNATIVO — Sperimentale
          </span>
          <span className="text-[10px] font-mono text-amber-400/70">
            In uso da mercoledì 18 marzo 2026
          </span>
        </div>
      </div>

      {/* Page tabs */}
      <div className="flex gap-2">
        {[1, 2, 3].map((p) => (
          <button
            key={p}
            onClick={() => setActivePage(p)}
            className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${
              activePage === p
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-card/40 border-border/30 text-muted-foreground hover:bg-card/60"
            }`}
          >
            PAG {p}
          </button>
        ))}
      </div>

      {/* Page canvas */}
      <div className="relative w-full rounded-lg overflow-hidden border border-border/20">
        <img
          src={PAGE_IMAGES[activePage - 1]}
          alt={`Formulario pagina ${activePage}`}
          className="w-full h-auto block"
          draggable={false}
        />

        {/* Overlaid fields */}
        {pageFields.map((field) => {
          const style: React.CSSProperties = {
            position: "absolute",
            left: `${field.x}%`,
            top: `${field.y}%`,
            width: `${field.width}%`,
            height: `${field.height}%`,
          };

          if (field.type === "checkbox") {
            return (
              <label
                key={field.id}
                style={style}
                className="flex items-center justify-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!values[field.id]}
                  onChange={(e) => handleChange(field.id, e.target.checked)}
                  className="w-3/4 h-3/4 accent-primary cursor-pointer"
                  style={{ background: "transparent" }}
                />
              </label>
            );
          }

          if (field.type === "long_text") {
            return (
              <textarea
                key={field.id}
                value={(values[field.id] as string) || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
              style={{
                  ...style,
                  background: "transparent",
                  border: "1px solid rgba(120, 120, 140, 0.35)",
                  borderRadius: "2px",
                  color: "#1a1a2e",
                  fontSize: "clamp(7px, 1.8vw, 11px)",
                  fontFamily: "monospace",
                  padding: "2px 3px",
                  resize: "none",
                  outline: "none",
                  lineHeight: "1.2",
                }}
              />
            );
          }

          return (
            <input
              key={field.id}
              type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
              value={(values[field.id] as string) || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              style={{
                ...style,
                background: "transparent",
                border: "1px solid rgba(120, 120, 140, 0.35)",
                borderRadius: "2px",
                color: "#1a1a2e",
                fontSize: "clamp(7px, 1.8vw, 11px)",
                fontFamily: "monospace",
                padding: "1px 3px",
                outline: "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
