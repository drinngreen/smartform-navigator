import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle } from "lucide-react";

interface CEREntry {
  codice: string;
  descrizione: string;
  descrAggiuntiva: string;
  stato: string;
  pericoloso: boolean;
  classiPericolo: string;
  um: string;
  rScarico: string;
  sScarico: string;
  origine: string;
  rCarico: string;
  sCarico: string;
}

export const CER_DATA: CEREntry[] = [
  { codice: "010408", descrizione: "scarti di ghiaia e pietrisco, diversi da quelli di cui alla voce 01 04 07", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "030105", descrizione: "segatura, trucioli, residui di taglio, legno, pannelli di truciolare e piallacci diversi da quelli di cui alla voce 03 01 04", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "070213", descrizione: "rifiuti plastici", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "080111", descrizione: "pitture e vernici di scarto, contenenti solventi organici o altre sostanze pericolose", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP03 HP04", um: "Kg", rScarico: "", sScarico: "D15", origine: "Rifiuto", rCarico: "", sCarico: "D15" },
  { codice: "080312", descrizione: "scarti di inchiostro, contenenti sostanze pericolose", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP03 HP04", um: "Kg", rScarico: "", sScarico: "D15", origine: "Rifiuto", rCarico: "", sCarico: "D15" },
  { codice: "080318", descrizione: "toner per stampa esauriti, diversi da quelli di cui alla voce 08 03 17", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "090105", descrizione: "soluzioni di lavaggio e soluzioni di arresto-fissaggio", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP03 HP04", um: "Kg", rScarico: "", sScarico: "D15", origine: "Rifiuto", rCarico: "", sCarico: "" },
  { codice: "100210", descrizione: "scaglie di laminazione", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120101", descrizione: "limatura e trucioli di metalli ferrosi", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120102", descrizione: "polveri e particolato di metalli ferrosi", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120103", descrizione: "limatura e trucioli di metalli non ferrosi", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120104", descrizione: "polveri e particolato di metalli non ferrosi", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120105", descrizione: "limatura e trucioli di materiali plastici", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120107", descrizione: "oli minerali per macchinari, non contenenti alogeni (eccetto emulsioni e soluzioni)", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP04 HP05", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120109", descrizione: "emulsioni e soluzioni per macchinari, non contenenti alogeni", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP04 HP05", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "", sCarico: "D15" },
  { codice: "120117", descrizione: "residui di materiale di sabbiatura, diversi da quelli di cui alla voce 12 01 16", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120121", descrizione: "corpi d'utensile e materiali di rettifica esauriti, diversi da quelli di cui alla voce 12 01 20", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "120301", descrizione: "soluzioni acquose di lavaggio", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP04 HP05", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "130110", descrizione: "oli minerali per circuiti idraulici, non clorurati", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP04 HP14", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "130205", descrizione: "oli minerali per motori, ingranaggi e lubrificazione, non clorurati", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP05 HP14", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "140603", descrizione: "altri solventi e miscele di solventi", descrAggiuntiva: "", stato: "Liquido", pericoloso: true, classiPericolo: "HP03 HP04 HP10 HP14", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "", sCarico: "D15" },
  { codice: "150101", descrizione: "imballaggi di carta e cartone", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Imballaggi", rCarico: "R13", sCarico: "" },
  { codice: "150102", descrizione: "imballaggi di plastica", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Imballaggi", rCarico: "R13", sCarico: "" },
  { codice: "150103", descrizione: "imballaggi in legno", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Imballaggi", rCarico: "R13", sCarico: "" },
  { codice: "150104", descrizione: "imballaggi metallici", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Imballaggi", rCarico: "R13", sCarico: "" },
  { codice: "150106", descrizione: "imballaggi in materiali misti", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Imballaggi", rCarico: "R13", sCarico: "" },
  { codice: "150107", descrizione: "imballaggi di vetro", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Imballaggi", rCarico: "R13", sCarico: "" },
  { codice: "150110", descrizione: "imballaggi contenenti residui di sostanze pericolose o contaminati da tali sostanze", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP04 HP14", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "150202", descrizione: "assorbenti, materiali filtranti (inclusi filtri dell'olio non specificati altrimenti), stracci e indumenti protettivi, contaminati da sostanze pericolose", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP04", um: "Kg", rScarico: "", sScarico: "D15", origine: "Rifiuto", rCarico: "", sCarico: "D15" },
  { codice: "150203", descrizione: "assorbenti, materiali filtranti, stracci e indumenti protettivi, diversi da quelli di cui alla voce 15 02 02", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160103", descrizione: "pneumatici fuori uso", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160117", descrizione: "metalli ferrosi", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160119", descrizione: "plastica", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160120", descrizione: "vetro", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160122", descrizione: "componenti non specificati altrimenti", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160213", descrizione: "apparecchiature fuori uso, contenenti componenti pericolosi diversi da quelli di cui alle voci 16 02 09 e 16 02 12", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP05 HP06 HP07", um: "Kg", rScarico: "R13", sScarico: "", origine: "RAEE", rCarico: "R13", sCarico: "" },
  { codice: "160214", descrizione: "apparecchiature fuori uso, diverse da quelle di cui alle voci da 16 02 09 a 16 02 13", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "RAEE", rCarico: "R13", sCarico: "" },
  { codice: "160216", descrizione: "componenti rimossi da apparecchiature fuori uso diversi da quelli di cui alla voce 16 02 15", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "RAEE", rCarico: "R13", sCarico: "" },
  { codice: "160305", descrizione: "rifiuti organici contenenti sostanze pericolose", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP03 HP04", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "", sCarico: "" },
  { codice: "160504", descrizione: "gas in contenitori a pressione (compresi gli halon), contenenti sostanze pericolose", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP03 HP04 HP05 HP14", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160505", descrizione: "gas in contenitori a pressione, diversi da quelli di cui alla voce 16 05 04", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160601", descrizione: "batterie al piombo", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP05 HP06 HP08 HP14", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160604", descrizione: "batterie alcaline (tranne 16 06 03)", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP14", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "160605", descrizione: "altre batterie ed accumulatori", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP05 HP06 HP08 HP14", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170102", descrizione: "mattoni", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170103", descrizione: "mattonelle e ceramiche", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170107", descrizione: "miscugli di cemento, mattoni, mattonelle e ceramiche, diversi da quelle di cui alla voce 17 01 06", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170201", descrizione: "legno", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "", sCarico: "" },
  { codice: "170202", descrizione: "vetro", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170203", descrizione: "plastica", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170302", descrizione: "miscele bituminose diverse da quelle di cui alla voce 17 03 01", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170401", descrizione: "rame, bronzo, ottone", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170402", descrizione: "alluminio", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170403", descrizione: "piombo", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170404", descrizione: "zinco", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R04", sCarico: "" },
  { codice: "170405", descrizione: "ferro e acciaio", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170407", descrizione: "metalli misti", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170411", descrizione: "cavi, diversi da quelli di cui alla voce 17 04 10", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170603", descrizione: "altri materiali isolanti contenenti o costituiti da sostanze pericolose", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: true, classiPericolo: "HP07", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "", sCarico: "" },
  { codice: "170604", descrizione: "materiali isolanti, diversi da quelli di cui alle voci 17 06 01 e 17 06 03", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R04", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170802", descrizione: "materiali da costruzione a base di gesso, diversi da quelli di cui alla voce 17 08 01", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "170904", descrizione: "rifiuti misti dell'attivita' di costruzione e demolizione, diversi da quelli di cui alle voci 17 09 01, 17 09 02 e 17 09 03", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "191202", descrizione: "metalli ferrosi", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "", sCarico: "" },
  { codice: "191203", descrizione: "metalli non ferrosi", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "", sCarico: "" },
  { codice: "191204", descrizione: "plastica e gomma", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "191207", descrizione: "legno diverso da quello di cui alla voce 19 12 06", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "191212", descrizione: "altri rifiuti (compresi materiali misti) prodotti dal trattamento meccanico dei rifiuti, diversi da quelli di cui alla voce 19 12 11", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200101", descrizione: "carta e cartone", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200140", descrizione: "metalli", descrAggiuntiva: "alluminio", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200140-CAVO", descrizione: "metalli", descrAggiuntiva: "metallo-cavo", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200140-fe", descrizione: "metalli", descrAggiuntiva: "ferro", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200140-OT", descrizione: "metalli", descrAggiuntiva: "ottone", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200140-PI", descrizione: "metalli", descrAggiuntiva: "metallo-piombo", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200140-RA", descrizione: "metalli", descrAggiuntiva: "metallo-rame", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "R13", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
  { codice: "200307", descrizione: "rifiuti ingombranti", descrAggiuntiva: "", stato: "Solido non pulverulento", pericoloso: false, classiPericolo: "", um: "Kg", rScarico: "", sScarico: "", origine: "Rifiuto", rCarico: "R13", sCarico: "" },
];

export function DevCERPreferitiModule() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return CER_DATA;
    const q = search.toLowerCase();
    return CER_DATA.filter(
      (c) =>
        c.codice.toLowerCase().includes(q) ||
        c.descrizione.toLowerCase().includes(q) ||
        c.descrAggiuntiva.toLowerCase().includes(q) ||
        c.classiPericolo.toLowerCase().includes(q)
    );
  }, [search]);

  const pericolosiCount = CER_DATA.filter((c) => c.pericoloso).length;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-sm px-3 py-1">
          {CER_DATA.length} CER totali
        </Badge>
        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-sm px-3 py-1">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {pericolosiCount} pericolosi
        </Badge>
        <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground text-sm px-3 py-1">
          {CER_DATA.length - pericolosiCount} non pericolosi
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per codice, descrizione o classe HP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-3 py-2.5 text-left font-medium">Codice</th>
                <th className="px-3 py-2.5 text-left font-medium">Descrizione</th>
                <th className="px-3 py-2.5 text-left font-medium">Aggiuntiva</th>
                <th className="px-3 py-2.5 text-left font-medium">Stato</th>
                <th className="px-3 py-2.5 text-center font-medium">P</th>
                <th className="px-3 py-2.5 text-left font-medium">Classi HP</th>
                <th className="px-3 py-2.5 text-center font-medium">UM</th>
                <th className="px-3 py-2.5 text-center font-medium">R Scar.</th>
                <th className="px-3 py-2.5 text-center font-medium">S Scar.</th>
                <th className="px-3 py-2.5 text-left font-medium">Origine</th>
                <th className="px-3 py-2.5 text-center font-medium">R Car.</th>
                <th className="px-3 py-2.5 text-center font-medium">S Car.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.map((c) => (
                <tr
                  key={c.codice}
                  className={`hover:bg-muted/10 transition-colors ${c.pericoloso ? "bg-amber-500/5" : ""}`}
                >
                  <td className="px-3 py-2 font-mono font-semibold text-foreground whitespace-nowrap">
                    {c.codice}
                  </td>
                  <td className="px-3 py-2 text-foreground max-w-xs truncate" title={c.descrizione}>
                    {c.descrizione}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{c.descrAggiuntiva || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">{c.stato}</td>
                  <td className="px-3 py-2 text-center">
                    {c.pericoloso && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">P</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {c.classiPericolo ? (
                      <div className="flex flex-wrap gap-1">
                        {c.classiPericolo.split(" ").map((hp) => (
                          <Badge key={hp} variant="outline" className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-400">
                            {hp}
                          </Badge>
                        ))}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground text-xs">{c.um}</td>
                  <td className="px-3 py-2 text-center text-xs font-mono text-emerald-400">{c.rScarico || "—"}</td>
                  <td className="px-3 py-2 text-center text-xs font-mono text-blue-400">{c.sScarico || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{c.origine}</td>
                  <td className="px-3 py-2 text-center text-xs font-mono text-emerald-400">{c.rCarico || "—"}</td>
                  <td className="px-3 py-2 text-center text-xs font-mono text-blue-400">{c.sCarico || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nessun CER trovato per "{search}"</p>
      )}
    </div>
  );
}
