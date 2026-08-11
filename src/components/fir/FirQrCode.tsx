import { QRCodeSVG } from "qrcode.react";

export interface FirQrData {
  numero_fir: string;
  cer?: string | null;
  produttore?: string | null;
  trasportatore?: string | null;
  destinatario?: string | null;
  quantita?: number | string | null;
  unita_misura?: string | null;
  data_partenza?: string | null;
}

/**
 * Payload strutturato del QR: identificativo univoco del FIR + dati sintetici
 * necessari a ricostruire la movimentazione in caso di controllo su strada.
 */
export function buildFirQrPayload(data: FirQrData): string {
  const rows = [
    `FIR:${data.numero_fir ?? ""}`,
    data.cer ? `EER:${data.cer}` : null,
    data.produttore ? `PRO:${data.produttore}` : null,
    data.trasportatore ? `TRA:${data.trasportatore}` : null,
    data.destinatario ? `DES:${data.destinatario}` : null,
    data.quantita ? `QTA:${data.quantita}${data.unita_misura ?? "kg"}` : null,
    data.data_partenza ? `DATA:${data.data_partenza}` : null,
  ].filter(Boolean);
  return rows.join("|");
}

interface Props extends FirQrData {
  /** Lato in millimetri (default 28mm, come da specifica RENTRI). */
  sizeMm?: number;
  showCaption?: boolean;
}

/** QR code del formulario, dimensionato 28x28 mm per la stampa. */
export function FirQrCode({ sizeMm = 28, showCaption = true, ...data }: Props) {
  const px = Math.round((sizeMm / 25.4) * 96);
  const payload = buildFirQrPayload(data);

  if (!data.numero_fir) return null;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className="bg-white p-1 rounded"
        style={{ width: px + 8, height: px + 8 }}
        data-testid="fir-qr-code"
      >
        <QRCodeSVG value={payload} size={px} level="M" marginSize={0} />
      </div>
      {showCaption && (
        <span className="text-[10px] font-mono tracking-tight text-muted-foreground">
          {data.numero_fir}
        </span>
      )}
    </div>
  );
}
