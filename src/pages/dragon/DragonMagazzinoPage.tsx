import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonStock } from "@/hooks/dragon/useDragonStock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Recycle, ArrowUpDown } from "lucide-react";
import type { DragonWarehouseScope } from "@/types/dragon";

export default function DragonMagazzinoPage() {
  const [scope, setScope] = useState<DragonWarehouseScope | undefined>(undefined);
  const { balances, stockMovements, isLoading } = useDragonStock(scope);

  return (
    <MNAdminLayout title="Magazzino" subtitle="Dragon Rifiuti 2 — Giacenze e movimenti fisici">
      <Tabs defaultValue="balances" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="balances">Saldi</TabsTrigger>
            <TabsTrigger value="ledger">Ledger Movimenti</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant={scope === undefined ? "default" : "outline"} size="sm" onClick={() => setScope(undefined)}>Tutti</Button>
            <Button variant={scope === "WASTE" ? "default" : "outline"} size="sm" onClick={() => setScope("WASTE")}><Recycle className="h-4 w-4 mr-1" /> Rifiuti</Button>
            <Button variant={scope === "MPS" ? "default" : "outline"} size="sm" onClick={() => setScope("MPS")}><Package className="h-4 w-4 mr-1" /> MPS</Button>
          </div>
        </div>

        <TabsContent value="balances">
          <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead>Codice</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ambito</TableHead>
                  <TableHead className="text-right">Giacenza</TableHead>
                  <TableHead>U.M.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
                ) : balances.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nessuna giacenza</TableCell></TableRow>
                ) : (
                  balances.map((b, i) => (
                    <TableRow key={`${b.item_id}-${b.warehouse_scope}-${i}`} className="border-border/10">
                      <TableCell className="font-mono text-sm">{b.item?.codice_cer}</TableCell>
                      <TableCell className="text-sm">{b.item?.descrizione}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{b.item?.item_type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={b.warehouse_scope === "WASTE" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>{b.warehouse_scope}</Badge></TableCell>
                      <TableCell className={`text-right font-mono font-bold ${b.balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{Number(b.balance).toLocaleString("it-IT")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.item?.unita_misura_default}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
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
                ) : stockMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nessun movimento</TableCell></TableRow>
                ) : (
                  stockMovements.map((m) => (
                    <TableRow key={m.id} className="border-border/10">
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
      </Tabs>
    </MNAdminLayout>
  );
}
