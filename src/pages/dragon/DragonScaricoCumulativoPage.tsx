import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { DragonScaricoCumulativo } from "@/components/dragon/DragonScaricoCumulativo";
import { useDragonRegister } from "@/hooks/dragon/useDragonRegister";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function DragonScaricoCumulativoPage() {
  const { context } = useParams<{ context: string }>();
  const navigate = useNavigate();
  const companyId = useMNContextStore(s => s.activeContext.tenantId);
  const { user } = useAuth();
  const qc = useQueryClient();

  // Fetch only CARICO + CONSOLIDATO movements as pending
  const { movements: pendingCarichi, isLoading } = useDragonRegister({
    movementType: "CARICO",
    status: "CONSOLIDATO",
  });

  const submitScarico = useMutation({
    mutationFn: async ({
      scarico,
      allocations,
    }: {
      scarico: Record<string, any>;
      allocations: { in_movement_id: string; allocated_quantity: number }[];
    }) => {
      // Create the scarico movement
      const { data: scaricoData, error: e1 } = await supabase
        .from("dragon_register_movements")
        .insert({ company_id: companyId, created_by: user?.id, ...scarico } as any)
        .select("id")
        .single();
      if (e1) throw e1;

      // Create allocations
      if (allocations.length > 0) {
        const rows = allocations.map(a => ({
          out_movement_id: scaricoData.id,
          in_movement_id: a.in_movement_id,
          allocated_quantity: a.allocated_quantity,
        }));
        const { error: e2 } = await supabase
          .from("dragon_movement_allocations")
          .insert(rows as any);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      toast.success("Scarico cumulativo registrato con allocazioni FIFO");
      navigate(`/mn/admin/${context}/dragon/registro`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MNAdminLayout title="Scarico Cumulativo" subtitle="Dragon Rifiuti 2 — Seleziona carichi pendenti e scarica">
      <div className="max-w-3xl mx-auto">
        <div className="bg-card/60 border border-border/30 rounded-xl p-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12">Caricamento carichi pendenti...</p>
          ) : (
            <DragonScaricoCumulativo
              pendingCarichi={pendingCarichi}
              onSubmit={async (data) => { await submitScarico.mutateAsync(data); }}
              isLoading={submitScarico.isPending}
              onCancel={() => navigate(`/mn/admin/${context}/dragon/registro`)}
            />
          )}
        </div>
      </div>
    </MNAdminLayout>
  );
}
