export function toRentriImageSrc(raw) {
    const value = String(raw ?? "").trim();
    if (!value)
        return null;
    if (value.startsWith("data:image/"))
        return value;
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/"))
        return value;
    const compact = value.replace(/\s+/g, "");
    return compact ? `data:image/png;base64,${compact}` : null;
}
export function toRentriPdfPreviewSrc(base64Raw, urlRaw) {
    const base64Value = String(base64Raw ?? "").trim();
    if (base64Value) {
        try {
            const cleaned = base64Value
                .replace(/^data:application\/pdf;base64,/, "")
                .replace(/\s+/g, "");
            const blob = new Blob([Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0))], { type: "application/pdf" });
            return URL.createObjectURL(blob);
        }
        catch {
            // fallback to URL if base64 is malformed
        }
    }
    const urlValue = String(urlRaw ?? "").trim();
    if (urlValue.startsWith("http://") || urlValue.startsWith("https://") || urlValue.startsWith("/")) {
        return urlValue;
    }
    return null;
}
