import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Zap, ZoomIn, ZoomOut, RotateCcw, ChevronDown } from "lucide-react";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";
import { GLOBAL_RECO, MULTYPROGET, NIYOL, DESTINATARI, type Soggetto } from "@/data/anagrafiche";
import { FIRRentriActions } from "./FIRRentriActions";
import type { RentriCliente } from "@/lib/rentriVpsApi";

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

const TENANT_MAP: Record<string, { cliente: RentriCliente; preset: Soggetto }> = {
  global: { cliente: "global", preset: GLOBAL_RECO },
  multyproget: { cliente: "multy", preset: MULTYPROGET },
  "multyproget-intermediario": { cliente: "multy", preset: MULTYPROGET },
  "multyproget-impianto": { cliente: "multy", preset: MULTYPROGET },
  niyol: { cliente: "niyol", preset: NIYOL },
};

const ALL_PRODUTTORI: Soggetto[] = [GLOBAL_RECO, MULTYPROGET, NIYOL];
const PRODUTTORE_PATTERNS = [
  "produttore_denominazione", "produttore_denom", "produttore_nome", "produttore",
  "prod_denom", "prod_nome", "denominazione_produttore",
];
const PRODUTTORE_CF_PATTERNS = [
  "produttore_cf", "produttore_codice_fiscale", "cf_produttore", "prod_cf",
];
const PRODUTTORE_INDIRIZZO_PATTERNS = [
  "produttore_indirizzo", "produttore_ind", "ind_produttore", "prod_indirizzo",
];
const DESTINATARIO_PATTERNS = [
  "destinatario_denominazione", "destinatario_denom", "destinatario_nome", "destinatario",
  "dest_denom", "dest_nome", "denominazione_destinatario",
];
const DESTINATARIO_CF_PATTERNS = [
  "destinatario_cf", "destinatario_codice_fiscale", "cf_destinatario", "dest_cf",
];
const DESTINATARIO_INDIRIZZO_PATTERNS = [
  "destinatario_indirizzo", "destinatario_ind", "ind_destinatario", "dest_indirizzo",
];

function matchesPattern(fieldName: string, patterns: string[]): boolean {
  const lower = fieldName.toLowerCase().replace(/[\s-]/g, "_");
  return patterns.some((p) => lower.includes(p));
}

function findFieldByPattern(fields: TemplateField[], patterns: string[]): TemplateField | undefined {
  return fields.find((f) => matchesPattern(f.name, patterns));
}

function isProduttoreDenominationField(fieldName: string): boolean {
  return matchesPattern(fieldName, PRODUTTORE_PATTERNS)
    && !matchesPattern(fieldName, PRODUTTORE_CF_PATTERNS)
    && !matchesPattern(fieldName, PRODUTTORE_INDIRIZZO_PATTERNS);
}

function isDestinatarioDenominationField(fieldName: string): boolean {
  return matchesPattern(fieldName, DESTINATARIO_PATTERNS)
    && !matchesPattern(fieldName, DESTINATARIO_CF_PATTERNS)
    && !matchesPattern(fieldName, DESTINATARIO_INDIRIZZO_PATTERNS);
}

