
import axios from 'axios';
import https from 'https';
import { CONFIG, getP12 } from './config';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import forge from 'node-forge';

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OPENSSL_PATH = '"C:\\Program Files\\Git\\usr\\bin\\openssl.exe"';

// Extract Credentials from P12 using OpenSSL
function extractCredentialsFromP12(p12Buffer: Buffer, password: string): { key: string, certChain: string[] } {
    console.log(`[DEBUG] Extracting Credentials via OpenSSL...`);
    const tempId = uuidv4();
    const p12File = path.resolve(`temp_${tempId}.p12`);
    const passFile = path.resolve(`temp_${tempId}.pass`);
    const keyFile = path.resolve(`temp_${tempId}.key`);
    const certFile = path.resolve(`temp_${tempId}.crt`);

    try {
        fs.writeFileSync(p12File, p12Buffer);
        fs.writeFileSync(passFile, password);

        // Extract Key
        execSync(`${OPENSSL_PATH} pkcs12 -in "${p12File}" -nocerts -out "${keyFile}" -nodes -passin file:"${passFile}"`, { stdio: 'pipe' });
        
        // Extract Leaf Cert
        const leafFile = path.resolve(`temp_${tempId}_leaf.crt`);
        execSync(`${OPENSSL_PATH} pkcs12 -in "${p12File}" -nokeys -clcerts -out "${leafFile}" -passin file:"${passFile}"`, { stdio: 'pipe' });

        // Debug Subject
        try {
            const subject = execSync(`${OPENSSL_PATH} x509 -in "${leafFile}" -noout -subject`, { encoding: 'utf8' });
            const issuerStr = execSync(`${OPENSSL_PATH} x509 -in "${leafFile}" -noout -issuer`, { encoding: 'utf8' });
            console.log(`[DEBUG] Leaf Cert Subject: ${subject.trim()}`);
            console.log(`[DEBUG] Leaf Cert Issuer: ${issuerStr.trim()}`);
        } catch (e) {
            console.log('[DEBUG] Failed to get cert info via openssl');
        }

        // Extract CA Certs
        const caFile = path.resolve(`temp_${tempId}_ca.crt`);
        execSync(`${OPENSSL_PATH} pkcs12 -in "${p12File}" -nokeys -cacerts -out "${caFile}" -passin file:"${passFile}"`, { stdio: 'pipe' });

        if (fs.existsSync(keyFile) && fs.existsSync(leafFile)) {
            const keyPem = fs.readFileSync(keyFile, 'utf8');
            const leafPem = fs.readFileSync(leafFile, 'utf8');
            const caPem = fs.existsSync(caFile) ? fs.readFileSync(caFile, 'utf8') : '';
            
            const certChain: string[] = [];

            // Helper to clean PEM
            const cleanPem = (pem: string) => pem
                .replace(/-----BEGIN CERTIFICATE-----/g, '')
                .replace(/-----END CERTIFICATE-----/g, '')
                .replace(/\r\n/g, '')
                .replace(/\n/g, '')
                .trim();

            // Add Leaf first
            const leafMatches = leafPem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
            if (leafMatches) leafMatches.forEach(c => certChain.push(cleanPem(c)));

            // Add CA certs
            const caMatches = caPem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
            if (caMatches) caMatches.forEach(c => certChain.push(cleanPem(c)));

            console.log(`[DEBUG] Credentials extracted. Key len: ${keyPem.length}, Cert chain length: ${certChain.length}`);
            return { key: keyPem, certChain };
        } else {
            throw new Error("OpenSSL did not produce key or cert file");
        }

    } catch (err: any) {
        console.error(`[DEBUG] OpenSSL extraction failed: ${err.message}`);
        throw err;
    } finally {
        if (fs.existsSync(p12File)) fs.unlinkSync(p12File);
        if (fs.existsSync(passFile)) fs.unlinkSync(passFile);
        if (fs.existsSync(keyFile)) fs.unlinkSync(keyFile);
        const leafFile = path.resolve(`temp_${tempId}_leaf.crt`);
        const caFile = path.resolve(`temp_${tempId}_ca.crt`);
        if (fs.existsSync(leafFile)) fs.unlinkSync(leafFile);
        if (fs.existsSync(caFile)) fs.unlinkSync(caFile);
    }
}

