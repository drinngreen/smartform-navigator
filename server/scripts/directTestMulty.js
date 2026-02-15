
import forge from 'node-forge';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const P12_PATH = path.resolve(__dirname, '../../bridge-service/multyproget.p12');
const PASSWORD = '1k+F_9nN';
const CLIENT_ID = '12347770013'; // Usually CF
const BASE_URL = 'https://api.rentri.gov.it';

async function main() {
    console.log('Reading P12 from:', P12_PATH);
    const p12Buffer = fs.readFileSync(P12_PATH);
    const p12Base64 = p12Buffer.toString('base64');
    
    // Parse P12
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, PASSWORD);

    // Get Key and Cert
    let keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag) {
        keyBag = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
    }
    const privateKey = keyBag[0].key;
    
    const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
    console.log('CertBags found:', certBag ? certBag.length : 0);
    
    let certificate = null;
    if(certBag) {
         for(let i=0; i<certBag.length; i++) {
              console.log(`CertBag ${i}: Checking manual parse...`);
              try {
                  const safeBag = certBag[i].asn1;
                  const bagContent = safeBag.value[1].value[0]; 
                  const certValue = bagContent.value[1];
                  const octetString = certValue.value[0];
                  const certDer = octetString.value; 
                  
                  console.log("Extracted DER bytes length:", certDer.length);
                  
                  const b64 = forge.util.encode64(certDer);
                  const pem = `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
                  
                  const cert = forge.pki.certificateFromPem(pem);
                  console.log("Cert parsed manually! Serial:", cert.serialNumber);
                  
                  // Check serial 100005490 (decimal) = 5F5E452 (hex)
                  if(cert.serialNumber === '05f5e452' || cert.serialNumber === '5f5e452') {
                      certificate = cert;
                      break;
                  }
                  
                  // If we can't match serial, just take the first valid one that looks like a user cert?
                  // Or just take the last one.
                  certificate = cert;
              } catch(e) {
                  console.log("Manual parse failed:", e.message);
              }
         }
     }
    
    if(!certificate) throw new Error("No cert found");
    
    const certPem = forge.pki.certificateToPem(certificate);
    // Extract base64 body of cert for x5c
    const certBase64 = certPem.replace('-----BEGIN CERTIFICATE-----', '').replace('-----END CERTIFICATE-----', '').replace(/\r\n/g, '').replace(/\n/g, '');

    console.log('Certificate extracted. Serial:', certificate.serialNumber);

    // Create JWT
    const header = {
        alg: 'RS256',
        typ: 'JWT',
        x5c: [certBase64]
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: CLIENT_ID,
        sub: CLIENT_ID,
        aud: BASE_URL,
        iat: now,
        exp: now + 600, // 10 min validity
        jti: forge.util.bytesToHex(forge.random.getBytesSync(16))
    };

    const stringHeader = JSON.stringify(header);
    const stringPayload = JSON.stringify(payload);
    const encodedHeader = forge.util.encode64(stringHeader).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = forge.util.encode64(stringPayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const signatureInput = encodedHeader + '.' + encodedPayload;
    
    const md = forge.md.sha256.create();
    md.update(signatureInput, 'utf8');
    const signature = privateKey.sign(md);
    const encodedSignature = forge.util.encode64(signature).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    console.log('JWT Generated.');

    // Prepare Request
    // Try correct payload: CF (no IT) + UL (Operator ID)
    const requestBody = {
        tipoFormulario: "FIR",
        produttore: {
            codiceFiscale: CLIENT_ID, 
            unitaLocaleId: "OP2501XMQ021914" 
        },
        quantita: 1
    };

    try {
        console.log('Sending request to RENTRI...');
        const res = await axios.post(`${BASE_URL}/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=FRVKM`, requestBody, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
                'Rentri-Software-House-Id': 'DEVELOPER' // Optional?
            }
        });

        console.log('RESPONSE STATUS:', res.status);
        console.log('RESPONSE DATA:', JSON.stringify(res.data, null, 2));

    } catch (err) {
        if (err.response) {
            console.error('ERROR STATUS:', err.response.status);
            console.error('ERROR DATA:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('ERROR:', err.message);
        }
    }
}

main();
