/**
 * Estrazione testo da allegati per Dark Lemon.
 * Supporta: testo/codice, CSV/TSV, JSON/XML, Excel (xlsx/xls/csv), Word (docx),
 * PDF (inviato come file nativo al modello), immagini (vision).
 */
const TEXT_EXTENSIONS = new Set([
    "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml", "log", "ini", "conf", "env",
    "html", "htm", "css", "scss", "js", "jsx", "ts", "tsx", "sql", "sh", "py", "java", "rb", "go", "php", "c", "cpp", "h",
]);
const SHEET_EXTENSIONS = new Set(["xlsx", "xls", "xlsm", "xlsb", "ods", "csv", "tsv"]);
const MAX_TEXT_CHARS = 60000;
export function getExtension(name) {
    return name.split(".").pop()?.toLowerCase() || "";
}
export function isImageAttachment(type) {
    return type.startsWith("image/");
}
export function isPdfAttachment(type, name) {
    return type === "application/pdf" || getExtension(name) === "pdf";
}
function isTextLike(type, ext) {
    const t = type.toLowerCase();
    return t.startsWith("text/")
        || t.includes("json")
        || t.includes("xml")
        || t.includes("csv")
        || t.includes("javascript")
        || TEXT_EXTENSIONS.has(ext);
}
function truncate(text) {
    return text.length > MAX_TEXT_CHARS
        ? `${text.slice(0, MAX_TEXT_CHARS)}\n[...contenuto troncato...]`
        : text;
}
async function extractSheet(file) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const parts = [];
    for (const sheetName of wb.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false });
        if (csv.trim())
            parts.push(`# Foglio: ${sheetName}\n${csv}`);
    }
    return parts.join("\n\n");
}
async function extractDocx(file) {
    const mammoth = await import("mammoth");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || "";
}
async function extractPlainText(file) {
    return await file.text();
}
/**
 * Prova ad estrarre il testo di un file. Restituisce null se il contenuto
 * va gestito nativamente dal modello (immagini, PDF) o se non è estraibile.
 */
export async function extractAttachmentText(file) {
    const ext = getExtension(file.name);
    const type = (file.type || "").toLowerCase();
    try {
        if (isImageAttachment(type) || isPdfAttachment(type, file.name))
            return null;
        if (SHEET_EXTENSIONS.has(ext) || type.includes("spreadsheet") || type.includes("excel")) {
            const text = await extractSheet(file);
            return text ? truncate(text) : null;
        }
        if (ext === "docx" || type.includes("wordprocessingml")) {
            const text = await extractDocx(file);
            return text ? truncate(text) : null;
        }
        if (isTextLike(type, ext)) {
            const text = await extractPlainText(file);
            return text ? truncate(text) : null;
        }
        // Ultimo tentativo: prova a leggerlo come testo, se sembra leggibile lo usiamo
        const raw = await extractPlainText(file);
        const printable = raw.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, "");
        if (raw.length > 0 && printable.length / raw.length > 0.85) {
            return truncate(printable);
        }
        return null;
    }
    catch (error) {
        console.error("Estrazione allegato fallita:", file.name, error);
        return null;
    }
}
