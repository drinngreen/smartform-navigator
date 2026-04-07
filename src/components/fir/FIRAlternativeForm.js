import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Zap, ZoomIn, ZoomOut, RotateCcw, Printer } from "lucide-react";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";
import { GLOBAL_RECO, MULTYPROGET, NIYOL, DESTINATARI } from "@/data/anagrafiche";
import { FIRRentriActions } from "./FIRRentriActions";
const PAGE_IMAGES = [pag1, pag2, pag3];
const TENANT_MAP = {
    global: { cliente: "global", preset: GLOBAL_RECO },
    multyproget: { cliente: "multy", preset: MULTYPROGET },
    "multyproget-intermediario": { cliente: "multy", preset: MULTYPROGET },
    "multyproget-impianto": { cliente: "multy", preset: MULTYPROGET },
    niyol: { cliente: "niyol", preset: NIYOL },
};
const ALL_PRODUTTORI = [GLOBAL_RECO, MULTYPROGET, NIYOL];
function normalizeFieldName(fieldName) {
    return fieldName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
function hasTokens(fieldName, tokens) {
    const normalized = normalizeFieldName(fieldName);
    const parts = normalized.split("_").filter(Boolean);
    return tokens.every((token) => parts.includes(token));
}
function findFieldByTokens(fields, tokens) {
    return fields.find((field) => hasTokens(field.name, tokens));
}
function isProduttoreDenominationField(fieldName) {
    return hasTokens(fieldName, ["denominazione", "produttore"]);
}
function isDestinatarioDenominationField(fieldName) {
    return hasTokens(fieldName, ["denominazione", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreCfField(fieldName) {
    return hasTokens(fieldName, ["codice", "fiscale", "produttore"]);
}
function isDestinatarioCfField(fieldName) {
    return hasTokens(fieldName, ["codice", "fiscale", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreAddressField(fieldName) {
    return hasTokens(fieldName, ["unita", "locale", "produttore"]);
}
function isDestinatarioAddressField(fieldName) {
    return hasTokens(fieldName, ["unita", "locale", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreAuthorizationField(fieldName) {
    return hasTokens(fieldName, ["numero", "aut", "comunicazione", "produttore"]);
}
function isDestinatarioAuthorizationField(fieldName) {
    return hasTokens(fieldName, ["numero", "aut", "comunicazione", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreAuthorizationTypeField(fieldName) {
    return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "produttore"]);
}
function isDestinatarioAuthorizationTypeField(fieldName) {
    return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function matchesSoggettoSearch(soggetto, query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery)
        return true;
    return [soggetto.nome, soggetto.cf, soggetto.indirizzo, soggetto.piva, soggetto.autorizzazione]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
}
function buildSoggettoUpdates(fields, soggetto, target) {
    const updates = {};
    fields.forEach((field) => {
        const normalizedName = normalizeFieldName(field.name);
        if (target === "produttore") {
            if (normalizedName.includes("nuovo_trasportatore") || normalizedName.includes("originale"))
                return;
            if (isProduttoreDenominationField(field.name))
                updates[field.id] = soggetto.nome;
            else if (isProduttoreCfField(field.name))
                updates[field.id] = soggetto.cf;
            else if (isProduttoreAddressField(field.name))
                updates[field.id] = soggetto.indirizzo;
            else if (isProduttoreAuthorizationField(field.name))
                updates[field.id] = soggetto.autorizzazione ?? "";
            else if (isProduttoreAuthorizationTypeField(field.name))
                updates[field.id] = soggetto.tipoAut ?? "";
        }
        if (target === "destinatario") {
            if (normalizedName.includes("secondo_destinatario"))
                return;
            if (isDestinatarioDenominationField(field.name))
                updates[field.id] = soggetto.nome;
            else if (isDestinatarioCfField(field.name))
                updates[field.id] = soggetto.cf;
            else if (isDestinatarioAddressField(field.name))
                updates[field.id] = soggetto.indirizzo;
            else if (isDestinatarioAuthorizationField(field.name))
                updates[field.id] = soggetto.autorizzazione ?? "";
            else if (isDestinatarioAuthorizationTypeField(field.name))
                updates[field.id] = soggetto.tipoAut ?? "";
        }
    });
    return updates;
}
export function FIRAlternativeForm({ presetNumeroFir, printOnly, onPrinted } = {}) {
    const [fields, setFields] = useState([]);
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [activePage, setActivePage] = useState(1);
    const [selectedProduttore, setSelectedProduttore] = useState(null);
    const location = useLocation();
    const params = useParams();
    const tenantContext = useMemo(() => {
        if (params.context) {
            if (params.context.includes("niyol"))
                return "niyol";
            if (params.context.includes("multy"))
                return "multyproget";
            if (params.context.includes("global"))
                return "global";
        }
        if (location.pathname.includes("/mn/app/niyol"))
            return "niyol";
        if (location.pathname.includes("/mn/app/multyproget"))
            return "multyproget";
        if (location.pathname.includes("/app/"))
            return "global";
        if (location.pathname.includes("/mn/"))
            return "multyproget";
        return "global";
    }, [location.pathname, params.context]);
    const tenantInfo = TENANT_MAP[tenantContext] || TENANT_MAP.global;
    const rentriCliente = tenantInfo.cliente;
    const tenantPreset = tenantInfo.preset;
    const orderedProduttori = useMemo(() => [tenantPreset, ...ALL_PRODUTTORI.filter((p) => p.cf !== tenantPreset.cf)], [tenantPreset]);
    const produttoreDenomField = useMemo(() => fields.find((field) => isProduttoreDenominationField(field.name)), [fields]);
    const produttoreCfField = useMemo(() => findFieldByTokens(fields, ["codice", "fiscale", "produttore"]), [fields]);
    const currentProduttoreNome = produttoreDenomField ? String(values[produttoreDenomField.id] ?? "").trim() : "";
    const currentProduttoreCf = produttoreCfField ? String(values[produttoreCfField.id] ?? "").trim() : "";
    const isOwnProduction = useMemo(() => {
        if (!currentProduttoreNome && !currentProduttoreCf && !selectedProduttore)
            return true;
        const referenceCf = selectedProduttore?.cf?.trim() || currentProduttoreCf;
        const referenceName = selectedProduttore?.nome?.trim() || currentProduttoreNome;
        if (referenceCf)
            return referenceCf === tenantPreset.cf;
        return referenceName.toLowerCase() === tenantPreset.nome.toLowerCase();
    }, [currentProduttoreCf, currentProduttoreNome, selectedProduttore, tenantPreset]);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastTouchDist, setLastTouchDist] = useState(null);
    const containerRef = useRef(null);
    const [activeAutocompleteFieldId, setActiveAutocompleteFieldId] = useState(null);
    const [confirmedFieldIds, setConfirmedFieldIds] = useState(new Set());
    const dynamicFontSize = (text, baseMax = 11) => {
        const len = text.length;
        if (len <= 20)
            return `clamp(7px, 1.8vw, ${baseMax}px)`;
        if (len <= 40)
            return `clamp(6px, 1.4vw, 9px)`;
        if (len <= 60)
            return `clamp(5px, 1.2vw, 8px)`;
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
                const loadedFields = data.fields;
                setFields(loadedFields);
                // Pre-fill numero FIR if provided
                if (presetNumeroFir) {
                    const numeroField = loadedFields.find(f => hasTokens(f.name, ["numero", "formulario"]));
                    if (numeroField) {
                        setValues(prev => ({ ...prev, [numeroField.id]: presetNumeroFir }));
                    }
                }
            }
            if (error)
                console.warn("[FIRAlternativeForm]", error.message);
            setLoading(false);
        });
    }, [presetNumeroFir]);
    useEffect(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
    }, [activePage]);
    const handleChange = (id, val) => {
        const isProducerField = produttoreDenomField?.id === id || produttoreCfField?.id === id;
        setValues((prev) => ({ ...prev, [id]: val }));
        if (isProducerField && typeof val === "string") {
            setSelectedProduttore(null);
        }
    };
    const fillProduttore = useCallback((soggetto) => {
        const updates = buildSoggettoUpdates(fields, soggetto, "produttore");
        setValues((prev) => ({ ...prev, ...updates }));
        setSelectedProduttore(soggetto);
        setActiveAutocompleteFieldId(null);
        setConfirmedFieldIds((prev) => {
            const next = new Set(prev);
            Object.keys(updates).forEach((k) => next.add(k));
            return next;
        });
    }, [fields]);
    const fillDestinatario = useCallback((soggetto) => {
        const updates = buildSoggettoUpdates(fields, soggetto, "destinatario");
        setValues((prev) => ({ ...prev, ...updates }));
        setActiveAutocompleteFieldId(null);
        setConfirmedFieldIds((prev) => {
            const next = new Set(prev);
            Object.keys(updates).forEach((k) => next.add(k));
            return next;
        });
    }, [fields]);
    const zoomIn = () => setScale((s) => Math.min(s + 0.3, 4));
    const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
    const resetZoom = () => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
    };
    const handleMouseDown = (e) => {
        if (scale <= 1)
            return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    };
    const handleMouseMove = (e) => {
        if (!isDragging)
            return;
        setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            setLastTouchDist(dist);
        }
        else if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
        }
    };
    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && lastTouchDist !== null) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const delta = (dist - lastTouchDist) * 0.008;
            setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
            setLastTouchDist(dist);
        }
        else if (e.touches.length === 1 && isDragging) {
            setTranslate({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
        }
    };
    const handleTouchEnd = () => {
        setLastTouchDist(null);
        setIsDragging(false);
    };
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
    };
    const pageFields = fields.filter((f) => f.page === activePage);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx("div", { className: "text-primary animate-pulse text-sm font-mono", children: "Caricamento template..." }) }));
    }
    if (fields.length === 0) {
        return (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx("div", { className: "text-muted-foreground text-sm font-mono", children: "Nessun template salvato" }) }));
    }
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30", children: [_jsx(Zap, { className: "h-4 w-4 text-amber-400" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-mono font-semibold text-amber-300 tracking-wider", children: "MODULO ALTERNATIVO \u2014 Sperimentale" }), _jsx("span", { className: "text-[10px] font-mono text-amber-400/70", children: "In uso da mercoled\u00EC 18 marzo 2026" })] })] }), _jsx("div", { className: "flex gap-2", children: [1, 2, 3].map((p) => (_jsxs("button", { onClick: () => setActivePage(p), className: `flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${activePage === p
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-card/40 border-border/30 text-muted-foreground hover:bg-card/60"}`, children: ["PAG ", p] }, p))) }), _jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("button", { onClick: zoomOut, className: "p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all", children: _jsx(ZoomOut, { className: "h-4 w-4 text-muted-foreground" }) }), _jsxs("span", { className: "text-[10px] font-mono text-muted-foreground min-w-[40px] text-center", children: [Math.round(scale * 100), "%"] }), _jsx("button", { onClick: zoomIn, className: "p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all", children: _jsx(ZoomIn, { className: "h-4 w-4 text-muted-foreground" }) }), _jsx("button", { onClick: resetZoom, className: "p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all", children: _jsx(RotateCcw, { className: "h-3.5 w-3.5 text-muted-foreground" }) })] }), _jsx("div", { ref: containerRef, className: "relative w-full rounded-lg overflow-hidden border border-border/20", style: { touchAction: "none" }, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: handleMouseUp, onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onWheel: handleWheel, children: _jsx("div", { style: {
                        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                        transformOrigin: "top left",
                        transition: isDragging ? "none" : "transform 0.15s ease-out",
                        cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                    }, children: _jsxs("div", { className: "relative", children: [_jsx("img", { src: PAGE_IMAGES[activePage - 1], alt: `Formulario pagina ${activePage}`, className: "w-full h-auto block", draggable: false }), pageFields.map((field) => {
                                const style = {
                                    position: "absolute",
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    width: `${field.width}%`,
                                    height: `${field.height}%`,
                                };
                                if (field.type === "checkbox") {
                                    return (_jsx("label", { style: style, className: "flex items-center justify-center cursor-pointer", children: _jsx("input", { type: "checkbox", checked: !!values[field.id], onChange: (e) => handleChange(field.id, e.target.checked), className: "w-3/4 h-3/4 accent-primary cursor-pointer", style: { background: "transparent" } }) }, field.id));
                                }
                                if (field.type === "long_text") {
                                    return (_jsx("textarea", { value: values[field.id] || "", onChange: (e) => handleChange(field.id, e.target.value), style: {
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
                                        } }, field.id));
                                }
                                const isProduttoreAutocomplete = isProduttoreDenominationField(field.name);
                                const isDestinatarioAutocomplete = isDestinatarioDenominationField(field.name);
                                const rawValue = String(values[field.id] || "");
                                const suggestions = isProduttoreAutocomplete
                                    ? orderedProduttori.filter((item) => matchesSoggettoSearch(item, rawValue))
                                    : isDestinatarioAutocomplete
                                        ? DESTINATARI.filter((item) => matchesSoggettoSearch(item, rawValue)).slice(0, 12)
                                        : [];
                                const isConfirmed = confirmedFieldIds.has(field.id);
                                const shouldShowAutocomplete = activeAutocompleteFieldId === field.id && !isConfirmed && suggestions.length > 0;
                                if (isProduttoreAutocomplete || isDestinatarioAutocomplete) {
                                    return (_jsxs("div", { style: style, className: "relative overflow-visible", children: [_jsx("input", { type: "text", value: rawValue, onChange: (e) => {
                                                    handleChange(field.id, e.target.value);
                                                    setActiveAutocompleteFieldId(field.id);
                                                    setConfirmedFieldIds((prev) => { const next = new Set(prev); next.delete(field.id); return next; });
                                                }, onFocus: () => setActiveAutocompleteFieldId(field.id), onBlur: () => {
                                                    window.setTimeout(() => {
                                                        setActiveAutocompleteFieldId((current) => (current === field.id ? null : current));
                                                    }, 150);
                                                }, style: {
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
                                                } }), shouldShowAutocomplete && (_jsxs("div", { className: "absolute left-0 right-0 top-full z-[80] mt-0.5 max-h-32 overflow-y-auto rounded-md border border-border/40 bg-popover shadow-lg", children: [suggestions.map((suggestion) => (_jsxs("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                                            if (isProduttoreAutocomplete) {
                                                                fillProduttore(suggestion);
                                                            }
                                                            else {
                                                                fillDestinatario(suggestion);
                                                            }
                                                        }, className: "block w-full border-b border-border/20 px-2 py-1 text-left font-mono text-[10px] text-foreground transition-colors hover:bg-accent/50 last:border-b-0", children: [_jsx("div", { className: "truncate font-semibold", children: suggestion.nome }), _jsxs("div", { className: "truncate text-[9px] text-muted-foreground", children: [suggestion.indirizzo || "Indirizzo non disponibile", suggestion.cf ? ` · CF ${suggestion.cf}` : "", suggestion.piva ? ` · P.IVA ${suggestion.piva}` : ""] })] }, `${field.id}-${suggestion.cf}-${suggestion.nome}`))), isProduttoreAutocomplete && (_jsx("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                                            setSelectedProduttore(null);
                                                            setActiveAutocompleteFieldId(null);
                                                        }, className: "block w-full px-2 py-1 text-left font-mono text-[10px] text-accent-foreground transition-colors hover:bg-accent/50", children: "\u270F\uFE0F Altro produttore (inserimento libero)" }))] }))] }, field.id));
                                }
                                return (_jsx("input", { type: field.type === "date" ? "date" : field.type === "time" ? "time" : "text", value: values[field.id] || "", onChange: (e) => handleChange(field.id, e.target.value), style: {
                                        ...style,
                                        background: "transparent",
                                        border: "1px solid rgba(120, 120, 140, 0.35)",
                                        borderRadius: "2px",
                                        color: "#1a1a2e",
                                        fontSize: dynamicFontSize(String(values[field.id] || "")),
                                        fontFamily: "monospace",
                                        padding: "1px 3px",
                                        outline: "none",
                                    } }, field.id));
                            })] }) }) }), printOnly ? (_jsx("div", { className: "flex justify-end gap-3 pt-2", children: _jsxs("button", { onClick: () => {
                        const printWindow = window.open("", "_blank");
                        if (!printWindow)
                            return;
                        const container = containerRef.current;
                        if (!container)
                            return;
                        const cloned = container.cloneNode(true);
                        // Remove borders from inputs and make them look printed
                        cloned.querySelectorAll("input, textarea").forEach((el) => {
                            const htmlEl = el;
                            htmlEl.style.border = "none";
                            htmlEl.style.outline = "none";
                            htmlEl.style.background = "transparent";
                            // Replace inputs with spans for print
                            const span = document.createElement("span");
                            span.textContent = htmlEl.value;
                            span.style.cssText = htmlEl.style.cssText;
                            span.style.position = "absolute";
                            span.style.left = htmlEl.style.left;
                            span.style.top = htmlEl.style.top;
                            span.style.width = htmlEl.style.width;
                            span.style.height = htmlEl.style.height;
                            htmlEl.parentNode?.replaceChild(span, htmlEl);
                        });
                        // Build all 3 pages for print
                        const allPagesHtml = [1, 2, 3].map(pageNum => {
                            const pageContainer = document.createElement("div");
                            pageContainer.style.cssText = "position:relative;page-break-after:always;";
                            const img = document.createElement("img");
                            img.src = PAGE_IMAGES[pageNum - 1];
                            img.style.cssText = "width:100%;height:auto;display:block;";
                            pageContainer.appendChild(img);
                            // Render fields for this page
                            fields.filter(f => f.page === pageNum).forEach(field => {
                                const val = String(values[field.id] || "");
                                if (!val)
                                    return;
                                const span = document.createElement("span");
                                span.textContent = val;
                                span.style.cssText = `position:absolute;left:${field.x}%;top:${field.y}%;width:${field.width}%;height:${field.height}%;font-family:monospace;font-size:clamp(7px,1.8vw,11px);color:#1a1a2e;overflow:hidden;white-space:nowrap;padding:1px 3px;`;
                                pageContainer.appendChild(span);
                            });
                            return pageContainer.outerHTML;
                        }).join("");
                        printWindow.document.write(`<html><head><title>FIR ${presetNumeroFir || ""}</title><style>@media print{@page{margin:5mm;size:A4;}body{margin:0;}}body{margin:0;padding:0;}</style></head><body>${allPagesHtml}</body></html>`);
                        printWindow.document.close();
                        setTimeout(() => {
                            printWindow.print();
                            onPrinted?.();
                        }, 600);
                    }, className: "px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 transition-colors flex items-center gap-2", children: [_jsx(Printer, { className: "h-4 w-4" }), " STAMPA TUTTE LE PAGINE"] }) })) : (_jsx(FIRRentriActions, { cliente: rentriCliente, formData: values, firmaComeProduttore: isOwnProduction, onEmissioneSuccess: (res) => {
                    console.log("[FIR] Emissione success:", res);
                } }))] }));
}
