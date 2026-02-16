import { Phone } from "lucide-react";

export function CallOfficeButton() {
  return (
    <button className="p-2.5 rounded-xl bg-neon-green/20 border border-neon-green/30 text-neon-green hover:bg-neon-green/30 transition-colors">
      <Phone className="h-5 w-5" />
    </button>
  );
}
