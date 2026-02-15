
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function inspect(key: string) {
    const config = COMPANIES[key];
    console.log(`\n--- INSPECTING CERTIFICATE FOR ${config.name} (${key}) ---`);
    console.log(`File: ${config.p12File}`);
    try {
        const res = await axios.get(`${BRIDGE_URL}/whoami?filename=${config.p12File}`);
        if (res.status === 200) {
            console.log("✅ CERTIFICATE DETAILS:");
            console.log("   Subject:", res.data.subject);
            console.log("   Thumbprint:", res.data.thumbprint);
            console.log("   DN Qualifier (Codice Fiscale Personale?):", res.data.dnQualifier);
            console.log("   Organization Identifier (P.IVA Azienda?):", res.data.organizationIdentifier);
            console.log("   Mapped Issuer in Bridge:", res.data.mappedIssuer);
        } else {
            console.log("❌ Failed to inspect:", res.status, res.statusText);
        }
    } catch (e: any) {
        console.log("❌ Exception:", e.message);
    }
}

async function main() {
    await inspect('global');
    await inspect('multy');
    await inspect('niyol');
}

main();