function matchesSoggettoSearch(soggetto: Soggetto, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [soggetto.nome, soggetto.cf, soggetto.indirizzo]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function FIRAlternativeForm() {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [selectedProduttore, setSelectedProduttore] = useState<Soggetto | null>(null);
  const location = useLocation();
  const params = useParams<{ context?: string }>();

  const tenantContext = useMemo((): string => {
    if (params.context) {
      if (params.context.includes("niyol")) return "niyol";
      if (params.context.includes("multy")) return "multyproget";
      if (params.context.includes("global")) return "global";
    }

    if (location.pathname.includes("/mn/app/niyol")) return "niyol";
    if (location.pathname.includes("/mn/app/multyproget")) return "multyproget";
    if (location.pathname.includes("/app/")) return "global";
    if (location.pathname.includes("/mn/")) return "multyproget";
    return "global";
  }, [location.pathname, params.context]);

  const tenantInfo = TENANT_MAP[tenantContext] || TENANT_MAP.global;
  const rentriCliente = tenantInfo.cliente;
  const tenantPreset = tenantInfo.preset;
  const orderedProduttori = useMemo(
    () => [tenantPreset, ...ALL_PRODUTTORI.filter((p) => p.cf !== tenantPreset.cf)],
    [tenantPreset]
  );

  const produttoreDenomField = useMemo(
    () => fields.find((field) => isProduttoreDenominationField(field.name)),
    [fields]
  );
  const produttoreCfField = useMemo(
    () => findFieldByPattern(fields, PRODUTTORE_CF_PATTERNS),
    [fields]
  );
  const destinatarioDenomField = useMemo(
    () => fields.find((field) => isDestinatarioDenominationField(field.name)),
    [fields]
  );

  const currentProduttoreNome = produttoreDenomField ? String(values[produttoreDenomField.id] ?? "").trim() : "";
  const currentProduttoreCf = produttoreCfField ? String(values[produttoreCfField.id] ?? "").trim() : "";

  const isOwnProduction = useMemo(() => {
    if (!currentProduttoreNome && !currentProduttoreCf && !selectedProduttore) return true;

    const referenceCf = selectedProduttore?.cf?.trim() || currentProduttoreCf;
    const referenceName = selectedProduttore?.nome?.trim() || currentProduttoreNome;

    if (referenceCf) return referenceCf === tenantPreset.cf;
    return referenceName.toLowerCase() === tenantPreset.nome.toLowerCase();
  }, [currentProduttoreCf, currentProduttoreNome, selectedProduttore, tenantPreset]);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showProdDropdown, setShowProdDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [destSearch, setDestSearch] = useState("");
  const [activeAutocompleteFieldId, setActiveAutocompleteFieldId] = useState<string | null>(null);

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

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [activePage]);

  const handleChange = (id: string, val: string | boolean) => {
    const isProducerField = produttoreDenomField?.id === id || produttoreCfField?.id === id;

    setValues((prev) => ({ ...prev, [id]: val }));

    if (isProducerField && typeof val === "string") {
      setSelectedProduttore(null);
    }
  };

  const fillProduttore = useCallback((soggetto: Soggetto) => {
    const updates: Record<string, string> = {};
    const denomField = fields.find((field) => isProduttoreDenominationField(field.name));
    const cfField = findFieldByPattern(fields, PRODUTTORE_CF_PATTERNS);
    const indField = findFieldByPattern(fields, PRODUTTORE_INDIRIZZO_PATTERNS);

    if (denomField) updates[denomField.id] = soggetto.nome;
    if (cfField) updates[cfField.id] = soggetto.cf;
    if (indField) updates[indField.id] = soggetto.indirizzo;

    setValues((prev) => ({ ...prev, ...updates }));
    setSelectedProduttore(soggetto);
    setShowProdDropdown(false);
    setActiveAutocompleteFieldId(null);
  }, [fields]);

  const fillDestinatario = useCallback((soggetto: Soggetto) => {
    const updates: Record<string, string> = {};
    const denomField = fields.find((field) => isDestinatarioDenominationField(field.name));
    const cfField = findFieldByPattern(fields, DESTINATARIO_CF_PATTERNS);
    const indField = findFieldByPattern(fields, DESTINATARIO_INDIRIZZO_PATTERNS);

    if (denomField) updates[denomField.id] = soggetto.nome;
    if (cfField) updates[cfField.id] = soggetto.cf;
    if (indField) updates[indField.id] = soggetto.indirizzo;

    setValues((prev) => ({ ...prev, ...updates }));
    setShowDestDropdown(false);
    setDestSearch("");
    setActiveAutocompleteFieldId(null);
  }, [fields]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.3, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDist(dist);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - lastTouchDist) * 0.008;
      setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
      setLastTouchDist(dist);
    } else if (e.touches.length === 1 && isDragging) {
      setTranslate({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    setLastTouchDist(null);
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
  };

  const pageFields = fields.filter((f) => f.page === activePage);
  const filteredDest = destSearch
    ? DESTINATARI.filter((d) => d.nome.toLowerCase().includes(destSearch.toLowerCase()))
    : DESTINATARI;

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

      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => {
              setShowProdDropdown(!showProdDropdown);
              setShowDestDropdown(false);
            }}
            className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-md border border-border/40 bg-card/60 text-[11px] font-mono text-foreground hover:bg-card/80 transition-all"
          >
            <span className="truncate">👷 Produttore</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
          {showProdDropdown && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {orderedProduttori.map((p, index) => (
                <button
                  key={p.cf}
                  onClick={() => fillProduttore(p)}
                  className={`w-full px-3 py-2 text-left text-xs font-mono hover:bg-primary/10 transition-colors ${index < orderedProduttori.length - 1 ? "border-b border-border/20" : ""} ${p.cf === tenantPreset.cf ? "bg-primary/5" : ""}`}
                >
                  <div className={p.cf === tenantPreset.cf ? "font-semibold text-primary" : "font-semibold text-foreground"}>
                    {p.nome} {p.cf === tenantPreset.cf ? "⭐" : ""}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{p.cf} — {p.indirizzo}</div>
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedProduttore(null);
                  setShowProdDropdown(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-mono hover:bg-amber-500/10 transition-colors text-amber-300"
              >
                ✏️ Altro produttore (inserimento libero)
              </button>
            </div>
          )}
        </div>

        <div className="relative flex-1">
          <button
            onClick={() => {
              setShowDestDropdown(!showDestDropdown);
              setShowProdDropdown(false);
            }}
            className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-md border border-border/40 bg-card/60 text-[11px] font-mono text-foreground hover:bg-card/80 transition-all"
          >
            <span className="truncate">🏭 Destinatario</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
          {showDestDropdown && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-60">
              <div className="sticky top-0 bg-card p-1.5 border-b border-border/30">
                <input
                  type="text"
                  value={destSearch}
                  onChange={(e) => setDestSearch(e.target.value)}
                  placeholder="Cerca impianto..."
                  className="w-full px-2 py-1 text-xs font-mono bg-background/60 border border-border/40 rounded-md text-foreground outline-none"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto max-h-48">
                {filteredDest.map((d, i) => (
                  <button
                    key={`${d.cf}-${i}`}
                    onClick={() => fillDestinatario(d)}
                    className="w-full px-3 py-1.5 text-left text-xs font-mono hover:bg-primary/10 transition-colors border-b border-border/10 last:border-0"
                  >
                    <div className="font-semibold text-foreground truncate">{d.nome}</div>
                    {d.indirizzo && <div className="text-muted-foreground text-[9px] truncate">{d.indirizzo}</div>}
                  </button>
                ))}
                {filteredDest.length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-muted-foreground font-mono">Nessun risultato</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={zoomOut} className="p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-[10px] font-mono text-muted-foreground min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} className="p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all">
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={resetZoom} className="p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all">
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden border border-border/20"
        style={{ touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "top left",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
        >
          <div className="relative">
            <img
              src={PAGE_IMAGES[activePage - 1]}
              alt={`Formulario pagina ${activePage}`}
              className="w-full h-auto block"
              draggable={false}
            />

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

              const isProduttoreAutocomplete = isProduttoreDenominationField(field.name);
              const isDestinatarioAutocomplete = isDestinatarioDenominationField(field.name);
              const rawValue = String(values[field.id] || "");
              const suggestions = isProduttoreAutocomplete
                ? orderedProduttori.filter((item) => matchesSoggettoSearch(item, rawValue))
                : isDestinatarioAutocomplete
                  ? DESTINATARI.filter((item) => matchesSoggettoSearch(item, rawValue)).slice(0, 12)
                  : [];
              const shouldShowAutocomplete = activeAutocompleteFieldId === field.id && suggestions.length > 0;

              if (isProduttoreAutocomplete || isDestinatarioAutocomplete) {
                return (
                  <div key={field.id} style={style} className="overflow-visible">
                    <input
                      type="text"
                      value={rawValue}
                      onChange={(e) => {
                        handleChange(field.id, e.target.value);
                        setActiveAutocompleteFieldId(field.id);
                      }}
                      onFocus={() => setActiveAutocompleteFieldId(field.id)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setActiveAutocompleteFieldId((current) => (current === field.id ? null : current));
                        }, 150);
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
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

                    {shouldShowAutocomplete && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-28 overflow-y-auto rounded-md border border-border/40 bg-popover shadow-lg">
                        {suggestions.map((suggestion) => (
                          <button
                            key={`${field.id}-${suggestion.cf}-${suggestion.nome}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (isProduttoreAutocomplete) {
                                fillProduttore(suggestion);
                              } else {
                                fillDestinatario(suggestion);
                              }
                            }}
                            className="block w-full border-b border-border/20 px-2 py-1 text-left font-mono text-[10px] text-foreground transition-colors hover:bg-accent/50 last:border-b-0"
                          >
                            <div className="truncate font-semibold">{suggestion.nome}</div>
                            <div className="truncate text-[9px] text-muted-foreground">{suggestion.cf} — {suggestion.indirizzo}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
      </div>

      <FIRRentriActions
        cliente={rentriCliente}
        formData={values as Record<string, string | boolean>}
        firmaComeProduttore={isOwnProduction}
        onEmissioneSuccess={(res) => {
          console.log("[FIR] Emissione success:", res);
        }}
      />
    </div>
  );
}
