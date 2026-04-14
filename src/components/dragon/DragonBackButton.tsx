import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

export function DragonBackButton() {
  const navigate = useNavigate();
  const { context } = useParams<{ context: string }>();
  const target = context === "dev-multyproget"
    ? "/mn/admin/dev-multyproget?tab=magazzino-dev"
    : `/mn/admin/${context || "dev-multyproget"}?tab=magazzino-dev`;

  return (
    <button
      onClick={() => navigate(target)}
      className="mb-4 flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-all group"
    >
      <ArrowLeft className="h-5 w-5 text-red-400 group-hover:-translate-x-1 transition-transform" />
      <img src={logoDragon} alt="Dragon" className="h-6 w-6" />
      <span className="text-sm font-semibold text-red-300">Torna al Centro di Comando</span>
    </button>
  );
}