import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    console.log("--- TEST: GESTIONE VIDIMAZIONE ---");
    const client = await createClient('global');
    
    // 1. Inspect existing FIR from Legacy Block FMGWB
    // User suggested: GET /vidimazione-formulari/v1.0/{codice_blocco}/{progressivo}
    const blockLegacy = 'FMGWB';
    const progLegacy = 66800;
    
    // Possible paths to try for inspection
    const inspectPaths = [
        `/vidimazione-formulari/v1.0/${blockLegacy}/${progLegacy}`,
        `/vidimazione-formulari/v1.0/formulari/${blockLegacy}/${progLegacy}`,
        `/vidimazione-formulari/v1.0/vidimazioni/${blockLegacy}/${progLegacy}`
    ];

    console.log(`\n1. Inspecting Legacy FIR (${blockLegacy} #${progLegacy})...`);
    for (const path of inspectPaths) {
        console.log(`Trying GET ${path}...`);
        try {
            const res = await client.get(path);
            console.log("✅ SUCCESS!");
            console.log(JSON.stringify(res, null, 2));
            break; 
        } catch (e: any) {
            console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`);
        }
    }

    // 2. Vidimate NEW FIR on New Block SKKZR
    // User suggested: POST /vidimazione-formulari/v1.0/SKKZR
    const blockNew = 'SKKZR';
    const vidimatePaths = [
        `/vidimazione-formulari/v1.0/${blockNew}`,
        `/vidimazione-formulari/v1.0/vidimazione/${blockNew}`,
        `/vidimazione-formulari/v1.0/vidimazione?codice_blocco=${blockNew}`
    ];

    console.log(`\n2. Vidimating NEW FIR on Block ${blockNew}...`);
    for (const path of vidimatePaths) {
        console.log(`Trying POST ${path}...`);
        try {
            // Some APIs might require a body, even empty
            const res = await client.post(path, {}); 
            console.log("✅ SUCCESS!");
            console.log(JSON.stringify(res, null, 2));
            break;
        } catch (e: any) {
            console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`);
            // If 405 Method Not Allowed, maybe it's a GET or PUT? Unlikely for "creation"
        }
    }
}

run();
