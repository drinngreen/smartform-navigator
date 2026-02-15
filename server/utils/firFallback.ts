
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export async function generateFallbackPDF(data: any, errorMsg: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `fallback_fir_${Date.now()}.pdf`;
      // Save to a public accessible folder if possible, or temp
      // Assuming 'public' folder exists or we create 'temp_pdfs'
      const outDir = path.resolve(process.cwd(), 'temp_pdfs');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
      
      const filePath = path.join(outDir, filename);
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // --- HEADER ---
      doc.fontSize(20).text('DOCUMENTO DI EMERGENZA / FIR PROVVISORIO', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('Generato per indisponibilità del sistema RENTRI', { align: 'center' });
      doc.moveDown();
      
      // --- ERROR BOX ---
      doc.rect(50, doc.y, 500, 60).stroke();
      doc.text(`ERRORE RENTRI: ${errorMsg}`, 60, doc.y + 10, { width: 480, align: 'center' });
      doc.moveDown(4);

      // --- QR CODE ---
      // Generate QR with essential data + error
      const qrData = JSON.stringify({
        type: 'FIR_FALLBACK',
        timestamp: new Date().toISOString(),
        producer: data.produttore?.codiceFiscale || 'N/A',
        eer: data.rifiuto?.codice_eer || 'N/A',
        error: errorMsg
      });
      
      const qrBase64 = await QRCode.toDataURL(qrData);
      doc.image(qrBase64, 200, doc.y, { fit: [200, 200], align: 'center' });
      doc.moveDown(12);

      // --- DETAILS ---
      doc.fontSize(14).text('Dettagli Operazione:', { underline: true });
      doc.fontSize(12);
      doc.moveDown(0.5);
      
      const printField = (label: string, value: any) => {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(String(value || 'N/A'));
      };

      printField('Data Emissione', new Date().toISOString());
      printField('Produttore (CF)', data.produttore?.codiceFiscale);
      printField('Unità Locale', data.produttore?.unitaLocaleId);
      printField('Rifiuto (EER)', data.rifiuto?.codice_eer);
      printField('Quantità (kg)', data.rifiuto?.quantita?.valore);
      printField('Trasportatore', data.trasportatore?.denominazione || 'Da compilare a mano');
      printField('Destinatario', data.destinatario?.denominazione || 'Da compilare a mano');

      doc.moveDown(2);
      
      // --- LEGAL DISCLAIMER ---
      doc.fontSize(10).font('Helvetica-Oblique');
      doc.text(
        "Il presente documento sostituisce il Formulario di Identificazione Rifiuti (FIR) digitale " +
        "ai sensi della normativa vigente in caso di malfunzionamento o indisponibilità del sistema centrale RENTRI. " +
        "L'operatore è tenuto a conservare questo documento e a regolarizzare la posizione non appena il servizio sarà ripristinato.",
        { align: 'justify' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (e) {
      reject(e);
    }
  });
}
