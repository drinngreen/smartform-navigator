import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useAuth } from "@/hooks/useAuth";

export default function MNDashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "Operatore";

  return (
    <MNAdminLayout title={`Multy Niyol — ${firstName}`} subtitle="Dashboard Operativa">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: "Registro FIR", href: "/mn/admin/registro", color: "249, 115, 22" },
          { label: "RENTRI", href: "/mn/admin/rentri", color: "236, 72, 153" },
          { label: "Trasportatori", href: "/mn/admin/trasportatori", color: "6, 182, 212" },
          { label: "Personale", href: "/mn/admin/personale", color: "16, 185, 129" },
          { label: "Messaggi", href: "/mn/admin/messaggi", color: "244, 114, 182" },
          { label: "Chiamate", href: "/mn/admin/chiamate", color: "34, 197, 94" },
          { label: "Magazzino", href: "/mn/admin/magazzino", color: "20, 184, 166" },
          { label: "Conferimenti", href: "/mn/admin/conferimenti", color: "249, 115, 22" },
          { label: "Impianti", href: "/mn/admin/impianti", color: "59, 130, 246" },
          { label: "Pagamenti", href: "/mn/admin/pagamenti", color: "239, 68, 68" },
          { label: "Registro Kg", href: "/mn/admin/registro-kg", color: "16, 185, 129" },
          { label: "FIR Digitali", href: "/mn/admin/fir-digitali", color: "236, 72, 153" },
          { label: "Formulari", href: "/mn/admin/formulari", color: "34, 197, 94" },
          { label: "App Multyproget", href: "/mn/app/multyproget", color: "251, 191, 36" },
          { label: "App Niyol", href: "/mn/app/niyol", color: "6, 182, 212" },
          { label: "Transporter App", href: "/mn/admin/transporter-app", color: "249, 115, 22" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="p-4 rounded-2xl bg-card/60 border border-border/30 hover:border-primary/30 backdrop-blur-xl transition-all duration-300 group"
            style={{ boxShadow: `0 0 20px rgba(${item.color}, 0.05)` }}
          >
            <div
              className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, rgba(${item.color}, 0.2), rgba(${item.color}, 0.05))` }}
            >
              <div className="w-4 h-4 rounded-full" style={{ background: `rgba(${item.color}, 0.6)` }} />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </MNAdminLayout>
  );
}
