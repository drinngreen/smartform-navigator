// @ts-nocheck
import { XMLParser } from 'fast-xml-parser';

export interface FirData {
  firType: 'carico' | 'scarico';
  firNumber?: string;
  firDate?: Date;
}

export function parseFirXml(xmlContent: string): FirData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  try {
    const result = parser.parse(xmlContent);
    
    let firType: 'carico' | 'scarico' = 'carico';
    let firNumber: string | undefined;
    let firDate: Date | undefined;

    if (result.registro_carico_scarico?.movimenti?.movimento) {
      const mov = Array.isArray(result.registro_carico_scarico.movimenti.movimento)
        ? result.registro_carico_scarico.movimenti.movimento[0]
        : result.registro_carico_scarico.movimenti.movimento;

      if (mov.tipo) {
        firType = mov.tipo.toLowerCase().includes('scarico') ? 'scarico' : 'carico';
      }
      
      if (mov.progressivo) {
        firNumber = String(mov.progressivo);
      }
      
      if (mov.data) {
        firDate = new Date(mov.data);
      }
    }
    else if (result.FIR) {
      const fir = result.FIR;
      if (fir.TipoMovimento || fir['@_tipo']) {
        const tipo = fir.TipoMovimento || fir['@_tipo'];
        firType = tipo.toLowerCase().includes('scarico') ? 'scarico' : 'carico';
      }
      if (fir.NumeroFIR || fir['@_numero']) {
        firNumber = String(fir.NumeroFIR || fir['@_numero']);
      }
      if (fir.DataFIR || fir['@_data']) {
        const dateStr = fir.DataFIR || fir['@_data'];
        firDate = new Date(dateStr);
      }
    }

    return {
      firType,
      firNumber,
      firDate,
    };
  } catch (error: any) {
    throw new Error(`Errore durante il parsing del FIR XML: ${error.message}`);
  }
}

export function validateFirXml(xmlContent: string): boolean {
  try {
    parseFirXml(xmlContent);
    return true;
  } catch {
    return false;
  }
}