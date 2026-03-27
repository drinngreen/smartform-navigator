import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Zap, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
function normalizeFieldName(fieldName: string): string {
  return fieldName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hasTokens(fieldName: string, tokens: string[]): boolean {
  const normalized = normalizeFieldName(fieldName);
  const parts = normalized.split("_").filter(Boolean);
  return tokens.every((token) => parts.includes(token));
}

function findFieldByTokens(fields: TemplateField[], tokens: string[]): TemplateField | undefined {
  return fields.find((field) => hasTokens(field.name, tokens));
}

function isProduttoreDenominationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["denominazione", "produttore"]);
}

function isDestinatarioDenominationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["denominazione", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreCfField(fieldName: string): boolean {
  return hasTokens(fieldName, ["codice", "fiscale", "produttore"]);
}

function isDestinatarioCfField(fieldName: string): boolean {
  return hasTokens(fieldName, ["codice", "fiscale", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreAddressField(fieldName: string): boolean {
  return hasTokens(fieldName, ["unita", "locale", "produttore"]);
}

function isDestinatarioAddressField(fieldName: string): boolean {
  return hasTokens(fieldName, ["unita", "locale", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreAuthorizationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["numero", "aut", "comunicazione", "produttore"]);
}

function isDestinatarioAuthorizationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["numero", "aut", "comunicazione", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreAuthorizationTypeField(fieldName: string): boolean {
  return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "produttore"]);
}

function isDestinatarioAuthorizationTypeField(fieldName: string): boolean {
  return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function matchesSoggettoSearch(soggetto: Soggetto, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [soggetto.nome, soggetto.cf, soggetto.indirizzo, soggetto.piva, soggetto.autorizzazione]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedQuery));
}

function buildSoggettoUpdates(fields: TemplateField[], soggetto: Soggetto, target: "produttore" | "destinatario") {
  const updates: Record<string, string> = {};

  fields.forEach((field) => {
    const normalizedName = normalizeFieldName(field.name);

    if (target === "produttore") {
      if (normalizedName.includes("nuovo_trasportatore") || normalizedName.includes("originale")) return;

      if (isProduttoreDenominationField(field.name)) updates[field.id] = soggetto.nome;
      else if (isProduttoreCfField(field.name)) updates[field.id] = soggetto.cf;
      else if (isProduttoreAddressField(field.name)) updates[field.id] = soggetto.indirizzo;
      else if (isProduttoreAuthorizationField(field.name)) updates[field.id] = soggetto.autorizzazione ?? "";
      else if (isProduttoreAuthorizationTypeField(field.name)) updates[field.id] = soggetto.tipoAut ?? "";
    }

    if (target === "destinatario") {
      if (normalizedName.includes("secondo_destinatario")) return;

      if (isDestinatarioDenominationField(field.name)) updates[field.id] = soggetto.nome;
      else if (isDestinatarioCfField(field.name)) updates[field.id] = soggetto.cf;
      else if (isDestinatarioAddressField(field.name)) updates[field.id] = soggetto.indirizzo;
      else if (isDestinatarioAuthorizationField(field.name)) updates[field.id] = soggetto.autorizzazione ?? "";
      else if (isDestinatarioAuthorizationTypeField(field.name)) updates[field.id] = soggetto.tipoAut ?? "";
    }
  });

  return updates;
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
    () => findFieldByTokens(fields, ["codice", "fiscale", "produttore"]),
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

  const [activeAutocompleteFieldId, setActiveAutocompleteFieldId] = useState<string | null>(null);
  const [userIsTyping, setUserIsTyping] = useState(false);

  const dynamicFontSize = (text: string, baseMax = 11) => {
    const len = text.length;
    if (len <= 20) return `clamp(7px, 1.8vw, ${baseMax}px)`;
    if (len <= 40) return `clamp(6px, 1.4vw, 9px)`;
    if (len <= 60) return `clamp(5px, 1.2vw, 8px)`;
    return `clamp(4px, 1vw, 7px)`;
  };

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
    const updates = buildSoggettoUpdates(fields, soggetto, "produttore");
    setValues((prev) => ({ ...prev, ...updates }));
    setSelectedProduttore(soggetto);
    setActiveAutocompleteFieldId(null);
  }, [fields]);

  const fillDestinatario = useCallback((soggetto: Soggetto) => {
    const updates = buildSoggettoUpdates(fields, soggetto, "destinatario");
    setValues((prev) => ({ ...prev, ...updates }));
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
              const shouldShowAutocomplete = activeAutocompleteFieldId === field.id && userIsTyping && rawValue.length >= 1 && suggestions.length > 0;

              if (isProduttoreAutocomplete || isDestinatarioAutocomplete) {
                return (
                  <div key={field.id} style={style} className="relative overflow-visible">
                    <input
                      type="text"
                      value={rawValue}
                      onChange={(e) => {
                        handleChange(field.id, e.target.value);
                        setActiveAutocompleteFieldId(field.id);
                        setUserIsTyping(true);
                      }}
                      onFocus={() => {
                        setActiveAutocompleteFieldId(field.id);
                        setUserIsTyping(false);
                      }}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setActiveAutocompleteFieldId((current) => (current === field.id ? null : current));
                          setUserIsTyping(false);
                        }, 150);
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "transparent",
                        border: "1px solid rgba(120, 120, 140, 0.35)",
                        borderRadius: "2px",
                        color: "#1a1a2e",
                        fontSize: dynamicFontSize(rawValue),
                        fontFamily: "monospace",
                        padding: "1px 3px",
                        outline: "none",
                      }}
                    />

                    {shouldShowAutocomplete && (
                      <div className="absolute left-0 right-0 top-full z-[80] mt-0.5 max-h-32 overflow-y-auto rounded-md border border-border/40 bg-popover shadow-lg">
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
                            <div className="truncate text-[9px] text-muted-foreground">
                              {suggestion.indirizzo || "Indirizzo non disponibile"}
                              {suggestion.cf ? ` · CF ${suggestion.cf}` : ""}
                              {suggestion.piva ? ` · P.IVA ${suggestion.piva}` : ""}
                            </div>
                          </button>
                        ))}
                        {isProduttoreAutocomplete && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedProduttore(null);
                              setActiveAutocompleteFieldId(null);
                            }}
                            className="block w-full px-2 py-1 text-left font-mono text-[10px] text-accent-foreground transition-colors hover:bg-accent/50"
                          >
                            ✏️ Altro produttore (inserimento libero)
                          </button>
                        )}
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
