import React, { createContext, useContext, useCallback, useRef } from "react";

export interface FieldDescriptor {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea" | "checkbox";
  getValue: () => string;
  setValue: (value: string) => void;
  options?: string[]; // for select fields
  aliases?: string[];
}

export interface FormBridgeEntry {
  id: string;
  value: string;
}

interface FormBridgeContextValue {
  registerField: (descriptor: FieldDescriptor) => () => void;
  getRegisteredFields: () => { id: string; label: string; type: string; value: string; options?: string[] }[];
  fillFields: (entries: FormBridgeEntry[]) => number;
}

const FormBridgeContext = createContext<FormBridgeContextValue | null>(null);

function normalizeBridgeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function FormBridgeProvider({ children }: { children: React.ReactNode }) {
  const registryRef = useRef<Map<string, FieldDescriptor>>(new Map());

  const registerField = useCallback((descriptor: FieldDescriptor) => {
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

  const resolveField = useCallback((entryId: string) => {
    const directMatch = registryRef.current.get(entryId);
    if (directMatch) return directMatch;

    const normalizedEntryId = normalizeBridgeKey(entryId);
    if (!normalizedEntryId) return null;

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

  const fillFields = useCallback((entries: FormBridgeEntry[]) => {
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

  return (
    <FormBridgeContext.Provider value={{ registerField, getRegisteredFields, fillFields }}>
      {children}
    </FormBridgeContext.Provider>
  );
}

export function useFormBridgeContext() {
  const ctx = useContext(FormBridgeContext);
  if (!ctx) {
    // Return a no-op implementation when outside provider (graceful fallback)
    return {
      registerField: () => () => {},
      getRegisteredFields: () => [],
      fillFields: () => 0,
    } as FormBridgeContextValue;
  }
  return ctx;
}