// RENTRI Auth Headers Generator
function generateAuthHeaders(p12Buffer: Buffer, password: string, issuer: string, payload: any = "") {
    // 1. Generate JWT
    const { key: privateKeyPem, certChain } = extractCredentialsFromP12(p12Buffer, password);
    console.log('[DEBUG] Signing JWT...');

    try {
        // Detect key type or default to ES256 (EC) as per error message
        const algorithm = privateKeyPem.includes('BEGIN EC PRIVATE KEY') || privateKeyPem.includes('BEGIN PRIVATE KEY') ? 'ES256' : 'RS256';
        console.log(`[DEBUG] Signing JWT with algorithm: ${algorithm}`);

        const token = jwt.sign(
            { 
                iss: issuer,
                sub: issuer,
                aud: CONFIG.audience,
                jti: uuidv4(),
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 600 // 10 mins
            },
            privateKeyPem,
            { 
                algorithm: algorithm as jwt.Algorithm,
                header: {
                    typ: 'JWT',
                    alg: algorithm as jwt.Algorithm,
                    x5c: [certChain[0]]
                }
            }
        );

        // 2. Digest Header
        const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const digestHash = crypto.createHash('sha256').update(bodyStr).digest('base64');
        const digestHeader = `SHA-256=${digestHash}`;
        
        // 3. Integrity Token (Agid-JWT-Signature)
        const signedHeaders: any[] = [
            { "digest": digestHeader }
        ];
        
        if (payload && payload !== "") {
            signedHeaders.push({ "content-type": "application/json" });
        }

        console.log('[DEBUG] Signing Integrity Token...');
        const integrityToken = jwt.sign(
            { 
                iss: issuer,
                sub: issuer,
                aud: CONFIG.audience,
                jti: uuidv4(),
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 600, // 10 mins
                signed_headers: signedHeaders
            },
            privateKeyPem,
            { 
                algorithm: algorithm as jwt.Algorithm,
                header: {
                    typ: 'JWT',
                    alg: algorithm as jwt.Algorithm,
                    x5c: [certChain[0]]
                }
            }
        );

        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Agid-JWT-Signature': integrityToken,
            'Digest': digestHeader,
            'Accept': 'application/json, application/problem+json'
        };

        if (payload && payload !== "") {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    } catch (e: any) {
        console.error('[DEBUG] JWT Signing Error:', e.message);
        throw e;
    }
}

export async function createClient(companyKey: 'global' | 'multy' | 'niyol') {
    const conf = CONFIG.companies[companyKey];
    const p12 = getP12(companyKey);
    
    const httpsAgent = new https.Agent({
        pfx: p12,
        passphrase: conf.p12Password,
        rejectUnauthorized: false
    });

    return {
        get: async (path: string) => {
            const url = `${CONFIG.baseUrl}${path}`;
            console.log(`GET ${url}`);
            
            const headers = generateAuthHeaders(p12, conf.p12Password, conf.issuer);
            
            try {
                const res = await axios.get(url, {
                    headers,
                    httpsAgent
                });
                return res.data;
            } catch (error: any) {
                if (error.response) {
                    console.error(`Error ${error.response.status}:`, JSON.stringify(error.response.data, null, 2));
                    throw new Error(`API Error: ${error.response.status}`);
                }
                throw error;
            }
        },
        post: async (path: string, data: any) => {
            const url = `${CONFIG.baseUrl}${path}`;
            console.log(`POST ${url}`);
            
            const headers = generateAuthHeaders(p12, conf.p12Password, conf.issuer, data);
            
            try {
                const res = await axios.post(url, data, {
                    headers,
                    httpsAgent
                });
                return res.data;
            } catch (error: any) {
                if (error.response) {
                    console.error(`Error ${error.response.status}:`, JSON.stringify(error.response.data, null, 2));
                    throw new Error(`API Error: ${error.response.status}`);
                }
                throw error;
            }
        }
    };
}
