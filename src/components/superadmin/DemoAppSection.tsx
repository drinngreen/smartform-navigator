import { useState } from "react";
import { ChevronDown, ChevronRight, FlaskConical, AlertTriangle } from "lucide-react";
import { FIRFormComplete } from "@/components/fir/FIRFormComplete";
import { FIRTrafficLight } from "@/components/fir/FIRTrafficLight";

const DEMO_EMAIL = "development@zolisoftware.space";

export function DemoAppSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-yellow-500/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FlaskConical size={18} className="text-yellow-400" />
          <span className="font-display text-lg tracking-wider">APP DEMO — Test Filiera FIR</span>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
            DEMO
          </span>
        </div>
        {open ? <ChevronDown size={16} className="text-yellow-400" /> : <ChevronRight size={16} className="text-yellow-400" />}
      </button>

      {open && (
        <div className="border-t border-yellow-500/30">
          {/* Demo banner */}
          <div className="bg-yellow-600/20 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2 text-yellow-300 text-xs font-mono">
            <AlertTriangle size={14} />
            MODALITÀ DEMO — Email inviate a: <strong>{DEMO_EMAIL}</strong> — Backend Demo Ngrok
          </div>

          {/* Traffic light */}
          <div className="px-4 pt-3">
            <FIRTrafficLight />
          </div>

          {/* Full FIR Form in demo mode */}
          <div className="max-w-2xl mx-auto">
            <FIRFormComplete demoMode demoEmailOverride={DEMO_EMAIL} />
          </div>
        </div>
      )}
    </div>
  );
}
