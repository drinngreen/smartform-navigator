import { useState } from "react";
import { ContattoFormDialog } from "./ContattoFormDialog";

interface AddToRubricaPromptProps {
  tenantId: string;
  destinatario: string;
  tipo: "telefono" | "cellulare" | "email";
  onDismiss: () => void;
  onSaved?: () => void;
}

export function AddToRubricaPrompt({ tenantId, destinatario, tipo, onDismiss, onSaved }: AddToRubricaPromptProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
        <span className="text-amber-400">⚠️ Contatto non in rubrica.</span>
        <button className="text-amber-300 underline hover:text-amber-200" onClick={() => setShowForm(true)}>Aggiungi</button>
        <button className="text-muted-foreground hover:text-foreground ml-auto" onClick={onDismiss}>Ignora</button>
      </div>
      <ContattoFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        tenantId={tenantId}
        prefill={{ [tipo]: destinatario }}
        onSaved={onSaved}
      />
    </>
  );
}
