import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
export default function ImportMassivo() {
    const [files, setFiles] = useState([]);
    const [companyP12, setCompanyP12] = useState('certificato.p12');
    const [registryId, setRegistryId] = useState('R6QSWHZ6HJV');
    const multyRegistri = [
        { id: 'RQEL39R7NS0', label: 'Intermediazione' },
        { id: 'RAH20NP7O40', label: 'Produttore-Destinatario' },
        { id: 'RQCTG1TP7NT0', label: 'Trasporto Conto Proprio' }
    ];
    useEffect(() => {
        if (companyP12 === 'multyproget.p12')
            setRegistryId('RQEL39R7NS0');
    }, [companyP12]);
    const [anno, setAnno] = useState(new Date().getFullYear());
    const [startProgressivo, setStartProgressivo] = useState('0000001');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [batchSize, setBatchSize] = useState(50);
    const [ratePerMinute, setRatePerMinute] = useState(600);
    const [count, setCount] = useState(0);
    const onDrop = (e) => { const fs = Array.from(e.target.files || []); setFiles(fs); setCount(fs.length); };
    const upload = async () => {
        if (files.length === 0)
            return;
        const arr = [];
        for (const f of files) {
            const txt = await f.text();
            arr.push({ filename: f.name, xmlContent: txt, companyP12 });
        }
        await axios.post('/api/fir.batchUpload', { files: arr });
    };
    const start = async () => {
        await axios.post('/api/fir.startMassive', { companyP12, registryId, anno, startProgressivo, date, ratePerMinute, batchSize });
    };
    return (_jsxs("div", { style: { padding: 16 }, children: [_jsx("h2", { children: "Import Massivo XML" }), _jsxs("div", { children: [_jsx("label", { children: "Operatore" }), _jsxs("select", { value: companyP12, onChange: e => setCompanyP12(e.target.value), children: [_jsx("option", { value: "certificato.p12", children: "Global Reco" }), _jsx("option", { value: "multyproget.p12", children: "Multy Proget" })] })] }), companyP12 === 'multyproget.p12' ? (_jsxs("div", { children: [_jsx("label", { children: "Registro" }), _jsx("select", { value: registryId, onChange: e => setRegistryId(e.target.value), children: multyRegistri.map(r => (_jsxs("option", { value: r.id, children: [r.id, " - ", r.label] }, r.id))) })] })) : (_jsxs("div", { children: [_jsx("label", { children: "Registro" }), _jsx("input", { value: registryId, onChange: e => setRegistryId(e.target.value) })] })), _jsxs("div", { children: [_jsx("label", { children: "Anno" }), _jsx("input", { type: "number", value: anno, onChange: e => setAnno(parseInt(e.target.value || `${new Date().getFullYear()}`)) })] }), _jsxs("div", { children: [_jsx("label", { children: "Progressivo iniziale" }), _jsx("input", { value: startProgressivo, onChange: e => setStartProgressivo(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { children: "Data registrazione" }), _jsx("input", { value: date, onChange: e => setDate(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { children: "Batch size" }), _jsx("input", { type: "number", value: batchSize, onChange: e => setBatchSize(parseInt(e.target.value || '50')) })] }), _jsxs("div", { children: [_jsx("label", { children: "Rate per minuto" }), _jsx("input", { type: "number", value: ratePerMinute, onChange: e => setRatePerMinute(parseInt(e.target.value || '600')) })] }), _jsxs("div", { children: [_jsx("input", { type: "file", multiple: true, onChange: onDrop }), _jsxs("div", { children: ["File: ", count] })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: upload, children: "Carica" }), _jsx("button", { onClick: start, children: "Avvia invio" })] })] }));
}
