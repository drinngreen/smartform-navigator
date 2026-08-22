// ══════════════════════════════════════════════════════════════
// Anagrafica completa Destinatari/Impianti + Trasportatori
// Generata da: anagrafica_export, impianti_trasportatori_export,
// ELENCO_MAGAZZINI_3.xlsx — 16/02/2026
// ══════════════════════════════════════════════════════════════

export interface Soggetto {
  nome: string;
  indirizzo: string;
  cf: string;
  piva?: string;
  tipo: "IMPIANTO" | "TRASPORTATORE" | "PRODUTTORE";
  email?: string;
  tel?: string;
  // Extended RENTRI fields
  autorizzazione?: string;
  tipoAut?: string;
  dataAut?: string;
  operazione?: string;
  comuneIstat?: string;
}

// ── PRODUTTORE FISSO ───────────────────────────────────────────
export const GLOBAL_RECO: Soggetto = {
  nome: "Global Reco S.r.l.",
  indirizzo: "Via Alba 11 - 10024 Moncalieri (TO)",
  cf: "08934760961",
  tipo: "PRODUTTORE",
  comuneIstat: "001156",
};

// ── MULTYPROGET ────────────────────────────────────────────────
export const MULTYPROGET: Soggetto = {
  nome: "Multyproget S.r.l.",
  indirizzo: "Via Rivarossa 18/20 - 10060 Piscina (TO)",
  cf: "12347770013",
  tipo: "PRODUTTORE",
  comuneIstat: "001194",
};

// ── NIYOL ──────────────────────────────────────────────────────
export const NIYOL: Soggetto = {
  nome: "Niyol S.r.l.",
  indirizzo: "Via Rivarossa 18/20 - 10060 Piscina (TO)",
  cf: "09879800010",
  tipo: "PRODUTTORE",
  comuneIstat: "001194",
};

