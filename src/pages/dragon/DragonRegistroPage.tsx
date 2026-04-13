import { useState } from "react";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonRegister } from "@/hooks/dragon/useDragonRegister";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Filter, Download, CheckCircle, FileText } from "lucide-react";
import { DragonRegisterMovement, DragonMovementStatus } from "@/types/dragon";
import { DragonMovementForm } from "@/components/dragon/DragonMovementForm";
import { exportToExcel } from "@/lib/exportUtils";

const statusColors: Record<string, string> = {
  BOZZA: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  CONSOLIDATO: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  STAMPATO: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  INVIATO_RENTRI: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  DA_NON_STAMPARE: "bg-muted text-muted-foreground border-border",
  DA_NON_INVIARE_RENTRI: "bg-muted text-muted-foreground border-border",
};

const typeColors: Record<string, string> = {
  CARICO: "bg-emerald-500/20 text-emerald-300",
  SCARICO: "bg-rose-500/20 text-rose-300",
};

export default function DragonRegistroPage() {
  const { context } = useParams<{ context: string }>();
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<DragonRegisterMovement | null>(null);
  const [filters, setFilters] = useState<{ cerCode?: string; status?: DragonMovementStatus; movementType?: 'CARICO' | 'SCARICO' }>({});

  const { movements, isLoading, createMovement, consolidate } = useDragonRegister(filters);
  const { causes } = useDragonCauses();

  const handleExport = () => {
    exportToExcel(
      movements as any[],
      [
        { header: "N°", key: "movement_number", width: 8 },
        { header: "Data", key: "movement_date", width: 12 },
        { header: "Tipo", key: "movement_type", width: 10 },
        { header: "CER", key: "cer_code", width: 12 },
        { header: "Descrizione", key: "description_snapshot", width: 30 },
        { header: "Quantità", key: "quantity", width: 12 },
        { header: "U.M.", key: "unit_of_measure", width: 6 },
        { header: "Causale", key: "cause", width: 25, format: (v: any) => v?.name || "" },
        { header: "Stato", key: "status", width: 14 },
      ],
      `registro_${context}_${new Date().toISOString().split("T")[0]}`
    );
  };

  return (
    <MNAdminLayout title="Registro Cronologico" subtitle="Dragon Rifiuti 2 — Movimenti di registro">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 items-center flex-wrap">
            <Input placeholder="Cerca CER..." className="w-40 h-9" value={filters.cerCode || ""} onChange={(e) => setFilters(f => ({ ...f, cerCode: e.target.value || undefined }))} />
            <Select value={filters.movementType || "all"} onValueChange={(v) => setFilters(f => ({ ...f, movementType: v === "all" ? undefined : v as any }))}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="CARICO">Carico</SelectItem>
                <SelectItem value="SCARICO">Scarico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({ ...f, status: v === "all" ? undefined : v as DragonMovementStatus }))}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Stato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="BOZZA">Bozza</SelectItem>
                <SelectItem value="CONSOLIDATO">Consolidato</SelectItem>
                <SelectItem value="STAMPATO">Stampato</SelectItem>
                <SelectItem value="INVIATO_RENTRI">Inviato RENTRI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export</Button>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Movimento</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Totale", value: movements.length, color: "text-foreground" },
            { label: "Bozze", value: movements.filter(m => m.status === "BOZZA").length, color: "text-amber-400" },
            { label: "Carichi", value: movements.filter(m => m.movement_type === "CARICO").length, color: "text-emerald-400" },
            { label: "Scarichi", value: movements.filter(m => m.movement_type === "SCARICO").length, color: "text-rose-400" },
          ].map((s, i) => (
            <div key={i} className="bg-card/60 border border-border/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead className="w-16">N°</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="w-20">Tipo</TableHead>
                <TableHead>CER</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="w-24 text-right">Quantità</TableHead>
                <TableHead className="w-32">Causale</TableHead>
                <TableHead className="w-28">Stato</TableHead>
                <TableHead className="w-20">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : movements.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Nessun movimento trovato</TableCell></TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id} className="border-border/10 cursor-pointer hover:bg-muted/30" onClick={() => setDetail(m)}>
                    <TableCell className="font-mono text-xs">{m.movement_number}</TableCell>
                    <TableCell className="text-sm">{new Date(m.movement_date).toLocaleDateString("it-IT")}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[m.movement_type]}>{m.movement_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{m.cer_code}</TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">{m.description_snapshot || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(m.quantity).toLocaleString("it-IT")} {m.unit_of_measure}</TableCell>
                    <TableCell className="text-xs">{(m.cause as any)?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[m.status] || ""}>{m.status}</Badge></TableCell>
                    <TableCell>
                      {m.status === "BOZZA" && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); consolidate.mutate(m.id); }} title="Consolida">
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* New movement drawer */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Nuovo Movimento di Registro</SheetTitle></SheetHeader>
          <DragonMovementForm
            causes={causes}
            onSubmit={async (data) => {
              await createMovement.mutateAsync(data);
              setShowForm(false);
            }}
            isLoading={createMovement.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Detail drawer */}
      <Sheet open={!!detail} onOpenChange={() => setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Dettaglio Movimento #{detail?.movement_number}</SheetTitle></SheetHeader>
          {detail && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Tipo</p><Badge variant="outline" className={typeColors[detail.movement_type]}>{detail.movement_type}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Stato</p><Badge variant="outline" className={statusColors[detail.status]}>{detail.status}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Data</p><p className="text-sm">{new Date(detail.movement_date).toLocaleDateString("it-IT")}</p></div>
                <div><p className="text-xs text-muted-foreground">CER</p><p className="text-sm font-mono">{detail.cer_code}</p></div>
                <div><p className="text-xs text-muted-foreground">Quantità</p><p className="text-sm font-mono">{Number(detail.quantity).toLocaleString("it-IT")} {detail.unit_of_measure}</p></div>
                <div><p className="text-xs text-muted-foreground">Segno</p><p className="text-sm">{detail.sign === "PLUS" ? "➕" : "➖"} {detail.sign}</p></div>
                <div><p className="text-xs text-muted-foreground">Contesto</p><p className="text-sm">{detail.source_context}</p></div>
                <div><p className="text-xs text-muted-foreground">Peso</p><p className="text-sm">{detail.weight_status}</p></div>
              </div>
              {detail.description_snapshot && <div><p className="text-xs text-muted-foreground">Descrizione</p><p className="text-sm">{detail.description_snapshot}</p></div>}
              {detail.note && <div><p className="text-xs text-muted-foreground">Note</p><p className="text-sm">{detail.note}</p></div>}
              {(detail.cause as any)?.name && <div><p className="text-xs text-muted-foreground">Causale</p><p className="text-sm">{(detail.cause as any).name}</p></div>}
              {(detail.source_site as any)?.name && <div><p className="text-xs text-muted-foreground">Cantiere</p><p className="text-sm">{(detail.source_site as any).name}</p></div>}
              {(detail.linked_document as any)?.number && <div><p className="text-xs text-muted-foreground">Documento</p><p className="text-sm"><FileText className="h-3 w-3 inline mr-1" />{(detail.linked_document as any).document_type} {(detail.linked_document as any).number}</p></div>}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
