import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Upload, FileText, Users, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";

// CER critici con limiti normativi
const CER_CRITICI: Record<string, { label: string; limite_annuo_kg: number }> = {
  "200140": { label: "Metalli", limite_annuo_kg: 200 },
  "200307": { label: "Rifiuti ingombranti", limite_annuo_kg: 300 },
  "200101": { label: "Carta e cartone", limite_annuo_kg: 500 },
  "200110": { label: "Abbigliamento", limite_annuo_kg: 200 },
  "200140-RA": { label: "Rame", limite_annuo_kg: 100 },
  "200140-PI": { label: "Piombo", limite_annuo_kg: 50 },
};

export function DevPrivatiModule() {
  const queryClient = useQueryClient();
  const [searchPrivato, setSearchPrivato] = useState("");
  const [selectedPrivatoId, setSelectedPrivatoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch privati
  const { data: privati } = useQuery({
    queryKey: ["dev-privati", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anagrafica_privati")
        .select("*")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("attivo", true)
        .order("cognome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch conferimenti for limit check
  const { data: conferimenti } = useQuery({
    queryKey: ["dev-conferimenti-anno", MULTY_TENANT_ID],
    queryFn: async () => {
      const annoCorrente = new Date().getFullYear();
      const { data, error } = await supabase
        .from("privati_conferimenti")
        .select("privato_id, cer, kg_pesati, data")
        .eq("tenant_id", MULTY_TENANT_ID)
        .gte("data", `${annoCorrente}-01-01`);
      if (error) throw error;
      return data;
    },
  });

  // Fetch documenti for selected privato
  const { data: documenti } = useQuery({
    queryKey: ["dev-documenti", selectedPrivatoId],
    queryFn: async () => {
      if (!selectedPrivatoId) return [];
      const { data, error } = await supabase
        .from("documenti_privati")
        .select("*")
        .eq("anagrafica_id", selectedPrivatoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPrivatoId,
  });

  // Upload document
  const uploadDoc = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedPrivatoId) throw new Error("Seleziona un privato");
      const path = `${MULTY_TENANT_ID}/${selectedPrivatoId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documenti-privati").upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("documenti_privati").insert({
        anagrafica_id: selectedPrivatoId,
        tenant_id: MULTY_TENANT_ID,
        nome_file: file.name,
        storage_path: path,
        tipo_documento: "documento_identita",
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-documenti"] });
      toast.success("Documento caricato");
    },
    onError: (e) => toast.error("Errore upload: " + e.message),
  });

  // Calculate CER usage per privato
  const getCerUsage = (privatoId: string) => {
    if (!conferimenti) return {};
    const usage: Record<string, number> = {};
    for (const c of conferimenti) {
      if (c.privato_id === privatoId) {
        usage[c.cer] = (usage[c.cer] || 0) + Number(c.kg_pesati);
      }
    }
    return usage;
  };

  const filteredPrivati = privati?.filter(p =>
    !searchPrivato ||
    `${p.nome} ${p.cognome} ${p.codice_fiscale}`.toLowerCase().includes(searchPrivato.toLowerCase())
  );

  const selectedPrivato = privati?.find(p => p.id === selectedPrivatoId);
  const selectedUsage = selectedPrivatoId ? getCerUsage(selectedPrivatoId) : {};

  return (
    <div className="space-y-4">
      {/* Alert Limiti CER */}
      <Card className="bg-red-950/30 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Codici CER Critici — Limiti Normativi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(CER_CRITICI).map(([cer, info]) => (
              <div key={cer} className="flex items-center gap-2 text-sm p-2 rounded bg-card/30 border border-border/20">
                <span className="font-mono text-amber-300">{cer}</span>
                <span className="text-muted-foreground">{info.label}</span>
                <span className="ml-auto text-red-400 font-bold">{info.limite_annuo_kg} kg/anno</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Cerca privato (nome, cognome, CF)..."
          value={searchPrivato}
          onChange={(e) => setSearchPrivato(e.target.value)}
          className="max-w-md bg-card/60 border-border/50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lista Privati */}
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <CardTitle className="text-emerald-400 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Anagrafica Privati ({filteredPrivati?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {filteredPrivati?.map((p) => {
              const usage = getCerUsage(p.id);
              const hasWarning = Object.entries(usage).some(([cer, kg]) =>
                CER_CRITICI[cer] && kg >= CER_CRITICI[cer].limite_annuo_kg * 0.8
              );
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPrivatoId(p.id)}
                  className={`p-3 rounded cursor-pointer mb-1 border transition-all ${
                    selectedPrivatoId === p.id
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-card/30 border-border/10 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{p.cognome} {p.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{p.codice_fiscale}</span>
                    </div>
                    {hasWarning && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.tipo_utenza} · {p.comune_residenza || "-"}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selectedPrivato ? (
            <>
              {/* CER Usage with alerts */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm">
                    Consumi CER Anno — {selectedPrivato.cognome} {selectedPrivato.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(selectedUsage).length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nessun conferimento quest'anno</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(selectedUsage).map(([cer, kg]) => {
                        const critico = CER_CRITICI[cer];
                        const pct = critico ? (kg / critico.limite_annuo_kg) * 100 : 0;
                        const isOver = critico && kg >= critico.limite_annuo_kg;
                        const isWarn = critico && pct >= 80;
                        return (
                          <div key={cer} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-mono">{cer} {critico ? `(${critico.label})` : ""}</span>
                              <span className={isOver ? "text-red-400 font-bold" : isWarn ? "text-amber-400" : ""}>
                                {kg.toLocaleString("it-IT")} kg {critico ? `/ ${critico.limite_annuo_kg} kg` : ""}
                              </span>
                            </div>
                            {critico && (
                              <div className="h-2 bg-card/60 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            )}
                            {isOver && (
                              <div className="flex items-center gap-1 text-red-400 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                LIMITE SUPERATO — Operazione bloccata
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documenti */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documenti Scansionati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadDoc.mutate(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadDoc.isPending}
                    className="gap-2 mb-3 border-emerald-500/30 text-emerald-400"
                  >
                    <Upload className="h-4 w-4" />
                    Carica Documento
                  </Button>
                  {documenti?.length ? (
                    <div className="space-y-1">
                      {documenti.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-sm p-2 rounded bg-card/30">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{d.nome_file}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(d.created_at).toLocaleDateString("it-IT")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">Nessun documento caricato</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card/60 border-border/30">
              <CardContent className="p-8 text-center text-muted-foreground">
                Seleziona un privato dalla lista per visualizzare i dettagli
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
