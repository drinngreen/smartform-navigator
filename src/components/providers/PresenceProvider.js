import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
export function PresenceProvider({ children }) {
    // Just initialize the presence hook
    useOnlineStatus();
    return _jsx(_Fragment, { children: children });
}
