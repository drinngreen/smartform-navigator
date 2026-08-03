import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, Printer } from "lucide-react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

export default function MNDevAnalisiPage() {
  const navigate = useNavigate();
  const [guideMd, setGuideMd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/analisi-prometeo.md")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setGuideMd(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Errore caricamento analisi");
        setLoading(false);
      });
  }, []);

  return (
    <MNAdminLayout title="🔍 Analisi Prometeo" subtitle="Confronto funzionalità Prometeo Rifiuti vs. piattaforma attuale">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Button
          variant="ghost"
          onClick={() => navigate("/mn/admin/dev-multyproget")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Torna al Centro di Comando
        </Button>
        <Button
          onClick={() => window.print()}
          className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg"
          size="lg"
        >
          <Printer size={18} />
          🖨️ Stampa analisi
        </Button>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/30">
          <BookOpen className="h-6 w-6 text-emerald-400" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Gap Analysis — Prometeo Rifiuti</h1>
            <p className="text-xs text-muted-foreground">
              Stato di copertura di tutte le 8 aree funzionali richieste dal cliente.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Caricamento analisi...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            Errore caricamento analisi: {error}
          </div>
        )}

        {!loading && !error && (
          <article className="prose prose-invert max-w-none text-sm text-foreground/90">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 text-emerald-300">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-emerald-200 border-b border-border/20 pb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold mt-5 mb-2 text-foreground">{children}</h3>,
                h4: ({ children }) => <h4 className="text-base font-semibold mt-4 mb-2 text-foreground/90">{children}</h4>,
                p: ({ children }) => <p className="mb-3 leading-relaxed text-muted-foreground">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-muted-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-muted-foreground">{children}</ol>,
                li: ({ children }) => <li className="pl-1">{children}</li>,
                code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs">{children}</code>,
                pre: ({ children }) => <pre className="p-4 rounded-xl bg-black/40 border border-border/30 overflow-x-auto text-xs mb-4">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-500/50 pl-4 italic text-muted-foreground mb-4">{children}</blockquote>,
                hr: () => <hr className="my-6 border-border/30" />,
                strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                a: ({ children, href }) => (
                  <a href={href} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ),
                table: ({ children }) => <table className="w-full text-left border-collapse mb-4 text-xs">{children}</table>,
                thead: ({ children }) => <thead className="bg-muted/50 text-foreground">{children}</thead>,
                th: ({ children }) => <th className="p-2 border border-border/30 font-semibold">{children}</th>,
                td: ({ children }) => <td className="p-2 border border-border/30 text-muted-foreground">{children}</td>,
              }}
            >
              {guideMd}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </MNAdminLayout>
  );
}
