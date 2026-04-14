import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonStock } from "@/hooks/dragon/useDragonStock";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Package, Recycle, Plus, Minus, RotateCcw, FileDown, Scissors } from "lucide-react";
import { toast } from "sonner";
import type { DragonWarehouseScope, DragonAdjustmentType, DragonStockMovement, DragonStockBalance } from "@/types/dragon";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
import { DragonMovementDetail } from "@/components/dragon/DragonMovementDetail";
import { DragonNewMovementForm } from "@/components/dragon/DragonNewMovementForm";
import { useNavigate } from "react-router-dom";

export default function DragonMagazzinoPage() {
  const [scope, setScope] = useState<DragonWarehouseScope | undefined>(undefined);
  const { balances, stockMovements, isLoading } = useDragonStock(scope);
  const { items } = useDragonItems();
  const { causes } = useDragonCauses();
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Adjustment state
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    item_id: "",
    adjustment_type: "POSITIVE" as DragonAdjustmentType,
    quantity: "",
    reason: "",
    warehouse_scope: "WASTE" as DragonWarehouseScope,
  });
  const [submitting, setSubmitting] = useState(false);

  // New movement form
  const [showNewMov, setShowNewMov] = useState(false);

  // Movement detail dialog
  const [detailMov, setDetailMov] = useState<DragonStockMovement | null>(null);

  // Ledger filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterItemId, setFilterItemId] = useState("");
  const [filterCauseId, setFilterCauseId] = useState("");

  const filteredMovements = stockMovements.filter(m => {
    if (filterDateFrom && m.movement_date < filterDateFrom) return false;
    if (filterDateTo && m.movement_date > filterDateTo) return false;
    if (filterItemId && m.item_id !== filterItemId) return false;
    if (filterCauseId && m.cause_id !== filterCauseId) return false;
    return true;
  });

  const handleAdjust = async () => {
    if (!adjustForm.item_id || !adjustForm.quantity || !adjustForm.reason) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    setSubmitting(true);
    try {
      const adjustCauseCode = adjustForm.adjustment_type === "POSITIVE" ? "RETTIFICA_GIACENZA_POSITIVA" : "RETTIFICA_GIACENZA_NEGATIVA";
      const adjustCause = causes.find(c => c.code === adjustCauseCode);
      if (!adjustCause) throw new Error(`Causale ${adjustCauseCode} non trovata`);

      const qty = parseFloat(adjustForm.quantity);
      if (isNaN(qty) || qty <= 0) throw new Error("Quantità non valida");

      const { data: stockMov, error: stockErr } = await supabase
        .from("dragon_stock_movements")
        .insert({
          company_id: companyId,
          item_id: adjustForm.item_id,
          movement_date: new Date().toISOString().split("T")[0],
          cause_id: adjustCause.id,
          quantity: qty,
          sign: adjustForm.adjustment_type === "POSITIVE" ? "PLUS" : "MINUS",
          warehouse_scope: adjustForm.warehouse_scope,
          created_by: user?.id,
          note: `Rettifica: ${adjustForm.reason}`,
        } as any)
        .select()
        .single();
      if (stockErr) throw stockErr;

      const { error: adjErr } = await supabase
        .from("dragon_inventory_adjustments")
        .insert({
          company_id: companyId,
          item_id: adjustForm.item_id,
          adjustment_type: adjustForm.adjustment_type,
          quantity: qty,
          reason: adjustForm.reason,
          related_stock_movement_id: stockMov.id,
          created_by: user?.id,
        } as any);
      if (adjErr) throw adjErr;

      await supabase.from("dragon_audit_logs").insert({
        entity_type: "inventory_adjustment",
        entity_id: stockMov.id,
        action_type: "ADJUST",
        after_state: { item_id: adjustForm.item_id, type: adjustForm.adjustment_type, quantity: qty, scope: adjustForm.warehouse_scope } as any,
        performed_by: user?.id,
        reason: adjustForm.reason,
      } as any);

      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      qc.invalidateQueries({ queryKey: ["dragon-audit"] });
      toast.success("Rettifica registrata");
      setShowAdjust(false);
      setAdjustForm({ item_id: "", adjustment_type: "POSITIVE", quantity: "", reason: "", warehouse_scope: "WASTE" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MNAdminLayout title="Magazzino" subtitle="Dragon Rifiuti 2 — Giacenze e movimenti fisici">
      <DragonBackButton />
      <Tabs defaultValue="balances" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="balances">Saldi</TabsTrigger>
            <TabsTrigger value="ledger">Ledger Movimenti</TabsTrigger>
            <TabsTrigger value="adjustments">Rettifiche</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant={scope === undefined ? "default" : "outline"} size="sm" onClick={() => setScope(undefined)}>Tutti</Button>
            <Button variant={scope === "WASTE" ? "default" : "outline"} size="sm" onClick={() => setScope("WASTE")}><Recycle className="h-4 w-4 mr-1" /> Rifiuti</Button>
            <Button variant={scope === "MPS" ? "default" : "outline"} size="sm" onClick={() => setScope("MPS")}><Package className="h-4 w-4 mr-1" /> MPS</Button>
          </div>
        </div>

        <TabsContent value="balances">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={() => {
              exportToExcel(
                balances.map(b => ({
                  codice_cer: b.item?.codice_cer || "",
                  descrizione: b.item?.descrizione || "",
                  tipo: b.item?.item_type || "",
                  ambito: b.warehouse_scope,
                  giacenza: Number(b.balance),
                  um: b.item?.unita_misura_default || "kg",
                })),
                [
                  { header: "Codice", key: "codice_cer", width: 12 },
                  { header: "Descrizione", key: "descrizione", width: 30 },
                  { header: "Tipo", key: "tipo", width: 10 },
                  { header: "Ambito", key: "ambito", width: 10 },
                  { header: "Giacenza", key: "giacenza", width: 14 },
                  { header: "U.M.", key: "um", width: 6 },
                ],
                `situazione_magazzino_${new Date().toISOString().split("T")[0]}`
              );
            }}>
              <FileDown className="h-4 w-4 mr-1" /> Stampa Situazione
            </Button>
          </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead>Codice</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Tipo</TableHead>
                   <TableHead>Ambito</TableHead>
                   <TableHead className="text-right">Giacenza</TableHead>
                   <TableHead>U.M.</TableHead>
                   <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
                 ) : balances.length === 0 ? (
                   <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nessuna giacenza</TableCell></TableRow>
                ) : (
                  balances.map((b, i) => (
                    <TableRow key={`${b.item_id}-${b.warehouse_scope}-${i}`} className="border-border/10">
                      <TableCell className="font-mono text-sm">{b.item?.codice_cer}</TableCell>
                      <TableCell className="text-sm">{b.item?.descrizione}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{b.item?.item_type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={b.warehouse_scope === "WASTE" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>{b.warehouse_scope}</Badge></TableCell>
                      <TableCell className={`text-right font-mono font-bold ${b.balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{Number(b.balance).toLocaleString("it-IT")}</TableCell>
                       <TableCell className="text-xs text-muted-foreground">{b.item?.unita_misura_default}</TableCell>
                       <TableCell>
                         {b.balance > 0 && (
                           <Button
                             size="sm"
                             variant="outline"
                             className="text-xs"
                             onClick={() => {
                               const params = new URLSearchParams({ item_id: b.item_id, qty: String(Math.round(b.balance)) });
                               navigate(`/mn/admin/dev-multyproget/dragon/cernite/batch?${params.toString()}`);
                             }}
                           >
                             <Scissors className="h-3 w-3 mr-1" /> Cernita
                           </Button>
                         )}
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3 items-end">
            <div>
              <Label className="text-xs">Da</Label>
              <Input type="date" className="h-8 w-36 text-xs" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">A</Label>
              <Input type="date" className="h-8 w-36 text-xs" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Articolo</Label>
              <Select value={filterItemId} onValueChange={setFilterItemId}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Tutti" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutti</SelectItem>
                  {items.filter(i => i.attivo).map(i => <SelectItem key={i.id} value={i.id}>{i.codice_cer}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Causale</Label>
              <Select value={filterCauseId} onValueChange={setFilterCauseId}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Tutte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutte</SelectItem>
                  {causes.map(c => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" onClick={() => setShowNewMov(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Movimento</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdjust(true)}><RotateCcw className="h-4 w-4 mr-1" /> Rettifica</Button>
            </div>
          </div>

          <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead>Data</TableHead>
                  <TableHead>Codice</TableHead>
                  <TableHead>Causale</TableHead>
                  <TableHead>Ambito</TableHead>
                  <TableHead className="text-right">+/−</TableHead>
                  <TableHead className="text-right">Quantità</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nessun movimento</TableCell></TableRow>
                ) : (
                  filteredMovements.map((m) => (
                    <TableRow key={m.id} className="border-border/10 cursor-pointer hover:bg-muted/30" onClick={() => setDetailMov(m)}>
                      <TableCell className="text-sm">{new Date(m.movement_date).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell className="font-mono text-sm">{(m.item as any)?.codice_cer}</TableCell>
                      <TableCell className="text-xs">{(m.cause as any)?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={m.warehouse_scope === "WASTE" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>{m.warehouse_scope}</Badge></TableCell>
                      <TableCell className="text-right">{m.sign === "PLUS" ? <span className="text-emerald-400">+</span> : <span className="text-rose-400">−</span>}</TableCell>
                      <TableCell className="text-right font-mono">{Number(m.quantity).toLocaleString("it-IT")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{m.note || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="adjustments">
          <AdjustmentsTab companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* New Movement Form */}
      <DragonNewMovementForm open={showNewMov} onOpenChange={setShowNewMov} />

      {/* Movement Detail Dialog */}
      <DragonMovementDetail movement={detailMov} open={!!detailMov} onClose={() => setDetailMov(null)} />

      {/* Adjustment Sheet */}
      <Sheet open={showAdjust} onOpenChange={setShowAdjust}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nuova Rettifica Magazzino</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Articolo *</Label>
              <Select value={adjustForm.item_id} onValueChange={v => setAdjustForm(f => ({ ...f, item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona articolo..." /></SelectTrigger>
                <SelectContent>
                  {items.filter(i => i.attivo).map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.codice_cer} — {i.descrizione}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo Rettifica *</Label>
              <Select value={adjustForm.adjustment_type} onValueChange={(v: DragonAdjustmentType) => setAdjustForm(f => ({ ...f, adjustment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POSITIVE"><Plus className="h-3 w-3 inline mr-1" />Aggiunta (inventariale positiva)</SelectItem>
                  <SelectItem value="NEGATIVE"><Minus className="h-3 w-3 inline mr-1" />Sottrazione (inventariale negativa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ambito *</Label>
              <Select value={adjustForm.warehouse_scope} onValueChange={(v: DragonWarehouseScope) => setAdjustForm(f => ({ ...f, warehouse_scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WASTE">Rifiuti (WASTE)</SelectItem>
                  <SelectItem value="MPS">MPS / Materiali recuperati</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantità (kg) *</Label>
              <Input type="number" step="0.01" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Motivo (obbligatorio) *</Label>
              <Input value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} placeholder="Es: Inventario fisico Q1 2026" />
            </div>
            <Button onClick={handleAdjust} disabled={submitting || !adjustForm.item_id || !adjustForm.quantity || !adjustForm.reason} className="w-full">
              {submitting ? "Registrazione..." : "Registra Rettifica"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}

function AdjustmentsTab({ companyId }: { companyId: string }) {
  const { data: adjustments = [], isLoading } = useAdjustments(companyId);

  return (
    <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/20">
            <TableHead>Data</TableHead>
            <TableHead>Articolo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantità</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
          ) : adjustments.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nessuna rettifica</TableCell></TableRow>
          ) : (
            adjustments.map((a: any) => (
              <TableRow key={a.id} className="border-border/10">
                <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString("it-IT")}</TableCell>
                <TableCell className="font-mono text-sm">{a.item?.codice_cer} — {a.item?.descrizione}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={a.adjustment_type === "POSITIVE" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}>
                    {a.adjustment_type === "POSITIVE" ? "+Aggiunta" : "−Sottrazione"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{Number(a.quantity).toLocaleString("it-IT")} kg</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.reason}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function useAdjustments(companyId: string) {
  return useQuery({
    queryKey: ["dragon-adjustments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_inventory_adjustments")
        .select("*, item:dragon_items(*)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}