// ── IMPIANTI / DESTINATARI ─────────────────────────────────────
// Cross-referenced con Excel per email
export const IMPIANTI: Soggetto[] = [
  // === A ===
  { nome: "Thermo Service Srl", indirizzo: "VIA TURATI 28, 27028 SAN MARTINO SICCOMARIO (PV)", cf: "02247770122", piva: "02247770122", tipo: "IMPIANTO", email: "amministrazione@thermoserviceplus.it" },
  { nome: "A.G. Gas Srl", indirizzo: "VIA CISE SUD 563, 19035 SANTO STEFANO MAGRA (SP)", cf: "01215840115", piva: "01215840115", tipo: "IMPIANTO", email: "info@ag-gas.com", comuneIstat: "011027" },
  { nome: "Abbondanzia Francesco S.r.l.", indirizzo: "STRADA PROV. 44, 65020 ROSCIANO (PE)", cf: "01494110685", tipo: "IMPIANTO", email: "abbondanzia@virgilio.it", tel: "328 410 8164", comuneIstat: "068033", operazione: "R13", tipoAut: "AIA" },
  { nome: "Adriatica Rottami Srl", indirizzo: "VIA SANTERNO AMMONITE 425X, SANTERNO RAVENNA (RA)", cf: "02496490398", tipo: "IMPIANTO", email: "info@adriaticarottami.it", comuneIstat: "039014", operazione: "R13", tipoAut: "AIA" },
  { nome: "Afim S.r.l.", indirizzo: "VIA PINEROLO 29, 10060 FROSSASCO (TO)", cf: "03926910047", tipo: "IMPIANTO", email: "afimcommercio@gmail.com", tel: "0121 329424", comuneIstat: "001111", operazione: "R13", tipoAut: "AIA" },
  { nome: "Amasteel S.r.l.", indirizzo: "VIA DI TEGULAIA 9, 56121 PISA (PI)", cf: "02502840503", tipo: "IMPIANTO", email: "info@amasteel.it", comuneIstat: "050026", operazione: "R13", tipoAut: "AIA" },
  { nome: "Andreasi Rottami Di Andreasi Bassi Emmanuel", indirizzo: "Viale Europa 12, 37053 Cerea (VR)", cf: "01482900295", tipo: "IMPIANTO", email: "info@andreasirottami.com", tel: "0442 615235", comuneIstat: "023022", operazione: "R13", tipoAut: "AIA" },
  { nome: "Ara Rino Snc Di Ara Mirko & C.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@ararino.it" },
  { nome: "Arienti S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@arienti.com" },
  { nome: "Atlas Energy S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "atlasenergysrl@gmail.com" },
  { nome: "Autodemolizione Ricambi Rimini Srl", indirizzo: "VIA TURCHETTA 89, RIMINI (RN)", cf: "04571860404", tipo: "IMPIANTO", email: "amministrazione@autodemolizionerimini.com", comuneIstat: "099014", operazione: "R13", tipoAut: "AIA" },
  { nome: "Autofficina Raggi Simone", indirizzo: "P.LE C.S.A. SNC, 19037 SANTO STEFANO MAGRA (SP)", cf: "01245770118", tipo: "IMPIANTO", email: "SIMONERAGGI1972@GMAIL.COM", tel: "0187 630482", comuneIstat: "011027", operazione: "R13", tipoAut: "AIA" },
  { nome: "Azienda Agricola Ferraro Maurizio", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "az.agr.ferraro.maurizio@postecert.it" },

  // === B ===
  { nome: "Badulescu Tudor", indirizzo: "VIA SETTE COMUNI 61, 10127 TORINO (TO)", cf: "13211740017", piva: "13211740017", tipo: "TRASPORTATORE", comuneIstat: "001272" },
  { nome: "Rainbow Srl", indirizzo: "VIA FRATELLI SIGNORELLI 159, 20024 GARBAGNATE MILANESE (MI)", cf: "08526860963", piva: "08526860963", tipo: "TRASPORTATORE", comuneIstat: "015101" },
  { nome: "Bellani Adriano", indirizzo: "VIA SAURO 64, 23893 CASSAGO BRIANZA (LC)", cf: "BLLDRN65R06B943L", tipo: "IMPIANTO", email: "info@abliving.it", comuneIstat: "097015", operazione: "R13", tipoAut: "AIA" },
  { nome: "Bertorelli S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@bertorellisrl.com" },
  { nome: "Bianchi Srl", indirizzo: "VIA PAPA GIOVANNI XXXIII 1, ANNICO (CR)", cf: "01040110197", tipo: "IMPIANTO", email: "info@bianchi-srl.com", comuneIstat: "019003", operazione: "R13", tipoAut: "AIA" },
  { nome: "Braccio Di Ferro 2 S.n.c.", indirizzo: "VIA ARETINA 38, 58048 MONTE SAN SAVINO (AR)", cf: "02148300516", tipo: "IMPIANTO", email: "bracciodiferro.foiano@gmail.com", comuneIstat: "051024", operazione: "R13", tipoAut: "AIA" },
  { nome: "B.S. Metalli Srls", indirizzo: "VIA VERCELLI, 13030 CARESANABLOT (VC)", cf: "02708720020", tipo: "IMPIANTO", email: "bs.metalli@gmail.com", comuneIstat: "002028", operazione: "R13", tipoAut: "AIA" },
  { nome: "Busisi Ecologia Srl", indirizzo: "VIA SCANSANESE 273, LOC. SAN MARTINO (GR)", cf: "00951000638", tipo: "IMPIANTO", email: "ufficiotecnico@busisiecologia.it", comuneIstat: "053011", operazione: "R13", tipoAut: "AIA" },

  // === C ===
  { nome: "C.I.R.R. S.r.l.", indirizzo: "VIA POIRINO 94, 10022 CARMAGNOLA (TO)", cf: "08137380013", tipo: "IMPIANTO", email: "info@cirr.it", tel: "011 977 3938", comuneIstat: "001059", operazione: "R13", tipoAut: "AIA" },
  { nome: "Calanda Di Calanda Federico & C. S.n.c.", indirizzo: "VIA MONZAMBANO 1550, 37067 VALEGGIO SUL MINCIO (VR)", cf: "04561750235", tipo: "IMPIANTO", email: "calandasnc@gmail.com", comuneIstat: "023089", operazione: "R13", tipoAut: "AIA" },
  { nome: "Cancedda Impianti S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "andreacancedda121@tiscali.it" },
  { nome: "Cartocast S.r.l.", indirizzo: "VIA TREBBIA 3/F, 29121 PIACENZA (PC)", cf: "00428180335", tipo: "IMPIANTO", email: "cartocast@gmail.com", tel: "0523 481722", comuneIstat: "033032", operazione: "R13", tipoAut: "AIA" },
  { nome: "Centro Raccolta Rottami F.lli De Moro S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "crrdm@hotmail.it" },
  { nome: "Cervi S.a.s. Di Cervi Srl", indirizzo: "VIA LUIGI GALVANI 12, 42019 SCANDIANO (RE)", cf: "00268540358", tipo: "IMPIANTO", email: "info@cervi.biz", tel: "0522 857117", comuneIstat: "035038", operazione: "R13", tipoAut: "AIA" },
  { nome: "Chiavazza Rottami Srl", indirizzo: "VIA POIRINO 30, 10022 CARMAGNOLA (TO)", cf: "11859300011", tipo: "IMPIANTO", comuneIstat: "001059", operazione: "R13", tipoAut: "AIA" },
  { nome: "Chiodo Fisso Di Rosselli Eleonora", indirizzo: "VIA VALLEDOGLIO 12, NIEVE (CN)", cf: "03047600048", tipo: "IMPIANTO", email: "chiodo.fissoneive@tiscali.it", comuneIstat: "004150" },
  { nome: "CIRR Srl", indirizzo: "STRADA DEGLI OCCHINI 13, 10022 CARMAGNOLA (TO)", cf: "08137380013", tipo: "IMPIANTO", tel: "011 977 3938", comuneIstat: "001059", operazione: "R13", tipoAut: "AIA" },
  { nome: "Co.Fer.Metal. Marche S.r.l.", indirizzo: "VIA MAJANESI 17, 62010 TREIA (MC)", cf: "00634970438", tipo: "IMPIANTO", email: "info@cofermetalmarche.it", tel: "071 78 20 185", comuneIstat: "043053", operazione: "R13", tipoAut: "AIA" },
  { nome: "Condominio Via Martiri", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@amministrazionicamandona.it" },
  { nome: "Cordino Rottami Srl", indirizzo: "STRADA FIORI 5, COSTIGLIOLE D'ASTI (AT)", cf: "0167455056", tipo: "IMPIANTO", email: "cinziasconfienza@gmail.com", comuneIstat: "005046" },
  { nome: "Corigliano S.n.c. Di Corigliano Rocco", indirizzo: "VIA DELLA MINIERA 9, 05100 TERNI (TR)", cf: "01287680555", tipo: "IMPIANTO", email: "CORIGLIANOROCCOSNC@LIBERO.IT", tel: "0744 426021", comuneIstat: "055032", operazione: "R13", tipoAut: "AIA" },
  { nome: "Cover S.r.l.", indirizzo: "VIA GIOACCHINO MURAT 1/C, 62010 TREIA (MC)", cf: "00624130431", tipo: "IMPIANTO", email: "covertreia@libero.it", tel: "0733 541534", comuneIstat: "043053", operazione: "R13", tipoAut: "AIA" },

  // === D ===
  { nome: "D.B.S. Rottami S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "formularidbsrottami@gmail.com" },
  { nome: "Degli Esposti Mario S.r.l.", indirizzo: "VIA DELLA COOPERAZIONE 30/2, BOLOGNA (BO)", cf: "02230830370", tipo: "IMPIANTO", email: "info@degliespostimario.it", comuneIstat: "037006", operazione: "R13", tipoAut: "AIA" },
  { nome: "Dello Margio Ferro S.r.l.", indirizzo: "Strada Provinciale Per S.M.O. 7, 86077 POZZILLI (IS)", cf: "03407370612", piva: "03407370612", tipo: "IMPIANTO", email: "dellomargioferro@gmail.com", comuneIstat: "094034", operazione: "R13", tipoAut: "AIA" },
  { nome: "Devoti Recuperi Ecologia S.r.l.", indirizzo: "VIA BANDIRALI 4, 29016 CORTEMAGGIORE (PC)", cf: "01370860338", tipo: "IMPIANTO", email: "info@devoti-ecologia.it", tel: "0523 839255", comuneIstat: "033015", operazione: "R13", tipoAut: "AIA" },
  { nome: "Dgv Metal Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@dgvmetal.com" },
  { nome: "Ditta Brunatti Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "ufficio@dittabrunatti.com" },
  { nome: "DM Metalli S.r.l.", indirizzo: "VIA 2 GIUGNO 39, MASSERANO (BI)", cf: "02565710023", tipo: "IMPIANTO", email: "info@dmrottami.it", comuneIstat: "096033", operazione: "R13", tipoAut: "AIA" },
  { nome: "Dosio Luigi S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@dosiosrl.it" },

  // === E ===
  { nome: "Eco Cefram Srl", indirizzo: "VIA COLLATINA 532, ROMA (RM)", cf: "04646621005", tipo: "IMPIANTO", email: "ecocefram@gmail.com", comuneIstat: "058091", operazione: "R13", tipoAut: "AIA" },
  { nome: "Eco Lombarda Rottami Srl", indirizzo: "STRADA DELLA COSTIERA SNC, 27020 DORNO (PV)", cf: "02736920188", tipo: "IMPIANTO", email: "ecolombardarottamisrl@gmail.com", comuneIstat: "018059", operazione: "R13", tipoAut: "AIA" },
  { nome: "Ecometal Srl", indirizzo: "VIA LAURENTINA KM 26,080, 00071 POMEZIA (RM)", cf: "06800721000", tipo: "IMPIANTO", email: "amministrazione@ecometalrecycling.it", comuneIstat: "058077", operazione: "R13", tipoAut: "AIA" },
  { nome: "E-costruzioni S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@e-costruzioni.com" },
  { nome: "Ecotek Metalli S.r.l.", indirizzo: "CASCINA RUBINA 34/BIS, POIRINO (TO)", cf: "10674340012", piva: "10674340012", tipo: "IMPIANTO", email: "ecotekmetalli@gmail.com", comuneIstat: "001197", operazione: "R13", tipoAut: "AIA" },
  { nome: "Ecotrade S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "accettazione@ecotradesrl.com" },
  { nome: "Edil-Val Di Fossanetti Maddalena S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@edival.it" },
  { nome: "Effe.Emme S.r.l.", indirizzo: "VIA BUSCA 29, 12024 COSTIGLIOLE SALUZZO (CN)", cf: "03327200048", tipo: "IMPIANTO", email: "effeemmerecuperi@gmail.com", tel: "0175 239499", comuneIstat: "004077", operazione: "R13", tipoAut: "AIA" },
  { nome: "Emmetre Tintolavanderie Industriali S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "mara@blue-fashion.it" },
  { nome: "Eureka S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@e-costruzioni.com" },

  // === F ===
  { nome: "F.lli Cattaneo S.r.l.", indirizzo: "VIA GOITO 74, 20871 VIMERCATE (MB)", cf: "04633950151", piva: "00785840968", tipo: "IMPIANTO", email: "FLLICATTANEOSRL@GMAIL.COM", comuneIstat: "108050", operazione: "R13", tipoAut: "AIA" },
  { nome: "F.lli Dell'Olio Srls", indirizzo: "STRADA COMUNALE PER CINISELLO 36, 20900 MONZA (MB)", cf: "10421630962", tipo: "IMPIANTO", email: "info@dellolioeco.it", comuneIstat: "108033", operazione: "R13", tipoAut: "AIA" },
  { nome: "F.lli Lunardi S.a.s.", indirizzo: "STRADA LANZO 230, 10148 TORINO (TO)", cf: "00788730018", tipo: "IMPIANTO", email: "FRATELLILUNARDI1@LEGALMAIL.IT", tel: "011 226 1854", comuneIstat: "001272", operazione: "R13", tipoAut: "AIA" },
  { nome: "F.lli Lucati S.r.l.", indirizzo: "VIALE DEL LAVORO 82, 35020 PONTE SAN NICOLO' (PD)", cf: "00825290281", tipo: "IMPIANTO", email: "fratellilucati@gmail.com", tel: "+39 049 8969056", comuneIstat: "028066", operazione: "R13", tipoAut: "AIA" },
  { nome: "F.lli Santini S.r.l.", indirizzo: "VIA GIOTTO 4/A, 39100 BOLZANO (BZ)", cf: "01133050219", tipo: "IMPIANTO", email: "renata.pulvirenti@grupposantini.com", tel: "+39 0471-195195", comuneIstat: "021008", operazione: "R13", tipoAut: "AIA" },
  { nome: "F.R. Ferrosi Rottami Srl", indirizzo: "VIA GIUSEPPE MONTANELLI 39/11, 61122 PESARO (PU)", cf: "02771900418", tipo: "IMPIANTO", email: "frferrosirottami@gmail.com", tel: "329 183 0110", comuneIstat: "041044", operazione: "R13", tipoAut: "AIA" },
  { nome: "Fer.Bi.Metal. S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@ferbimetal.it" },
  { nome: "Ferram S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "signorellimarco@alice.it" },
  { nome: "Ferrario Srl", indirizzo: "VIA CERRO 84, UBOLDO (VA)", cf: "00394500128", tipo: "IMPIANTO", email: "ferrariougoec@tiscali.it", comuneIstat: "012129" },
  { nome: "Ferrometal S.r.l.", indirizzo: "VIA GIOVANNI CAMERA 25, 16153 SERRA RICCO' (GE)", cf: "02358020994", tipo: "IMPIANTO", email: "amministrazione@ferrometal.it", tel: "010.412624", comuneIstat: "010058", operazione: "R13", tipoAut: "AIA" },
  { nome: "Ferviva Rottami Srl", indirizzo: "VIA DON GIOVANNI MINZONI 49, 12011 BORGO SAN DALMAZZO (CN)", cf: "03322100045", tipo: "IMPIANTO", email: "ecologia@ferviva.it", tel: "0171 269676", comuneIstat: "004029", operazione: "R13", tipoAut: "AIA" },
  { nome: "Fiducia Srl - Società Benefit", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@fiduciasrl.it" },
  { nome: "Fo.Sf. Metal Snc Di Forleo Mario", indirizzo: "VIA G.AGNELLI 13, 10026 SANTENA (TO)", cf: "09171900013", tipo: "IMPIANTO", email: "amministrazione.fosf@gmail.com", tel: "011 949 3996", comuneIstat: "001252", operazione: "R13", tipoAut: "AIA" },
  { nome: "Fontana Metalli Sas", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "dittafontana@hotmail.it" },
  { nome: "Francioni Rottami Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@francionirottami.it" },

  // === G ===
  { nome: "Futura Società Cooperativa", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "coop.futura224@gmail.com" },
  { nome: "G.E.A. Srl", indirizzo: "S.S. PER VOGHERA 95, 15057 TORTONA (AL)", cf: "09523470962", tipo: "IMPIANTO", comuneIstat: "006175", operazione: "R13", tipoAut: "AIA" },
  { nome: "Gabbero Davide", indirizzo: "FRAZ.SAN LUCA 10, 10068 VILLAFRANCA PIEMONTE (TO)", cf: "GBBDVD95S23L219N", piva: "11044930011", tipo: "IMPIANTO", email: "annamariacianfaglia@libero.it", comuneIstat: "001296", operazione: "R13", tipoAut: "AIA" },
  { nome: "Game.Fer S.r.l.", indirizzo: "VIALE PALMIRO TOGLIATTI 1009, 00155 ROMA (RM)", cf: "09291501006", tipo: "IMPIANTO", email: "contabilitagamefer@gmail.com", comuneIstat: "058091", operazione: "R13", tipoAut: "AIA" },
  { nome: "Gargano Giuseppe", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@giuseppegargano.it" },
  { nome: "Gemafer S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "gemafersrl@gmail.com" },
  { nome: "Gestioni Ecologiche Ambientali Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "roxana@geatortona.it" },
  { nome: "Glomat Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "glomat9589@gmail.com" },
  { nome: "Gometal Di Picone Mathias", indirizzo: "VIA DEL LAVORO 90/92, ASTI (AT)", cf: "01753810058", tipo: "IMPIANTO", email: "gometaldipicone@libero.it", comuneIstat: "005005", operazione: "R13", tipoAut: "AIA" },
  { nome: "Green Service Impianti S.r.l.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "greenserviceimpianti@gmail.com" },
  { nome: "Guastini Giuseppe S.r.l.", indirizzo: "VIA SILEA SNC, 19038 SARZANA (SP)", cf: "01127580114", tipo: "IMPIANTO", email: "fiscale@guastinigiuseppesrl.it", tel: "0187 620398", comuneIstat: "011028", operazione: "R13", tipoAut: "AIA" },

  // === I ===
  { nome: "I.T.Ro.Fer Industria S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "commerciometalli@itrofer.it" },
  { nome: "IBH Galzignano S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@galzignano.it" },
  { nome: "Immobiliare Rinnovamento Centro Spa", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "rinnovamentocentrospa@legalmail.it" },
  { nome: "Impresa Costruzioni Enrico Bena", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "impresacostruzionieb@pec.it" },
  { nome: "Italfer S.r.l.", indirizzo: "VIA RIVAROLO SNC, 10040 LOMBARDORE (TO)", cf: "11127280011", tipo: "IMPIANTO", email: "italfer.rottami@email.it", tel: "011 995 6318", comuneIstat: "001134", operazione: "R13", tipoAut: "AIA" },

  // === K ===
  { nome: "K.I. Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "simone.muraca@korusgroup.com" },
  { nome: "Kristalfer S.r.l.", indirizzo: "VIA DON SASSELLI D'ERA 9, 37041 ALBAREDO D'ADIGE (VR)", cf: "04910060237", tipo: "IMPIANTO", email: "kristalfersrl@gmail.com", comuneIstat: "023002", operazione: "R13", tipoAut: "AIA" },

  // === L ===
  { nome: "La Flaminia Recuperi Srl", indirizzo: "VIA FLAMINIA 3 LOC.S.G. PROFIAMMA KM.198, 06034 FOLIGNO (PG)", cf: "03942610548", tipo: "IMPIANTO", email: "laflaminiarecuperi@gmail.com", comuneIstat: "054018", operazione: "R13", tipoAut: "AIA" },
  { nome: "La Gatteo Rottami S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@lagatteorottami.it" },
  { nome: "La Rocca S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@laroccasrl.eu" },
  { nome: "Legnosfera Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info.legnosfera@gmail.com" },
  { nome: "Libra S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "serena@librasoluzioni.com" },
  { nome: "Lollini Ferrometalli Di Alessandro Lollini", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "lolliniferrometalli@gmail.com" },
  { nome: "Lombafer S.r.l.", indirizzo: "VIA GERBOLINA 56/A, VIADANA (MN)", cf: "02260220209", piva: "02260220209", tipo: "IMPIANTO", email: "zeudigaratti@gmail.com", comuneIstat: "020066", operazione: "R13", tipoAut: "AIA" },
  { nome: "Luraschi Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@luraschisrl.it" },

  // === M ===
  { nome: "Mai Rottami S.r.l.", indirizzo: "VIA DEL DONATORE 41, 37139 CASTELNUOVO DEL GARDA (VR)", cf: "04218670232", piva: "04218670232", tipo: "IMPIANTO", email: "amministrazione@mairottami.it", comuneIstat: "023021", operazione: "R13", tipoAut: "AIA" },
  { nome: "Mantova Rottami Srl", indirizzo: "VIA GEROLE 26, REDONDESCO (MN)", cf: "02611510203", tipo: "IMPIANTO", email: "mantovarottami@gmail.com", comuneIstat: "020047", operazione: "R13", tipoAut: "AIA" },
  { nome: "Marocco Sergio", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "sergioviaroma59@gmail.com" },
  { nome: "Masterporte Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@masterporte.com" },
  { nome: "Mat.Rec Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "formulari@matrec.net" },
  { nome: "Metal Mega Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "metalmega@metalmega.it" },
  { nome: "Metaldesio Srl", indirizzo: "VIA FORLANINI 71/B, 20851 DESIO (MB)", cf: "06508020960", tipo: "IMPIANTO", email: "info@metaldesiosrl.it", tel: "0362 178 5660", comuneIstat: "108015", operazione: "R13", tipoAut: "AIA" },
  { nome: "Metalfer Di Pio Mario Srl", indirizzo: "REGIONE BOERINO 287, 12044 CENTALLO (CN)", cf: "03571140049", tipo: "IMPIANTO", email: "info@metalfer.cuneo.it", comuneIstat: "004062", operazione: "R13", tipoAut: "AIA" },
  { nome: "Metalfer S.r.l. Motteggiana", indirizzo: "VIA ANTONIO MEUCCI 3, 46020 MOTTEGGIANA (MN)", cf: "02170970202", tipo: "IMPIANTO", email: "Amministrazione@metalfersrl.com", tel: "0376 527680", comuneIstat: "020034", operazione: "R13", tipoAut: "AIA" },
  { nome: "Metalfer S.r.l. Volpiano", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "s.frasca@retrac.it" },
  { nome: "Metalfer Srl Siccomario", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "demolizioni@metalfersrl.it" },
  { nome: "Metallica Marcon Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "mario@metallicamarcon.it" },
  { nome: "Metallurgica Biellese Srl", indirizzo: "VIA FRATELLI CAIROLI 150, 13894 GAGLIANICO (BI)", cf: "02136650021", tipo: "IMPIANTO", email: "info@metallurgicabiellese.it", tel: "015 542085", comuneIstat: "096023", operazione: "R13", tipoAut: "AIA" },
  { nome: "Metalrecycling Italy Srl", indirizzo: "VIA INDUSTRIALE 120/A, CAPRIANO (BS)", cf: "03842430989", tipo: "IMPIANTO", email: "metalrecyclingitaly@libero.it", comuneIstat: "017037", operazione: "R13", tipoAut: "AIA" },
  { nome: "Migliori Di Armillotta Valerio", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@miglioritendetorino.it" },
  { nome: "Miniaci S.r.l.", indirizzo: "VIA RANZI 178, 17027 PIETRA LIGURE (SV)", cf: "01494510090", tipo: "IMPIANTO", email: "info@miniaci.it", tel: "019 628466", comuneIstat: "009047", operazione: "R13", tipoAut: "AIA" },
  { nome: "Mirabelli S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "Info@mirabellisrl.it" },

  // === N ===
  { nome: "Napolitano Sebastiano", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@napolitanorottami.it" },
  { nome: "Navalsider Porto S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@navalsiderporto.com" },
  { nome: "New Edy Srl", indirizzo: "VIA MASCAGNI 18, MONTESILVANO (PE)", cf: "01700020686", tipo: "IMPIANTO", email: "accettazione@newedy.com", comuneIstat: "068028", operazione: "R13", tipoAut: "AIA" },
  { nome: "Next S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "nextcostruzioni@gmail.com" },
  { nome: "Noseco Di Nosè Romina Francesca", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "noseco.romina@gmail.com" },
  { nome: "Nuova Frassine S.r.l.", indirizzo: "VIA SAN GEMINIANO 4, 46100 MANTOVA (MN)", cf: "02053610206", tipo: "IMPIANTO", email: "frassine.srl@libero.it", comuneIstat: "020030", operazione: "R13", tipoAut: "AIA" },
  { nome: "Nuova Malco S.r.l.", indirizzo: "VIA VALDILOCCHI SNC, 19121 LA SPEZIA (SP)", cf: "00983820119", tipo: "IMPIANTO", email: "logistica@malcoriciclo.it", tel: "0187 506191", comuneIstat: "011015", operazione: "R13", tipoAut: "AIA" },
  { nome: "Nuova Metalvarta", indirizzo: "VIALE ETRURIA 5, FIRENZE (FI)", cf: "04205940481", tipo: "IMPIANTO", comuneIstat: "048017", operazione: "R13", tipoAut: "AIA" },

  // === O ===
  { nome: "Obi Elettrica Di Oberti Francesco", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "francesco@obielettrica.it" },
  { nome: "Odulia S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@odulia.it" },

  // === P ===
  { nome: "Pasquero S.r.l.", indirizzo: "CORSO SAVONA 52, 10024 MONCALIERI (TO)", cf: "07656790016", tipo: "IMPIANTO", email: "commerciale@pasquero.com", tel: "011 640 6281", comuneIstat: "001156", operazione: "R13", tipoAut: "AIA" },
  { nome: "PH Metal Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "phmetalsrl@gmail.com" },
  { nome: "Phoenix Group S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "phoenixgroupsrl.22@gmail.com" },
  { nome: "Prato Fer S.r.l.", indirizzo: "VIA MASACCIO 11/A, 59013 MONTEMURLO (PO)", cf: "02435940974", tipo: "IMPIANTO", email: "pratofersrl@gmail.com", comuneIstat: "100003", operazione: "R13", tipoAut: "AIA" },
  { nome: "Proxima Battery S.r.l.", indirizzo: "VIA PRIMO MAGGIO 15, 40011 ANZOLA DELL'EMILIA (BO)", cf: "03880791201", tipo: "IMPIANTO", email: "proximabatterysrl@libero.it", comuneIstat: "037002", operazione: "R13", tipoAut: "AIA" },
  { nome: "Puppo Metalli S.r.l.", indirizzo: "VIA MULTEDO DI PEGLI 2, 16155 GENOVA (GE)", cf: "02626200998", tipo: "IMPIANTO", email: "info@puppometalli.eu", comuneIstat: "010025", operazione: "R13", tipoAut: "AIA" },

  // === R ===
  { nome: "R.M. Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@rmonline.it" },
  { nome: "Ralacarta S.r.l.", indirizzo: "LOC. CEOLE 7, 38066 RIVE DEL GARDA (TN)", cf: "02764110223", tipo: "IMPIANTO", email: "ecologia@ralacarta.com", comuneIstat: "022155", operazione: "R13", tipoAut: "AIA" },
  { nome: "Recmet S.r.l.", indirizzo: "VIA LOTTIZZAZIONE 35, 54100 MASSA (MS)", cf: "01324500451", tipo: "IMPIANTO", email: "magazzino@recmet.it", comuneIstat: "045010", operazione: "R13", tipoAut: "AIA" },
  { nome: "Recmetal S.r.l.s.", indirizzo: "STRADA PROVINCIALE PIOSSASCO 46/I, 10040 VOLVERA (TO)", cf: "12763770018", tipo: "IMPIANTO", email: "amministrazione.recmetal@gmail.com", comuneIstat: "001303", operazione: "R13", tipoAut: "AIA" },
  { nome: "Recuperi Marengo Srl", indirizzo: "VIA RANA 3, SPINETTA M.GO (AL)", cf: "02642080069", tipo: "IMPIANTO", email: "recuperimarengosrl@gmail.com", comuneIstat: "006003", operazione: "R13", tipoAut: "AIA" },
  { nome: "Reggio Ecologia Srl", indirizzo: "VIA L.L. ZAMENHOF 25/A, REGGIO NELL'EMILIA (RE)", cf: "01774780355", tipo: "IMPIANTO", comuneIstat: "035033", operazione: "R13", tipoAut: "AIA" },
  { nome: "Reggio Rottami S.r.l.", indirizzo: "VIA SAN BIAGIO 76/C, CASTELNOVO DI SOTTO (RE)", cf: "02398040358", tipo: "IMPIANTO", email: "info@reggiorottamisrl.it", comuneIstat: "035012", operazione: "R13", tipoAut: "AIA" },
  { nome: "Ricci Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@riccipelletterie.it" },
  { nome: "Riva S.r.l.", indirizzo: "VIA CASELLETTE 200, 10091 ALPIGNANO (TO)", cf: "04760110017", tipo: "IMPIANTO", email: "segreteria@rivarottami.it", tel: "011 967 4789", comuneIstat: "001007", operazione: "R13", tipoAut: "AIA" },
  { nome: "Rizzi Tobia S.a.s.", indirizzo: "VIA VALLOMBROSA 1, 20080 VERNATE (MI)", cf: "04793740962", tipo: "IMPIANTO", email: "amministrazione@rizzirottami.com", comuneIstat: "015234", operazione: "R13", tipoAut: "AIA" },
  { nome: "Rota Fer-Metal S.r.l.", indirizzo: "VIA STEZZANO 33, ZANICA (BG)", cf: "00971530167", tipo: "IMPIANTO", email: "info@rotafermetal.it", comuneIstat: "016244", operazione: "R13", tipoAut: "AIA" },
  { nome: "Rottam Ferrara Di Cavicchi S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "rottam@libero.it" },
  { nome: "Rottam Ittica S.r.l.", indirizzo: "VIA MONTALBANO 1419/A, 47842 SAN GIOVANNI IN MARIGNANO (RN)", cf: "01278430408", tipo: "IMPIANTO", email: "info@rottamittica.it", tel: "0541 955219", comuneIstat: "099015", operazione: "R13", tipoAut: "AIA" },
  { nome: "Rottami Italia S.r.l.", indirizzo: "VIA ROMA 215, 17038 VILLANOVA D'ALBENGA (SV)", cf: "01627000084", piva: "01627000084", tipo: "IMPIANTO", email: "ufficioinfo@rottamiitalia.it", tel: "0182 582483", comuneIstat: "009067", operazione: "R13", tipoAut: "AIA" },
  { nome: "RPF Di Riccardino Roberto S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "rpfambiente@gmail.com" },

  // === S ===
  { nome: "Sa.Fer. Srl", indirizzo: "VIA BABIASSO 13, 10070 FRONT (TO)", cf: "12915590017", tipo: "IMPIANTO", email: "safergroupsrl@virgilio.it", tel: "0119251723", comuneIstat: "001108", operazione: "R13", tipoAut: "AIA" },
  { nome: "Salvadori Demolizioni S.r.l.", indirizzo: "VIA ENRIQUES 106, 57121 LIVORNO (LI)", cf: "01680630496", tipo: "IMPIANTO", email: "salvadori.demolizioni@gmail.com", comuneIstat: "049009", operazione: "R13", tipoAut: "AIA" },
  { nome: "Sannicolo' Sandra", indirizzo: "VIA DELLO SCALO 16, 05026 MONTECASTRILLI (TR)", cf: "00563600550", tipo: "IMPIANTO", email: "sannicolo.sandra@virgilio.it", tel: "0744 943971", comuneIstat: "055020", operazione: "R13", tipoAut: "AIA" },
  { nome: "Scarponi Luciano Srl", indirizzo: "VIA A. CANINI 7, 06081 TORCHIAGINA DI ASSISI (PG)", cf: "02352780544", tipo: "IMPIANTO", email: "info@scarponilucianosrl.it", comuneIstat: "054001", operazione: "R13", tipoAut: "AIA" },
  { nome: "Seraplastic S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@seraplastic.it" },
  { nome: "SG S.r.l.", indirizzo: "VIA MONTE BIANCO 2/A, 20149 MILANO (MI)", cf: "04151190966", tipo: "IMPIANTO", email: "laura.sgsrl@gmail.com", comuneIstat: "015146", operazione: "R13", tipoAut: "AIA" },
  { nome: "Siderfer S.r.l.", indirizzo: "STRADA DELLA CEBROSA 15, 10036 SETTIMO TORINESE (TO)", cf: "00916070014", tipo: "IMPIANTO", email: "info@siderfer.it", comuneIstat: "001270", operazione: "R13", tipoAut: "AIA" },
  { nome: "Sivieri Metalli S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@sivierimetalli.it" },
  { nome: "Spada Rottami S.r.l.", indirizzo: "VIA LARGO BOSCHETTI 32, GAMBETTOLA (FC)", cf: "04537610406", tipo: "IMPIANTO", email: "spadarottamisrl@gmail.com", comuneIstat: "040013", operazione: "R13", tipoAut: "AIA" },
  { nome: "Spazio Serramenti S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "leo@spazioserramenti.it" },
  { nome: "Station Service Srl", indirizzo: "VIA NOMENTANA 1107, 00137 ROMA (RM)", cf: "04371431000", tipo: "IMPIANTO", email: "acquisti@stationservicesrl.it", tel: "335 186 4947", comuneIstat: "058091", operazione: "R13", tipoAut: "AIA" },
  { nome: "Stena Metalli Srls", indirizzo: "VIA COTTOLENGO 75, 10079 MAPPANO (TO)", cf: "11784280015", tipo: "IMPIANTO", email: "stenametallisrls@gmail.com", tel: "333 2239866", comuneIstat: "001308", operazione: "R13", tipoAut: "AIA" },

  // === T ===
  { nome: "Tecnorame S.r.l.", indirizzo: "VIA KENNEDY 2, TORGIANO (PG)", cf: "03205690542", tipo: "IMPIANTO", email: "info@ercolanoni.it", comuneIstat: "054050", operazione: "R13", tipoAut: "AIA" },
  { nome: "Torino Recuperi Metalli S.r.l.", indirizzo: "VIA ANDREA CIARDI 17, 76125 TRANI (BT)", cf: "12260910018", tipo: "IMPIANTO", comuneIstat: "110009", operazione: "R13", tipoAut: "AIA" },
  { nome: "TR Trulli Rottami Srl", indirizzo: "VIA TOMBARELLO 1/C, 40053 VALSAMOGGIA (BO)", cf: "03960891202", tipo: "IMPIANTO", email: "TrulliRottami@outlook.it", comuneIstat: "037059", operazione: "R13", tipoAut: "AIA" },
  { nome: "Trebi S.r.l.", indirizzo: "VIA CREMONESE 142/B, 43126 PARMA (PR)", cf: "02805710346", tipo: "IMPIANTO", email: "info.trebisrl@gmail.com", tel: "0521647173", comuneIstat: "034027", operazione: "R13", tipoAut: "AIA" },
  { nome: "Truccolo Angelo S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@truccoloangelo.com" },

  // === V ===
  { nome: "V.G. Serramenti Di Vaia Giacinto", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@vgserramenti.it" },
  { nome: "V.T.R. Di Cilisto Raimondo Valerio S.a.s.", indirizzo: "VIA PATRIOTI ROMANESI 160, 24058 ROMANO DI LOMBARDIA (BG)", cf: "02218580161", tipo: "IMPIANTO", email: "vtr.cilisto@live.it", tel: "0363 903089", comuneIstat: "016182", operazione: "R13", tipoAut: "AIA" },
  { nome: "Valfed S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "falegnameriavalfed@gmail.com" },
  { nome: "Vassena Srl", indirizzo: "VIA PIOGALLI SNC, ANNONE BRIANZA (LC)", cf: "0189239139", tipo: "IMPIANTO", email: "info@vassenarottami.com", comuneIstat: "097003", operazione: "R13", tipoAut: "AIA" },
  { nome: "Verde Liguria Riciclaggi Srl", indirizzo: "VIA DEL COMMERCIO E DELL'INDUSTRIA 7, 17055 TOIRANO (SV)", cf: "01426720098", tipo: "IMPIANTO", email: "sara.info@verdeliguria.it", comuneIstat: "009062", operazione: "R13", tipoAut: "AIA" },
  { nome: "Versilia Rottami S.r.l.", indirizzo: "VIA BOUCHETTE 4, 55041 CAMAIORE (LU)", cf: "01569450461", tipo: "IMPIANTO", email: "versiliarottamisrl@gmail.com", comuneIstat: "046005", operazione: "R13", tipoAut: "AIA" },
  { nome: "Vigna Recycling S.r.l.", indirizzo: "VIA IGNAZIO SILONE 16, 60035 JESI (AN)", cf: "02530140421", tipo: "IMPIANTO", email: "fir@vignarecycling.it", tel: "0731605784", comuneIstat: "042021", operazione: "R13", tipoAut: "AIA" },
  { nome: "Villa Costruzioni Edili S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@villacostruzioni.com" },

  // === Z ===
  { nome: "Zac S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@zacecology.it" },
  { nome: "Zampoli S.r.l.", indirizzo: "VIA GALILEO GALILEI 35, 38015 LAVIS (TN)", cf: "01264120229", tipo: "IMPIANTO", email: "info@zampoli.it", comuneIstat: "022098", operazione: "R13", tipoAut: "AIA" },
  { nome: "Zanchelini Srl", indirizzo: "VIA PRIMA STRADA 21/23, 36071 ARZIGNANO (VI)", cf: "03333620247", tipo: "IMPIANTO", email: "info@zanchelini.com", comuneIstat: "024008", operazione: "R13", tipoAut: "AIA" },
  { nome: "Zimbardi S.r.l.", indirizzo: "CORSO VITTORIO OLCESE 5, 12060 CLAVESANA (CN)", cf: "03491680041", tipo: "IMPIANTO", email: "gzimbardi@tiscali.it", tel: "0173 790170", comuneIstat: "004072", operazione: "R13", tipoAut: "AIA" },
  { nome: "Zinco Cofani Srl", indirizzo: "VIA MAJORANA 21, 27036 MORTARA (PV)", cf: "00227730181", tipo: "IMPIANTO", email: "info@zincocofani.it", comuneIstat: "018100", operazione: "R13", tipoAut: "AIA" },
];

// Tutti i destinatari selezionabili (solo IMPIANTO, esclusi TRASPORTATORE)
export const DESTINATARI = IMPIANTI.filter(s => s.tipo === "IMPIANTO");

// PRODUTTORI punta a IMPIANTI per compatibilità
export const PRODUTTORI = IMPIANTI;
