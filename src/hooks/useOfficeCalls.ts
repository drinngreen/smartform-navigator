// Stub - useOfficeCalls hook
import { useState } from "react";

export function useOfficeCalls() {
  const [calls] = useState<any[]>([]);
  return { calls, isLoading: false };
}
