import { Phone, PhoneOff } from "lucide-react";

interface CallOfficeButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  isActive?: boolean;
  title?: string;
}

export function CallOfficeButton({
  onClick,
  disabled = false,
  isActive = false,
  title = "Chiama sede",
}: CallOfficeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isActive ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
    </button>
  );
}
