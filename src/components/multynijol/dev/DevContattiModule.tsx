import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RubricaTab } from "@/components/comunicazioni/RubricaTab";
import { SMSComposer } from "@/components/comunicazioni/SMSComposer";
import { WhatsAppChat } from "@/components/comunicazioni/WhatsAppChat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BookUser, MessageSquare, Phone, Mail, Users, Building2, Search, PhoneCall,
} from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";

export function DevContattiModule() {
  return (
    <Tabs defaultValue="rubrica" className="space-y-4">
      <TabsList className="bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1">
        <TabsTrigger value="rubrica" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <BookUser className="h-4 w-4" /> Rubrica
        </TabsTrigger>
        <TabsTrigger value="anagrafiche" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Users className="h-4 w-4" /> Anagrafiche
        </TabsTrigger>
        <TabsTrigger value="sms" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <MessageSquare className="h-4 w-4" /> SMS
        </TabsTrigger>
        <TabsTrigger value="whatsapp" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Phone className="h-4 w-4" /> WhatsApp
        </TabsTrigger>
        <TabsTrigger value="chiamate" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <PhoneCall className="h-4 w-4" /> Report Chiamate
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rubrica">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <RubricaTab basePath="/mn/admin/dev-multyproget" />
        </div>
      </TabsContent>

      <TabsContent value="anagrafiche">
        <AnagraficheView />
      </TabsContent>

      <TabsContent value="sms">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <SMSComposer />
        </div>
      </TabsContent>

      <TabsContent value="whatsapp">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <WhatsAppChat />
        </div>
      </TabsContent>

      <TabsContent value="chiamate">
        <ReportChiamateView />
      </TabsContent>
    </Tabs>
  );
}

// ─── Anagrafiche Privati + Aziende ───
function AnagraficheView() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"privati" | "aziende">("privati");

  const { data: privati } = useQuery({
    queryKey: ["dev-anagrafiche-privati", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anagrafica_privati")
        .select("*")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("cognome");
      if (error) throw error;
      return data;
    },
  });

  const { data: aziende } = useQuery({
    queryKey: ["dev-anagrafiche-aziende", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const q = search.toLowerCase();

  const filteredPrivati = (privati || []).filter(p =>
    !q || `${p.nome} ${p.cognome} ${p.codice_fiscale} ${p.comune_residenza || ""}`.toLowerCase().includes(q)
  );

  const filteredAziende = (aziende || []).filter(a =>
    !q || `${a.name} ${a.piva} ${a.codice_fiscale || ""} ${a.comune || ""}`.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca nome, CF, P.IVA, comune..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setTab("privati")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "privati" ? "bg-emerald-600 text-white" : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30"}`}>
            <Users className="h-4 w-4 inline mr-1" /> Privati ({filteredPrivati.length})
          </button>
          <button onClick={() => setTab("aziende")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "aziende" ? "bg-emerald-600 text-white" : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30"}`}>
            <Building2 className="h-4 w-4 inline mr-1" /> Aziende ({filteredAziende.length})
          </button>
        </div>
      </div>

      {tab === "privati" ? (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left p-3 text-xs uppercase">Nome</th>
                    <th className="text-left p-3 text-xs uppercase">CF</th>
                    <th className="text-left p-3 text-xs uppercase">Comune</th>
                    <th className="text-left p-3 text-xs uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs uppercase">Telefono</th>
                    <th className="text-left p-3 text-xs uppercase">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrivati.slice(0, 100).map((p) => (
                    <tr key={p.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3 font-medium">{p.cognome} {p.nome}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{p.codice_fiscale}</td>
                      <td className="p-3 text-muted-foreground">{p.comune_residenza || "—"}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">{p.tipo_utenza}</span></td>
                      <td className="p-3 text-muted-foreground">{p.telefono || p.cellulare || "—"}</td>
                      <td className="p-3 text-muted-foreground">{p.email || "—"}</td>
                    </tr>
                  ))}
                  {filteredPrivati.length > 100 && (
                    <tr><td colSpan={6} className="p-3 text-center text-muted-foreground text-xs">... e altri {filteredPrivati.length - 100} risultati</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left p-3 text-xs uppercase">Denominazione</th>
                    <th className="text-left p-3 text-xs uppercase">P.IVA</th>
                    <th className="text-left p-3 text-xs uppercase">CF</th>
                    <th className="text-left p-3 text-xs uppercase">Comune</th>
                    <th className="text-left p-3 text-xs uppercase">Indirizzo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAziende.slice(0, 100).map((a) => (
                    <tr key={a.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{a.piva}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{a.codice_fiscale || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.comune || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.indirizzo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Report Chiamate ───
function ReportChiamateView() {
  const { data: calls, isLoading } = useQuery({
    queryKey: ["dev-calls-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="bg-card/60 border-border/30">
      <CardHeader>
        <CardTitle className="text-emerald-400 flex items-center gap-2">
          <PhoneCall className="h-5 w-5" /> Report Chiamate ({calls?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Caricamento...</p>
        ) : !calls?.length ? (
          <p className="text-muted-foreground text-sm">Nessuna chiamata registrata</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left p-3 text-xs uppercase">Tipo</th>
                  <th className="text-left p-3 text-xs uppercase">Stato</th>
                  <th className="text-left p-3 text-xs uppercase">Durata</th>
                  <th className="text-left p-3 text-xs uppercase">Data</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => {
                  const duration = c.answered_at && c.ended_at
                    ? Math.round((new Date(c.ended_at).getTime() - new Date(c.answered_at).getTime()) / 1000)
                    : null;
                  return (
                    <tr key={c.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${c.call_type === "audio" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>{c.call_type}</span></td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${c.status === "ended" ? "bg-muted text-muted-foreground" : c.status === "answered" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{c.status}</span></td>
                      <td className="p-3 font-mono text-muted-foreground">{duration != null ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(c.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
