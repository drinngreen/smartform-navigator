import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";

interface Props {
  firNumber: string;
  open: boolean;
  onClose: () => void;
  onPrinted?: () => void;
}

export function DevStampaFIREditor({ firNumber, open, onClose, onPrinted }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
            <Printer className="h-5 w-5 text-primary" />
            Stampa FIR — {firNumber}
          </DialogTitle>
        </DialogHeader>
        <FIRAlternativeForm
          presetNumeroFir={firNumber}
          printOnly={true}
          onPrinted={() => {
            onPrinted?.();
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
