import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonAudit } from "@/hooks/dragon/useDragonAudit";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-500/20 text-emerald-300",
  UPDATE: "bg-blue-500/20 text-blue-300",
  SOFT_DELETE: "bg-rose-500/20 text-rose-300",
  RESTORE: "bg-violet-500/20 text-violet-300",
  CONFIRM: "bg-amber-500/20 text-amber-300",
  CANCEL: "bg-rose-500/20 text-rose-300",
  ADJUST: "bg-orange-500/20 text-orange-300",
};

export default function DragonAuditPage() {
  const { logs, isLoading } = useDragonAudit();

  return (
    <MNAdminLayout title="Audit Trail" subtitle="Dragon Rifiuti 2 — Cronologia eventi e tracciabilità">
      <div className="space-y-4">
        <DragonBackButton />
        <p className="text-sm text-muted-foreground"><Shield className="h-4 w-4 inline mr-1" />{logs.length} eventi registrati</p>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Data/Ora</TableHead>
                <TableHead>Azione</TableHead>
                <TableHead>Entità</TableHead>
                <TableHead>ID Entità</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nessun evento audit registrato</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-border/10">
                    <TableCell className="text-sm">{new Date(log.performed_at).toLocaleString("it-IT")}</TableCell>
                    <TableCell><Badge variant="outline" className={actionColors[log.action_type] || ""}>{log.action_type}</Badge></TableCell>
                    <TableCell className="text-sm">{log.entity_type}</TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[120px]">{log.entity_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.reason || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MNAdminLayout>
  );
}
