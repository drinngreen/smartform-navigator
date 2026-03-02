import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || "Errore imprevisto" };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Si è verificato un errore nell'app</h1>
            <p className="text-sm text-muted-foreground">
              Ricarica la pagina. Se il problema continua, apri la console e inviami l'errore mostrato.
            </p>
            {this.state.message && (
              <p className="text-xs text-muted-foreground mt-3 break-words">Dettaglio: {this.state.message}</p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
