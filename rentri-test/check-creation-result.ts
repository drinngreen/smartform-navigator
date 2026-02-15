import { createClient } from './client';

async function run() {
    const txId = process.argv[2] || 'b2ce64ca-0f96-43f3-82e8-507ba33b754f';
    console.log(`--- TEST: CHECK CREATION RESULT (${txId}) ---`);
    const client = await createClient('global');

    const paths = [
        `/formulari/v1.0/transazioni/${txId}`,
        `/formulari/v1.0/${txId}/result`,
        `/formulari/v1.0/transazioni/${txId}/result`,
        `/formulari/v1.0/result/${txId}`
    ];

    for (const path of paths) {
        console.log(`\nTrying GET ${path} ...`);
        try {
            const res = await client.get(path);
            console.log("✅ SUCCESS!");
            console.log(JSON.stringify(res, null, 2));
            break;
        } catch (e: any) {
            console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`);
        }
    }
}

run();
