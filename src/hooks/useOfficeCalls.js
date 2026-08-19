// Stub - useOfficeCalls hook
import { useState } from "react";
export function useOfficeCalls() {
    const [calls] = useState([]);
    return { calls, isLoading: false };
}
