import { useEffect, useRef } from "react";
import { useFormBridgeContext } from "@/contexts/FormBridgeContext";
/**
 * Hook to register form fields with the FormBridge.
 * Usage:
 *   const { registerField } = useFormBridge();
 *   useEffect(() => registerField({ id, label, type, getValue, setValue }), [deps]);
 */
export function useFormBridge() {
    const { registerField, getRegisteredFields, fillFields } = useFormBridgeContext();
    return { registerField, getRegisteredFields, fillFields };
}
/**
 * Convenience hook: registers multiple fields at once and auto-cleans up.
 * Pass a factory that returns FieldDescriptor[]. Re-registers when deps change.
 */
export function useFormBridgeFields(factory, deps) {
    const { registerField } = useFormBridgeContext();
    const cleanupsRef = useRef([]);
    useEffect(() => {
        // Clean previous registrations
        cleanupsRef.current.forEach((fn) => fn());
        cleanupsRef.current = [];
        const fields = factory();
        for (const field of fields) {
            cleanupsRef.current.push(registerField(field));
        }
        return () => {
            cleanupsRef.current.forEach((fn) => fn());
            cleanupsRef.current = [];
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
