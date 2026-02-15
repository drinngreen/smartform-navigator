import { Router } from 'express';
import { RentriService } from './service.ts';
import { CompanyKey } from './config.ts';

export const rentriRouter = Router();

// Endpoint 1: Vidimazione (Get new FIR Number)
rentriRouter.post('/vidimate', async (req, res) => {
    try {
        const { company } = req.body;
        if (!company) {
             res.status(400).json({ error: "Missing company" });
             return;
        }
        
        const firNumber = await RentriService.vidimateFir(company as CompanyKey);
        res.json({ firNumber });
    } catch (e: any) {
        console.error("Vidimate Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint 2: Creation (Emission)
rentriRouter.post('/create', async (req, res) => {
    try {
        const { company, payload } = req.body;
        if (!company || !payload) {
             res.status(400).json({ error: "Missing company or payload" });
             return;
        }

        const result = await RentriService.createFir(company as CompanyKey, payload);
        res.json(result);
    } catch (e: any) {
        console.error("Create Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint 3: Unified "Firma FIR" (Vidimate if needed + Create)
// Matches user request structure: { societaId, payloadFir }
rentriRouter.post('/firma-fir', async (req, res) => {
    try {
        const { societaId, payloadFir } = req.body;
        
        // Map societaId to companyKey if needed, or assume they match
        // Valid keys: 'global', 'multy', 'niyol'
        const company = societaId as CompanyKey; 

        if (!company || !payloadFir) {
             res.status(400).json({ error: "Missing societaId or payloadFir" });
             return;
        }

        // Check if payload has a FIR number. If not, vidimate one.
        let firNumber = payloadFir.dati_partenza?.numero_fir;
        
        if (!firNumber) {
            console.log(`[Firma-FIR] No FIR number provided for ${company}. Vidimating new one...`);
            try {
                firNumber = await RentriService.vidimateFir(company);
                // Inject into payload
                if (!payloadFir.dati_partenza) payloadFir.dati_partenza = {};
                payloadFir.dati_partenza.numero_fir = firNumber;
                console.log(`[Firma-FIR] Injected new FIR Number: ${firNumber}`);
            } catch (vidError: any) {
                console.error(`[Firma-FIR] Vidimation failed: ${vidError.message}`);
                 res.status(500).json({ error: `Vidimation failed: ${vidError.message}` });
                 return;
            }
        }

        const result = await RentriService.createFir(company, payloadFir);
        res.json(result);

    } catch (e: any) {
        console.error("[Firma-FIR] Error:", e);
        res.status(500).json({ error: e.message });
    }
});
