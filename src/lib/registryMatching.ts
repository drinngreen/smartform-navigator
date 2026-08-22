const normalizeRegistryValue = (value?: string | null) =>
  String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const collectMatchingRegistryIds = (
  selected: { id: string; ragione_sociale?: string | null; codice_fiscale?: string | null; partita_iva?: string | null },
  rows: Array<{ id: string; ragione_sociale?: string | null; codice_fiscale?: string | null; partita_iva?: string | null }>,
) => {
  const identifiers = new Set(
    [selected.codice_fiscale, selected.partita_iva]
      .map(normalizeRegistryValue)
      .filter((value) => value.length > 3),
  );
  const selectedName = normalizeRegistryValue(selected.ragione_sociale);
  return Array.from(new Set([
    selected.id,
    ...rows
      .filter((row) => {
        const rowIdentifiers = [row.codice_fiscale, row.partita_iva].map(normalizeRegistryValue);
        if (identifiers.size > 0 && rowIdentifiers.some((value) => identifiers.has(value))) return true;
        return selectedName.length > 2 && normalizeRegistryValue(row.ragione_sociale) === selectedName;
      })
      .map((row) => row.id),
  ]));
};

export { normalizeRegistryValue };