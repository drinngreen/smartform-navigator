import { useMemo, useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
import { useDragonLots, type DragonLot } from "@/hooks/dragon/useDragonLots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Split, Merge, Boxes, GitBranch, Search } from "lucide-react";
import { DragonLotTree } from "@/components/dragon/DragonLotTree";

export default function DragonLottiPage() {
  const { lots, isLoading, splitLot, mergeLots } = useDragonLots();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [splitTarget, setSplitTarget] = useState<DragonLot | null>(null);
  const [splitQty, setSplitQty] = useState("");
  const [splitCode, setSplitCode] = useState("");
  const [splitNotes, setSplitNotes] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeCode, setMergeCode] = useState("");
  const [mergeNotes, setMergeNotes] = useState("");
  const [traceLotId, setTraceLotId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lots;
    return lots.filter(
      (l) =>
        l.lot_code?.toLowerCase().includes(q) ||
        l.item?.codice_cer?.toLowerCase().includes(q) ||
        l.item?.descrizione?.toLowerCase().includes(q),
    );
  }, [lots, search]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openSplit = (lot: DragonLot) => {
    setSplitTarget(lot);
    setSplitQty("");
    setSplitCode(`${lot.lot_code}-A`);
    setSplitNotes("");
  };

  const confirmSplit = async () => {
    if (!splitTarget) return;
    const qty = parseFloat(splitQty.replace(",", "."));
    if (!qty || qty <= 0 || !splitCode.trim()) return;
    await splitLot.mutateAsync({
      lotId: splitTarget.id,
      quantity: qty,
      newLotCode: splitCode.trim(),
      notes: splitNotes || undefined,
    });
    setSplitTarget(null);
  };

  const confirmMerge = async () => {
    if (selected.length < 2 || !mergeCode.trim()) return;
    await mergeLots.mutateAsync({ lotIds: selected, targetLotCode: mergeCode.trim(), notes: mergeNotes || undefined });
    setMergeOpen(false);
    setSelected([]);
    setMergeCode("");
    setMergeNotes("");
  };

  const selectedItems = lots.filter((l) => selected.includes(l.id));
  const mergeSameCer = new Set(selectedItems.map((l) => l.item_id)).size <= 1;

  return (
    <MNAdminLayout title="Lotti & Tracciabilità" subtitle="Dragon — Divisione, accorpamento e rintraccia">
      <div className="space-y-4">
        <DragonBackButton />

        <Tabs defaultValue="lotti">
          <TabsList className="bg-card/40 border border-border/30">
            <TabsTrigger value="lotti" className="gap-2"><Boxes className="h-4 w-4" /> Lotti</TabsTrigger>
            <TabsTrigger value="rintraccia" className="gap-2"><GitBranch className="h-4 w-4" /> Rintraccia</TabsTrigger>
          </TabsList>

          <TabsContent value="lotti" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="relative w-72 max-w-full">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cerca lotto, CER o descrizione..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={selected.length < 2 || !mergeSameCer}
                onClick={() => { setMergeCode(""); setMergeOpen(true); }}
              >
                <Merge className="h-4 w-4 mr-1" /> Accorpa {selected.length > 0 ? `(${selected.length})` : ""}
              </Button>
            </div>
            {selected.length >= 2 && !mergeSameCer && (
              <p className="text-xs text-amber-400">Puoi accorpare solo lotti con lo stesso codice CER.</p>
            )}

            <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Lotto</TableHead>
                    <TableHead>CER</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Giacenza (kg)</TableHead>
                    <TableHead>Origine</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Caricamento…</TableCell></TableRow>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nessun lotto presente</TableCell></TableRow>
                  )}
                  {filtered.map((lot) => (
                    <TableRow key={lot.id} className="border-border/20">
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(lot.id)}
                          onCheckedChange={() => toggle(lot.id)}
                          disabled={lot.balance <= 0}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{lot.lot_code}</TableCell>
                      <TableCell className="font-mono text-xs">{lot.item?.codice_cer ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate">{lot.item?.descrizione ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {lot.balance.toLocaleString("it-IT", { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{lot.origin ?? "CERNITA"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lot.status === "CHIUSO" ? "secondary" : "default"} className="text-[10px]">
                          {lot.status ?? "ATTIVO"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" disabled={lot.balance <= 0} onClick={() => openSplit(lot)}>
                          <Split className="h-4 w-4 mr-1" /> Dividi
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setTraceLotId(lot.id)}>
                          <GitBranch className="h-4 w-4 mr-1" /> Rintraccia
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="rintraccia" className="mt-4">
            <DragonLotTree lots={lots} selectedLotId={traceLotId} onSelect={setTraceLotId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Split dialog */}
      <Dialog open={!!splitTarget} onOpenChange={(o) => !o && setSplitTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dividi lotto {splitTarget?.lot_code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Disponibili: <span className="font-semibold text-foreground">{splitTarget?.balance.toLocaleString("it-IT")} kg</span>
            </p>
            <div className="space-y-1">
              <Label>Quantità da scorporare (kg)</Label>
              <Input value={splitQty} onChange={(e) => setSplitQty(e.target.value)} placeholder="0" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Codice nuovo lotto</Label>
              <Input value={splitCode} onChange={(e) => setSplitCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea value={splitNotes} onChange={(e) => setSplitNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitTarget(null)}>Annulla</Button>
            <Button onClick={confirmSplit} disabled={splitLot.isPending}>Dividi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Accorpa {selected.length} lotti</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground space-y-1">
              {selectedItems.map((l) => (
                <div key={l.id} className="flex justify-between">
                  <span className="font-mono">{l.lot_code}</span>
                  <span>{l.balance.toLocaleString("it-IT")} kg</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border/30 pt-1 font-semibold text-foreground">
                <span>Totale</span>
                <span>{selectedItems.reduce((a, b) => a + b.balance, 0).toLocaleString("it-IT")} kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Codice lotto di destinazione</Label>
              <Input value={mergeCode} onChange={(e) => setMergeCode(e.target.value)} placeholder="LOT-MERGE-001" />
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea value={mergeNotes} onChange={(e) => setMergeNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>Annulla</Button>
            <Button onClick={confirmMerge} disabled={mergeLots.isPending}>Accorpa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MNAdminLayout>
  );
}
