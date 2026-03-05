import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Save, FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { FormFieldPalette, type FieldType } from "@/components/superadmin/FormFieldPalette";
import { FormPageCanvas } from "@/components/superadmin/FormPageCanvas";
import type { FormField } from "@/components/superadmin/FormFieldOverlay";
import logoDragon from "@/assets/logo-dragon.png";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";

const PAGES = [
  { num: 1, src: pag1 },
  { num: 2, src: pag2 },
  { num: 3, src: pag3 },
];

const DEFAULT_SIZES: Record<FieldType, { w: number; h: number }> = {
  date: { w: 10, h: 2.5 },
  time: { w: 8, h: 2.5 },
  short_text: { w: 15, h: 2.5 },
  long_text: { w: 25, h: 4 },
};

const ALLOWED_EMAIL = "superadmin@zoli.live";

export default function SuperAdminFormEditor() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Template FIR");
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isLoading) {
      const e = user?.email?.toLowerCase() ?? "";
      if (!user || !isAdmin || e !== ALLOWED_EMAIL) {
        navigate("/superadmin", { replace: true });
      }
    }
  }, [user, isAdmin, isLoading, navigate]);

  // Load template list
  useEffect(() => {
    supabase.from("fir_form_templates").select("id, name").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setTemplates(data); });
  }, []);

  const addField = useCallback((type: FieldType, page: number, x: number, y: number) => {
    const id = crypto.randomUUID();
    const size = DEFAULT_SIZES[type];
    const newField: FormField = {
      id, name: "", type, page, x, y,
      width: size.w, height: size.h, locked: false,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(id);
  }, []);

  const updateField = useCallback((updated: FormField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }, [selectedFieldId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (templateId) {
        const { error } = await supabase.from("fir_form_templates")
          .update({ name: templateName, fields: fields as any, updated_at: new Date().toISOString() })
          .eq("id", templateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("fir_form_templates")
          .insert({ name: templateName, fields: fields as any })
          .select("id").single();
        if (error) throw error;
        setTemplateId(data.id);
      }
      toast.success("Template salvato!");
      // Refresh list
      const { data } = await supabase.from("fir_form_templates").select("id, name").order("created_at", { ascending: false });
      if (data) setTemplates(data);
    } catch (err: any) {
      toast.error("Errore salvataggio: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: string) => {
    const { data, error } = await supabase.from("fir_form_templates").select("*").eq("id", id).single();
    if (error || !data) { toast.error("Errore caricamento"); return; }
    setTemplateId(data.id);
    setTemplateName(data.name);
    setFields((data.fields as any) || []);
    setSelectedFieldId(null);
    toast.success("Template caricato");
  };

  const handleNew = () => {
    setTemplateId(null);
    setTemplateName("Nuovo Template");
    setFields([]);
    setSelectedFieldId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src={logoDragon} alt="" className="h-16 w-16 animate-pulse" />
      </div>
    );
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/super")} className="p-1.5 rounded hover:bg-secondary/50 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="font-display text-sm tracking-wider">EDITOR FORMULARIO FIR</span>
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="ml-4 px-2 py-1 text-sm bg-secondary/30 border border-border rounded w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleNew} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary/50 transition-all">
            <Plus size={14} /> Nuovo
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50">
            <Save size={14} /> {saving ? "Salvo..." : "Salva"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: palette + templates + field props */}
        <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto shrink-0 space-y-6">
          <FormFieldPalette />

          {/* Field properties */}
          {selectedField && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Proprietà</h3>
              <div className="text-xs space-y-1.5">
                <div>
                  <label className="text-muted-foreground">Nome</label>
                  <input value={selectedField.name} onChange={(e) => updateField({ ...selectedField, name: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1 text-xs bg-secondary/30 border border-border rounded" placeholder="es: codice_eer" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-muted-foreground">Tipo</label>
                    <div className="mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs">{selectedField.type}</div>
                  </div>
                  <div className="flex-1">
                    <label className="text-muted-foreground">Pag.</label>
                    <div className="mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs">{selectedField.page}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-muted-foreground">X%</label>
                    <div className="mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs">{selectedField.x.toFixed(1)}</div>
                  </div>
                  <div className="flex-1">
                    <label className="text-muted-foreground">Y%</label>
                    <div className="mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs">{selectedField.y.toFixed(1)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-muted-foreground">W%</label>
                    <input type="number" step="0.5" value={selectedField.width.toFixed(1)}
                      onChange={(e) => updateField({ ...selectedField, width: Math.max(2, parseFloat(e.target.value) || 2) })}
                      className="w-full mt-0.5 px-2 py-1 text-xs bg-secondary/30 border border-border rounded" />
                  </div>
                  <div className="flex-1">
                    <label className="text-muted-foreground">H%</label>
                    <input type="number" step="0.5" value={selectedField.height.toFixed(1)}
                      onChange={(e) => updateField({ ...selectedField, height: Math.max(1, parseFloat(e.target.value) || 1) })}
                      className="w-full mt-0.5 px-2 py-1 text-xs bg-secondary/30 border border-border rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-muted-foreground">Bloccato</label>
                  <input type="checkbox" checked={selectedField.locked}
                    onChange={(e) => updateField({ ...selectedField, locked: e.target.checked })} />
                </div>
              </div>
            </div>
          )}

          {/* Saved templates */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen size={14} /> Template Salvati
            </h3>
            {templates.length === 0 && <p className="text-xs text-muted-foreground">Nessun template</p>}
            {templates.map((t) => (
              <button key={t.id} onClick={() => handleLoad(t.id)}
                className={`w-full text-left px-2 py-1.5 text-xs rounded border transition-all ${t.id === templateId ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"}`}>
                {t.name}
              </button>
            ))}
          </div>

          {/* Field count */}
          <div className="text-xs text-muted-foreground">
            {fields.length} campi posizionati
          </div>
        </aside>

        {/* Main canvas area */}
        <main className="flex-1 overflow-y-auto p-4">
          {PAGES.map((p) => (
            <FormPageCanvas
              key={p.num}
              pageNumber={p.num}
              imageSrc={p.src}
              fields={fields.filter((f) => f.page === p.num)}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onUpdateField={updateField}
              onDeleteField={deleteField}
              onAddField={addField}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
