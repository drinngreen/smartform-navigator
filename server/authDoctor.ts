// @ts-nocheck
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BRIDGE = 'http://localhost:8765';
const AUTH = ' `https://identity.ecocerved.it/connect/token` ';
const P12_FILE = 'certificato.p12';

const CANDIDATES = [
    '0fb6fc18-f6bf-4a7c-b814-2c73bd2e00f1',
    '08934760961',
    '08934760961',
    '12347770013'
];

async function testLogin(clientId: string) {
    console.log(`\n---------------------------------------------------`);
    console.log(`TESTING CLIENT_ID: ${clientId}`);

    try {
        const now = Math.floor(Date.now() / 1000);
        const jwtHeader = { alg: 'ES256', typ: 'JWT' };
        const jwtPayload = {
            iss: clientId,
            sub: clientId,
            aud: AUTH,
            jti: uuidv4(),
            iat: now,
            exp: now + 120
        };

        const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
        const unsigned = `${b64(jwtHeader)}.${b64(jwtPayload)}`;

        const signRes = await axios.post(`${BRIDGE}/sign-raw`, {
            payloadBase64: Buffer.from(unsigned).toString('base64'),
            filename: P12_FILE
        });

        if (!signRes.data.signature) {
            console.log('❌ ERRORE FIRMA BRIDGE (Controlla finestra nera)');
            return;
        }

        const signature = Buffer.from(signRes.data.signature, 'base64').toString('base64url');
        const assertion = `${unsigned}.${signature}`;

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        params.append('client_assertion', assertion);
        params.append('client_id', clientId);
        params.append('scope', 'rentri');

        const res = await axios.post(AUTH, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log(`✅ SUCCESSO!!! IL TOKEN È: ${res.data.access_token.substring(0, 20)}...`);
        console.log(`>>> USA QUESTO CLIENT ID NEL CODICE: ${clientId} <<<`);
    } catch (e: any) {
        const errData = e.response?.data || e.message;
        console.log(`❌ FALLITO:`, JSON.stringify(errData));
    }
}

async function run() {
    console.log('AVVIO AUTH DOCTOR - CERCO IL CLIENT ID GIUSTO...');
    for (const id of CANDIDATES) {
        await testLogin(id);
    }
    console.log('\n---------------------------------------------------');
    console.log('TEST COMPLETATO.');
}

run();
