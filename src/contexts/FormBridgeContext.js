import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useCallback, useRef } from "react";
const FormBridgeContext = createContext(null);
function normalizeBridgeKey(value) {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
export function FormBridgeProvider({ children }) {
    const registryRef = useRef(new Map());
    const registerField = useCallback((descriptor) => {
        registryRef.current.set(descriptor.id, descriptor);
        return () => {
            registryRef.current.delete(descriptor.id);
        };
    }, []);
    const getRegisteredFields = useCallback(() => {
        return Array.from(registryRef.current.values()).map((f) => ({
            id: f.id,
            label: f.label,
            type: f.type,
            value: f.getValue(),
            ...(f.options ? { options: f.options } : {}),
        }));
    }, []);
    const resolveField = useCallback((entryId) => {
        const directMatch = registryRef.current.get(entryId);
        if (directMatch)
            return directMatch;
        const normalizedEntryId = normalizeBridgeKey(entryId);
        if (!normalizedEntryId)
            return null;
        for (const field of registryRef.current.values()) {
            const candidates = [field.id, field.label, ...(field.aliases ?? [])]
                .map((candidate) => normalizeBridgeKey(candidate))
                .filter(Boolean);
            if (candidates.includes(normalizedEntryId)) {
                return field;
            }
        }
        return null;
    }, []);
    const fillFields = useCallback((entries) => {
        let filled = 0;
        for (const entry of entries) {
            const field = resolveField(entry.id);
            if (field) {
                field.setValue(entry.value);
                filled++;
            }
        }
        return filled;
    }, [resolveField]);
    return (_jsx(FormBridgeContext.Provider, { value: { registerField, getRegisteredFields, fillFields }, children: children }));
}
export function useFormBridgeContext() {
    const ctx = useContext(FormBridgeContext);
    if (!ctx) {
        // Return a no-op implementation when outside provider (graceful fallback)
        return {
            registerField: () => () => { },
            getRegisteredFields: () => [],
            fillFields: () => 0,
        };
    }
    return ctx;
}
