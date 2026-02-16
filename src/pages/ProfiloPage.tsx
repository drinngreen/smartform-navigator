import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { User, Car, LogOut, Save } from "lucide-react";

export default function ProfiloPage() {
  const { profile, user, signOut, refreshUserData } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    targa_automezzo: profile?.targa_automezzo || "",
    autista_alternativo: profile?.autista_alternativo || "",
  });

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          targa_automezzo: form.targa_automezzo.trim() || null,
          autista_alternativo: form.autista_alternativo.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshUserData();
      toast.success("Profilo aggiornato!");
    } catch (err: any) {
      toast.error(err?.message || "Errore nel salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <h1 className="text-xl font-display font-bold text-foreground tracking-wider">Profilo</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">I tuoi dati</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
        {/* Info card */}
        <div className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">{profile?.nome} {profile?.cognome}</p>
              <p className="text-xs text-muted-foreground font-mono">{profile?.codice_fiscale}</p>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
            <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
              <Car className="h-3 w-3" /> Targa Automezzo
            </label>
            <input
              type="text"
              value={form.targa_automezzo}
              onChange={(e) => setForm({ ...form, targa_automezzo: e.target.value.toUpperCase() })}
              placeholder="AB123CD"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase"
            />
          </div>

          <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
            <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 block">
              Autista Alternativo
            </label>
            <input
              type="text"
              value={form.autista_alternativo}
              onChange={(e) => setForm({ ...form, autista_alternativo: e.target.value })}
              placeholder="Nome e cognome"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {isSaving ? "Salvataggio..." : "Salva Modifiche"}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-display text-sm flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors mt-6"
        >
          <LogOut className="h-4 w-4" /> Esci dall'account
        </button>
      </div>

      <BottomNav />
    </MobileShell>
  );
}
