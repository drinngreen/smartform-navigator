import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { DragonCaricoScaricoWizard } from "@/components/dragon/DragonCaricoScaricoWizard";
import { useDragonRegister } from "@/hooks/dragon/useDragonRegister";
import { toast } from "sonner";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";

export default function DragonCaricoScaricoPage() {
  const { context } = useParams<{ context: string }>();
  const navigate = useNavigate();
  const companyId = useMNContextStore(s => s.activeContext.tenantId);
  const { user } = useAuth();
  const qc = useQueryClient();

  const createPair = useMutation({
    mutationFn: async ({ carico, scarico }: { carico: Record<string, any>; scarico: Record<string, any> }) => {
      // Create carico first
      const { data: caricoData, error: e1 } = await supabase
        .from("dragon_register_movements")
        .insert({ company_id: companyId, created_by: user?.id, ...carico } as any)
        .select("id")
        .single();
      if (e1) throw e1;

      // Create scarico linked to carico
      const { error: e2 } = await supabase
        .from("dragon_register_movements")
        .insert({
          company_id: companyId,
          created_by: user?.id,
          parent_movement_id: caricoData.id,
          ...scarico,
        } as any)
        .select()
        .single();
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      toast.success("Carico e scarico contestuale registrati");
      navigate(`/mn/admin/${context}/dragon/registro`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MNAdminLayout title="Carico/Scarico Contestuale" subtitle="Dragon Rifiuti 2 — Wizard operazione contestuale">
      <DragonBackButton />
      <div className="max-w-2xl mx-auto">
        <div className="bg-card/60 border border-border/30 rounded-xl p-6">
          <DragonCaricoScaricoWizard
            onSubmit={async (data) => { await createPair.mutateAsync(data); }}
            isLoading={createPair.isPending}
            onCancel={() => navigate(`/mn/admin/${context}/dragon/registro`)}
          />
        </div>
      </div>
    </MNAdminLayout>
  );
}
