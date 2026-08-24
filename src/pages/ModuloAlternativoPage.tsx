import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ModuloAlternativoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary/50 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg tracking-wider">MODULO ALTERNATIVO FIR</h1>
      </header>
      <main className="max-w-3xl mx-auto p-6">
        <FIRAlternativeForm forceRentriDigital />
      </main>
    </div>
  );
}
