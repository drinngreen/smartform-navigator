import axios from 'axios';
import https from 'https';
import { RENTRI_CONFIG, getP12, CompanyKey } from './config.ts';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Determine OpenSSL Path
const isWindows = os.platform() === 'win32';
const GIT_OPENSSL = 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';
// If on Windows and Git OpenSSL exists, use it. Otherwise assume 'openssl' is in PATH (e.g. Render)
const OPENSSL_CMD = (isWindows && fs.existsSync(GIT_OPENSSL)) ? GIT_OPENSSL : 'openssl'; 

function extractCredentialsFromP12(p12Buffer: Buffer, password: string): { key: string, certChain: string[] } {
    const tempId = uuidv4();
    const tmpDir = os.tmpdir();
    const p12File = path.join(tmpDir, `temp_${tempId}.p12`);
    const passFile = path.join(tmpDir, `temp_${tempId}.pass`);
    const keyFile = path.join(tmpDir, `temp_${tempId}.key`);
    const leafFile = path.join(tmpDir, `temp_${tempId}_leaf.crt`);
    const caFile = path.join(tmpDir, `temp_${tempId}_ca.crt`);

    try {
        fs.writeFileSync(p12File, p12Buffer);
        fs.writeFileSync(passFile, password);

        // 1. Extract Key
        // -nodes: don't encrypt the output key
        execSync(`"${OPENSSL_CMD}" pkcs12 -in "${p12File}" -nocerts -out "${keyFile}" -nodes -passin file:"${passFile}"`, { stdio: 'pipe' });
        
        // 2. Extract Leaf Cert (-clcerts)
        execSync(`"${OPENSSL_CMD}" pkcs12 -in "${p12File}" -nokeys -clcerts -out "${leafFile}" -passin file:"${passFile}"`, { stdio: 'pipe' });

        // 3. Extract CA Certs (-cacerts)
        execSync(`"${OPENSSL_CMD}" pkcs12 -in "${p12File}" -nokeys -cacerts -out "${caFile}" -passin file:"${passFile}"`, { stdio: 'pipe' });

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

            return { key: keyPem, certChain };
        } else {
            throw new Error("OpenSSL did not produce key or cert file");
        }

    } catch (err: any) {
        console.error(`[OpenSSL] Extraction failed: ${err.message}`);
        throw new Error(`Failed to extract credentials: ${err.message}`);
    } finally {
        // Cleanup
        [p12File, passFile, keyFile, leafFile, caFile].forEach(f => {
            if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
        });
    }
}

function generateAuthHeaders(p12Buffer: Buffer, password: string, issuer: string, payload: any = "") {
    const { key: privateKeyPem, certChain } = extractCredentialsFromP12(p12Buffer, password);

    // Detect key type
    // Note: RENTRI certs seem to be ECDSA. OpenSSL PKCS8 output uses 'BEGIN PRIVATE KEY'.
    // If it was RSA, it might be 'BEGIN RSA PRIVATE KEY' or 'BEGIN PRIVATE KEY'.
    // Given the error 'key type must be one of: ES256...', we know it's EC.
    // We'll use the logic from the working test client.
    const algorithm = (privateKeyPem.includes('BEGIN EC PRIVATE KEY') || privateKeyPem.includes('BEGIN PRIVATE KEY')) ? 'ES256' : 'RS256';

    const tokenPayload = {
        iss: issuer,
        sub: issuer,
        aud: RENTRI_CONFIG.audience,
        jti: uuidv4(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600
    };

    const token = jwt.sign(tokenPayload, privateKeyPem, {
        algorithm: algorithm as jwt.Algorithm,
        header: {
            typ: 'JWT',
            alg: algorithm as jwt.Algorithm,
            x5c: [certChain[0]]
        }
    });

    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const digestHash = crypto.createHash('sha256').update(bodyStr).digest('base64');
    const digestHeader = `SHA-256=${digestHash}`;

    const signedHeaders: any[] = [{ "digest": digestHeader }];
    if (payload && payload !== "") {
        signedHeaders.push({ "content-type": "application/json" });
    }

    const integrityToken = jwt.sign(
        { ...tokenPayload, signed_headers: signedHeaders },
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
}

export async function createClient(companyKey: CompanyKey) {
    const conf = RENTRI_CONFIG.companies[companyKey];
    const p12 = getP12(companyKey);
    
    const httpsAgent = new https.Agent({
        pfx: p12,
        passphrase: conf.p12Password,
        rejectUnauthorized: false
    });

    const request = async (method: 'GET' | 'POST', path: string, data?: any, options: any = {}) => {
        const url = `${RENTRI_CONFIG.baseUrl}${path}`;
        // Note: Extracting credentials every time is inefficient (IO heavy).
        // Ideally we should cache the key/cert chain.
        // But for this task, it's safer to just do it.
        const headers = generateAuthHeaders(p12, conf.p12Password, conf.issuer, data);
        
        try {
            const res = await axios({
                method,
                url,
                data,
                headers,
                httpsAgent,
                ...options
            });
            return res.data;
        } catch (error: any) {
            if (error.response) {
                console.error(`RENTRI API Error [${method} ${path}]: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
                const e: any = new Error(`RENTRI API Error: ${error.response.status}`);
                e.status = error.response.status;
                e.data = error.response.data;
                throw e;
            }
            throw error;
        }
    };

    return {
        get: (path: string, options?: any) => request('GET', path, undefined, options),
        post: (path: string, data: any, options?: any) => request('POST', path, data, options)
    };
}
