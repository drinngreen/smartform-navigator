import { useNavigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useAuth } from "@/hooks/useAuth";
import multyprogetIcon from "@/assets/multyproget-icon.png";
import niyolIcon from "@/assets/niyol-icon.png";

const tenants = [
  {
    id: "multyproget",
    label: "Multyproget",
    icon: multyprogetIcon,
    href: "/mn/admin/multyproget",
    color: "249, 115, 22",
  },
  {
    id: "niyol",
    label: "Niyol",
    icon: niyolIcon,
    href: "/mn/admin/niyol",
    color: "6, 182, 212",
  },
];

export default function MNDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "Operatore";

  return (
    <MNAdminLayout title={`Multy Niyol — ${firstName}`} subtitle="Seleziona Contesto Operativo">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-16 md:gap-24">
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(t.href)}
              className="group flex flex-col items-center gap-6 transition-transform duration-300 hover:scale-105"
            >
              <div
                className="relative w-40 h-40 md:w-56 md:h-56 rounded-3xl flex items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(${t.color}, 0.15), rgba(${t.color}, 0.05))`,
                  border: `3px solid rgba(${t.color}, 0.8)`,
                  boxShadow: `
                    0 0 15px rgba(${t.color}, 0.6),
                    0 0 40px rgba(${t.color}, 0.4),
                    0 0 80px rgba(${t.color}, 0.2),
                    inset 0 0 30px rgba(${t.color}, 0.1)
                  `,
                  animation: "pulse 3s ease-in-out infinite",
                }}
              >
                <img
                  src={t.icon}
                  alt={t.label}
                  className="w-24 h-24 md:w-36 md:h-36 object-contain transition-transform duration-500 group-hover:scale-110"
                  style={{ filter: `drop-shadow(0 0 20px rgba(${t.color}, 0.6))` }}
                />
              </div>
              <span
                className="text-xl md:text-2xl font-display tracking-widest text-white uppercase"
                style={{ textShadow: `0 0 20px rgba(${t.color}, 0.8)` }}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </MNAdminLayout>
  );
}
