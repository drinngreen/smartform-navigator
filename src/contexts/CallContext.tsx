import { createContext, useContext, ReactNode } from "react";

interface CallContextType {
  isCallActive: boolean;
}

const CallContext = createContext<CallContextType>({ isCallActive: false });

export function CallProvider({ children }: { children: ReactNode }) {
  return (
    <CallContext.Provider value={{ isCallActive: false }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
