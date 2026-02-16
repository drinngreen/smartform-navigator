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
}

// ── PRODUTTORE FISSO ───────────────────────────────────────────
export const GLOBAL_RECO: Soggetto = {
  nome: "Global Reco S.r.l.",
  indirizzo: "Via Alba 11 - 10024 Moncalieri (TO)",
  cf: "08934760961",
  tipo: "PRODUTTORE",
};

// ── INTERMEDIARIO FISSO ────────────────────────────────────────
export const MULTYPROGET: Soggetto = {
  nome: "Multyproget S.r.l.",
  indirizzo: "Via Rivarossa 18/20 - 10060 Piscina (TO)",
  cf: "12347770013",
  tipo: "PRODUTTORE",
};

// ── IMPIANTI / DESTINATARI ─────────────────────────────────────
// Cross-referenced con Excel per email
export const IMPIANTI: Soggetto[] = [
  // === A ===
  { nome: "\"Thermo Service Srl\"", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@thermoserviceplus.it" },
  { nome: "A.G. Gas Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@ag-gas.com" },
  { nome: "Abbondanzia Francesco S.r.l.", indirizzo: "STRADA PROV. 44, 65020 ROSCIANO (PE)", cf: "01494110685", tipo: "IMPIANTO", email: "abbondanzia@virgilio.it", tel: "328 410 8164" },
  { nome: "Adriatica Rottami Srl", indirizzo: "VIA SANTERNO AMMONITE 425X, SANTERNO RAVENNA (RA)", cf: "02496490398", tipo: "IMPIANTO", email: "info@adriaticarottami.it" },
  { nome: "Afim S.r.l.", indirizzo: "VIA PINEROLO 29, 10060 FROSSASCO (TO)", cf: "03926910047", tipo: "IMPIANTO", email: "afimcommercio@gmail.com", tel: "0121 329424" },
  { nome: "Amasteel S.r.l.", indirizzo: "VIA DI TEGULAIA 9, 56121 PISA (PI)", cf: "02502840503", tipo: "IMPIANTO", email: "info@amasteel.it" },
  { nome: "Andreasi Rottami Di Andreasi Bassi Emmanuel", indirizzo: "Viale Europa 12, 37053 Cerea (VR)", cf: "01482900295", tipo: "IMPIANTO", email: "info@andreasirottami.com", tel: "0442 615235" },
  { nome: "Ara Rino Snc Di Ara Mirko & C.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@ararino.it" },
  { nome: "Arienti S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@arienti.com" },
  { nome: "Atlas Energy S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "atlasenergysrl@gmail.com" },
  { nome: "Autodemolizione Ricambi Rimini Srl", indirizzo: "VIA TURCHETTA 89, RIMINI (RN)", cf: "04571860404", tipo: "IMPIANTO", email: "amministrazione@autodemolizionerimini.com" },
  { nome: "Autofficina Raggi Simone", indirizzo: "P.LE C.S.A. SNC, 19037 SANTO STEFANO MAGRA (SP)", cf: "01245770118", tipo: "IMPIANTO", email: "SIMONERAGGI1972@GMAIL.COM", tel: "0187 630482" },
  { nome: "Azienda Agricola Ferraro Maurizio", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "az.agr.ferraro.maurizio@postecert.it" },

  // === B ===
  { nome: "Badulescu Tudor", indirizzo: "VIA SETTE COMUNI 61, 10127 TORINO (TO)", cf: "13211740017", tipo: "TRASPORTATORE" },
  { nome: "Bellani Adriano", indirizzo: "VIA SAURO 64, 23893 CASSAGO BRIANZA (LC)", cf: "BLLDRN65R06B943L", tipo: "IMPIANTO", email: "info@abliving.it" },
  { nome: "Bertorelli S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@bertorellisrl.com" },
  { nome: "Bianchi Srl", indirizzo: "VIA PAPA GIOVANNI XXXIII 1, ANNICO (CR)", cf: "01040110197", tipo: "IMPIANTO", email: "info@bianchi-srl.com" },
  { nome: "Braccio Di Ferro 2 S.n.c.", indirizzo: "VIA ARETINA 38, 58048 MONTE SAN SAVINO (AR)", cf: "02148300516", tipo: "IMPIANTO", email: "bracciodiferro.foiano@gmail.com" },
  { nome: "B.S. Metalli Srls", indirizzo: "VIA VERCELLI, 13030 CARESANABLOT (VC)", cf: "02708720020", tipo: "IMPIANTO", email: "bs.metalli@gmail.com" },
  { nome: "Busisi Ecologia Srl", indirizzo: "VIA SCANSANESE 273, LOC. SAN MARTINO (GR)", cf: "00951000638", tipo: "IMPIANTO", email: "ufficiotecnico@busisiecologia.it" },

  // === C ===
  { nome: "C.I.R.R. S.r.l.", indirizzo: "VIA POIRINO 94, 10022 CARMAGNOLA (TO)", cf: "08137380013", tipo: "IMPIANTO", email: "info@cirr.it", tel: "011 977 3938" },
  { nome: "Calanda Di Calanda Federico & C. S.n.c.", indirizzo: "VIA MONZAMBANO 1550, 37067 VALEGGIO SUL MINCIO (VR)", cf: "04561750235", tipo: "IMPIANTO", email: "calandasnc@gmail.com" },
  { nome: "Cancedda Impianti S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "andreacancedda121@tiscali.it" },
  { nome: "Cartocast S.r.l.", indirizzo: "VIA TREBBIA 3/F, 29121 PIACENZA (PC)", cf: "00428180335", tipo: "IMPIANTO", email: "cartocast@gmail.com", tel: "0523 481722" },
  { nome: "Centro Raccolta Rottami F.lli De Moro S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "crrdm@hotmail.it" },
  { nome: "Cervi S.a.s. Di Cervi Srl", indirizzo: "VIA LUIGI GALVANI 12, 42019 SCANDIANO (RE)", cf: "00268540358", tipo: "IMPIANTO", email: "info@cervi.biz", tel: "0522 857117" },
  { nome: "Chiavazza Rottami Srl", indirizzo: "VIA POIRINO 30, 10022 CARMAGNOLA (TO)", cf: "11859300011", tipo: "IMPIANTO" },
  { nome: "Chiodo Fisso Di Rosselli Eleonora", indirizzo: "VIA VALLEDOGLIO 12, NIEVE (CN)", cf: "03047600048", tipo: "IMPIANTO", email: "chiodo.fissoneive@tiscali.it" },
  { nome: "CIRR Srl", indirizzo: "STRADA DEGLI OCCHINI 13, 10022 CARMAGNOLA (TO)", cf: "08137380013", tipo: "IMPIANTO", tel: "011 977 3938" },
  { nome: "Co.Fer.Metal. Marche S.r.l.", indirizzo: "VIA MAJANESI 17, 62010 TREIA (MC)", cf: "00634970438", tipo: "IMPIANTO", email: "info@cofermetalmarche.it", tel: "071 78 20 185" },
  { nome: "Condominio Via Martiri", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@amministrazionicamandona.it" },
  { nome: "Cordino Rottami Srl", indirizzo: "STRADA FIORI 5, COSTIGLIOLE D'ASTI (AT)", cf: "0167455056", tipo: "IMPIANTO", email: "cinziasconfienza@gmail.com" },
  { nome: "Corigliano S.n.c. Di Corigliano Rocco", indirizzo: "VIA DELLA MINIERA 9, 05100 TERNI (TR)", cf: "01287680555", tipo: "IMPIANTO", email: "CORIGLIANOROCCOSNC@LIBERO.IT", tel: "0744 426021" },
  { nome: "Cover S.r.l.", indirizzo: "VIA GIOACCHINO MURAT 1/C, 62010 TREIA (MC)", cf: "00624130431", tipo: "IMPIANTO", email: "covertreia@libero.it", tel: "0733 541534" },

  // === D ===
  { nome: "D.B.S. Rottami S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "formularidbsrottami@gmail.com" },
  { nome: "Degli Esposti Mario S.r.l.", indirizzo: "VIA DELLA COOPERAZIONE 30/2, BOLOGNA (BO)", cf: "02230830370", tipo: "IMPIANTO", email: "info@degliespostimario.it" },
  { nome: "Dello Margio Ferro S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "dellomargioferro@gmail.com" },
  { nome: "Devoti Recuperi Ecologia S.r.l.", indirizzo: "VIA BANDIRALI 4, 29016 CORTEMAGGIORE (PC)", cf: "01370860338", tipo: "IMPIANTO", email: "info@devoti-ecologia.it", tel: "0523 839255" },
  { nome: "Dgv Metal Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@dgvmetal.com" },
  { nome: "Ditta Brunatti Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "ufficio@dittabrunatti.com" },
  { nome: "DM Metalli S.r.l.", indirizzo: "VIA 2 GIUGNO 39, MASSERANO (BI)", cf: "02565710023", tipo: "IMPIANTO", email: "info@dmrottami.it" },
  { nome: "Dosio Luigi S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@dosiosrl.it" },

  // === E ===
  { nome: "Eco Cefram Srl", indirizzo: "VIA COLLATINA 532, ROMA (RM)", cf: "04646621005", tipo: "IMPIANTO", email: "ecocefram@gmail.com" },
  { nome: "Eco Lombarda Rottami Srl", indirizzo: "STRADA DELLA COSTIERA SNC, 27020 DORNO (PV)", cf: "02736920188", tipo: "IMPIANTO", email: "ecolombardarottamisrl@gmail.com" },
  { nome: "Ecometal Srl", indirizzo: "VIA LAURENTINA KM 26,080, 00071 POMEZIA (RM)", cf: "06800721000", tipo: "IMPIANTO", email: "amministrazione@ecometalrecycling.it" },
  { nome: "E-costruzioni S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@e-costruzioni.com" },
  { nome: "Ecotek Metalli S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "ecotekmetalli@gmail.com" },
  { nome: "Ecotrade S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "accettazione@ecotradesrl.com" },
  { nome: "Edil-Val Di Fossanetti Maddalena S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@edival.it" },
  { nome: "Effe.Emme S.r.l.", indirizzo: "VIA BUSCA 29, 12024 COSTIGLIOLE SALUZZO (CN)", cf: "03327200048", tipo: "IMPIANTO", email: "effeemmerecuperi@gmail.com", tel: "0175 239499" },
  { nome: "Emmetre Tintolavanderie Industriali S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "mara@blue-fashion.it" },
  { nome: "Eureka S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@e-costruzioni.com" },

  // === F ===
  { nome: "F.lli Cattaneo S.r.l.", indirizzo: "VIA GOITO 74, 20871 VIMERCATE (MB)", cf: "00785840968", tipo: "IMPIANTO", email: "FLLICATTANEOSRL@GMAIL.COM" },
  { nome: "F.lli Dell'Olio Srls", indirizzo: "STRADA COMUNALE PER CINISELLO 36, 20900 MONZA (MB)", cf: "10421630962", tipo: "IMPIANTO", email: "info@dellolioeco.it" },
  { nome: "F.lli Lunardi S.a.s.", indirizzo: "STRADA LANZO 230, 10148 TORINO (TO)", cf: "00788730018", tipo: "IMPIANTO", email: "FRATELLILUNARDI1@LEGALMAIL.IT", tel: "011 226 1854" },
  { nome: "F.lli Lucati S.r.l.", indirizzo: "VIALE DEL LAVORO 82, 35020 PONTE SAN NICOLO' (PD)", cf: "00825290281", tipo: "IMPIANTO", email: "fratellilucati@gmail.com", tel: "+39 049 8969056" },
  { nome: "F.lli Santini S.r.l.", indirizzo: "VIA GIOTTO 4/A, 39100 BOLZANO (BZ)", cf: "01133050219", tipo: "IMPIANTO", email: "renata.pulvirenti@grupposantini.com", tel: "+39 0471-195195" },
  { nome: "F.R. Ferrosi Rottami Srl", indirizzo: "VIA GIUSEPPE MONTANELLI 39/11, 61122 PESARO (PU)", cf: "02771900418", tipo: "IMPIANTO", email: "frferrosirottami@gmail.com", tel: "329 183 0110" },
  { nome: "Fer.Bi.Metal. S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@ferbimetal.it" },
  { nome: "Ferram S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "signorellimarco@alice.it" },
  { nome: "Ferrario Srl", indirizzo: "VIA CERRO 84, UBOLDO (VA)", cf: "00394500128", tipo: "IMPIANTO", email: "ferrariougoec@tiscali.it" },
  { nome: "Ferrometal S.r.l.", indirizzo: "VIA GIOVANNI CAMERA 25, 16153 SERRA RICCO' (GE)", cf: "02358020994", tipo: "IMPIANTO", email: "amministrazione@ferrometal.it", tel: "010.412624" },
  { nome: "Ferviva Rottami Srl", indirizzo: "VIA DON GIOVANNI MINZONI 49, 12011 BORGO SAN DALMAZZO (CN)", cf: "03322100045", tipo: "IMPIANTO", email: "ecologia@ferviva.it", tel: "0171 269676" },
  { nome: "Fiducia Srl - Società Benefit", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@fiduciasrl.it" },
  { nome: "Fo.Sf. Metal Snc Di Forleo Mario", indirizzo: "VIA G.AGNELLI 13, 10026 SANTENA (TO)", cf: "09171900013", tipo: "IMPIANTO", email: "amministrazione.fosf@gmail.com", tel: "011 949 3996" },
  { nome: "Fontana Metalli Sas", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "dittafontana@hotmail.it" },
  { nome: "Francioni Rottami Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@francionirottami.it" },

  // === G ===
  { nome: "Futura Società Cooperativa", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "coop.futura224@gmail.com" },
  { nome: "G.E.A. Srl", indirizzo: "S.S. PER VOGHERA 95, 15057 TORTONA (AL)", cf: "09523470962", tipo: "IMPIANTO" },
  { nome: "Gabbero Davide", indirizzo: "FRAZ.SAN LUCA 10, 10068 VILLAFRANCA PIEMONTE (TO)", cf: "11044930011", tipo: "IMPIANTO", email: "annamariacianfaglia@libero.it" },
  { nome: "Game.Fer S.r.l.", indirizzo: "VIALE PALMIRO TOGLIATTI 1009, 00155 ROMA (RM)", cf: "09291501006", tipo: "IMPIANTO", email: "contabilitagamefer@gmail.com" },
  { nome: "Gargano Giuseppe", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@giuseppegargano.it" },
  { nome: "Gemafer S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "gemafersrl@gmail.com" },
  { nome: "Gestioni Ecologiche Ambientali Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "roxana@geatortona.it" },
  { nome: "Glomat Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "glomat9589@gmail.com" },
  { nome: "Gometal Di Picone Mathias", indirizzo: "VIA DEL LAVORO 90/92, ASTI (AT)", cf: "01753810058", tipo: "IMPIANTO", email: "gometaldipicone@libero.it" },
  { nome: "Green Service Impianti S.r.l.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "greenserviceimpianti@gmail.com" },
  { nome: "Guastini Giuseppe S.r.l.", indirizzo: "VIA SILEA SNC, 19038 SARZANA (SP)", cf: "01127580114", tipo: "IMPIANTO", email: "fiscale@guastinigiuseppesrl.it", tel: "0187 620398" },

  // === I ===
  { nome: "I.T.Ro.Fer Industria S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "commerciometalli@itrofer.it" },
  { nome: "IBH Galzignano S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@galzignano.it" },
  { nome: "Immobiliare Rinnovamento Centro Spa", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "rinnovamentocentrospa@legalmail.it" },
  { nome: "Impresa Costruzioni Enrico Bena", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "impresacostruzionieb@pec.it" },
  { nome: "Italfer S.r.l.", indirizzo: "VIA RIVAROLO SNC, 10040 LOMBARDORE (TO)", cf: "11127280011", tipo: "IMPIANTO", email: "italfer.rottami@email.it", tel: "011 995 6318" },

  // === K ===
  { nome: "K.I. Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "simone.muraca@korusgroup.com" },
  { nome: "Kristalfer S.r.l.", indirizzo: "VIA DON SASSELLI D'ERA 9, 37041 ALBAREDO D'ADIGE (VR)", cf: "04910060237", tipo: "IMPIANTO", email: "kristalfersrl@gmail.com" },

  // === L ===
  { nome: "La Flaminia Recuperi Srl", indirizzo: "VIA FLAMINIA 3 LOC.S.G. PROFIAMMA KM.198, 06034 FOLIGNO (PG)", cf: "03942610548", tipo: "IMPIANTO", email: "laflaminiarecuperi@gmail.com" },
  { nome: "La Gatteo Rottami S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@lagatteorottami.it" },
  { nome: "La Rocca S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@laroccasrl.eu" },
  { nome: "Legnosfera Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info.legnosfera@gmail.com" },
  { nome: "Libra S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "serena@librasoluzioni.com" },
  { nome: "Lollini Ferrometalli Di Alessandro Lollini", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "lolliniferrometalli@gmail.com" },
  { nome: "Lombafer", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "zeudigaratti@gmail.com" },
  { nome: "Luraschi Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@luraschisrl.it" },

  // === M ===
  { nome: "Mai Rottami Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@mairottami.it" },
  { nome: "Mantova Rottami Srl", indirizzo: "VIA GEROLE 26, REDONDESCO (MN)", cf: "02611510203", tipo: "IMPIANTO", email: "mantovarottami@gmail.com" },
  { nome: "Marocco Sergio", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "sergioviaroma59@gmail.com" },
  { nome: "Masterporte Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@masterporte.com" },
  { nome: "Mat.Rec Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "formulari@matrec.net" },
  { nome: "Metal Mega Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "metalmega@metalmega.it" },
  { nome: "Metaldesio Srl", indirizzo: "VIA FORLANINI 71/B, 20851 DESIO (MB)", cf: "06508020960", tipo: "IMPIANTO", email: "info@metaldesiosrl.it", tel: "0362 178 5660" },
  { nome: "Metalfer Di Pio Mario Srl", indirizzo: "REGIONE BOERINO 287, 12044 CENTALLO (CN)", cf: "03571140049", tipo: "IMPIANTO", email: "info@metalfer.cuneo.it" },
  { nome: "Metalfer S.r.l. Motteggiana", indirizzo: "VIA ANTONIO MEUCCI 3, 46020 MOTTEGGIANA (MN)", cf: "02170970202", tipo: "IMPIANTO", email: "Amministrazione@metalfersrl.com", tel: "0376 527680" },
  { nome: "Metalfer S.r.l. Volpiano", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "s.frasca@retrac.it" },
  { nome: "Metalfer Srl Siccomario", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "demolizioni@metalfersrl.it" },
  { nome: "Metallica Marcon Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "mario@metallicamarcon.it" },
  { nome: "Metallurgica Biellese Srl", indirizzo: "VIA FRATELLI CAIROLI 150, 13894 GAGLIANICO (BI)", cf: "02136650021", tipo: "IMPIANTO", email: "info@metallurgicabiellese.it", tel: "015 542085" },
  { nome: "Metalrecycling Italy Srl", indirizzo: "VIA INDUSTRIALE 120/A, CAPRIANO (BS)", cf: "03842430989", tipo: "IMPIANTO", email: "metalrecyclingitaly@libero.it" },
  { nome: "Migliori Di Armillotta Valerio", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@miglioritendetorino.it" },
  { nome: "Miniaci S.r.l.", indirizzo: "VIA RANZI 178, 17027 PIETRA LIGURE (SV)", cf: "01494510090", tipo: "IMPIANTO", email: "info@miniaci.it", tel: "019 628466" },
  { nome: "Mirabelli S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "Info@mirabellisrl.it" },

  // === N ===
  { nome: "Napolitano Sebastiano", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@napolitanorottami.it" },
  { nome: "Navalsider Porto S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@navalsiderporto.com" },
  { nome: "New Edy Srl", indirizzo: "VIA MASCAGNI 18, MONTESILVANO (PE)", cf: "01700020686", tipo: "IMPIANTO", email: "accettazione@newedy.com" },
  { nome: "Next S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "nextcostruzioni@gmail.com" },
  { nome: "Noseco Di Nosè Romina Francesca", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "noseco.romina@gmail.com" },
  { nome: "Nuova Frassine S.r.l.", indirizzo: "VIA SAN GEMINIANO 4, 46100 MANTOVA (MN)", cf: "02053610206", tipo: "IMPIANTO", email: "frassine.srl@libero.it" },
  { nome: "Nuova Malco S.r.l.", indirizzo: "VIA VALDILOCCHI SNC, 19121 LA SPEZIA (SP)", cf: "00983820119", tipo: "IMPIANTO", email: "logistica@malcoriciclo.it", tel: "0187 506191" },
  { nome: "Nuova Metalvarta", indirizzo: "VIALE ETRURIA 5, FIRENZE (FI)", cf: "04205940481", tipo: "IMPIANTO" },

  // === O ===
  { nome: "Obi Elettrica Di Oberti Francesco", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "francesco@obielettrica.it" },
  { nome: "Odulia S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@odulia.it" },

  // === P ===
  { nome: "Pasquero S.r.l.", indirizzo: "CORSO SAVONA 52, 10024 MONCALIERI (TO)", cf: "07656790016", tipo: "IMPIANTO", email: "commerciale@pasquero.com", tel: "011 640 6281" },
  { nome: "PH Metal Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "phmetalsrl@gmail.com" },
  { nome: "Phoenix Group S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "phoenixgroupsrl.22@gmail.com" },
  { nome: "Prato Fer S.r.l.", indirizzo: "VIA MASACCIO 11/A, 59013 MONTEMURLO (PO)", cf: "02435940974", tipo: "IMPIANTO", email: "pratofersrl@gmail.com" },
  { nome: "Proxima Battery S.r.l.", indirizzo: "VIA PRIMO MAGGIO 15, 40011 ANZOLA DELL'EMILIA (BO)", cf: "03880791201", tipo: "IMPIANTO", email: "proximabatterysrl@libero.it" },
  { nome: "Puppo Metalli S.r.l.", indirizzo: "VIA MULTEDO DI PEGLI 2, 16155 GENOVA (GE)", cf: "02626200998", tipo: "IMPIANTO", email: "info@puppometalli.eu" },

  // === R ===
  { nome: "R.M. Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@rmonline.it" },
  { nome: "Ralacarta S.r.l.", indirizzo: "LOC. CEOLE 7, 38066 RIVE DEL GARDA (TN)", cf: "02764110223", tipo: "IMPIANTO", email: "ecologia@ralacarta.com" },
  { nome: "Recmet S.r.l.", indirizzo: "VIA LOTTIZZAZIONE 35, 54100 MASSA (MS)", cf: "01324500451", tipo: "IMPIANTO", email: "magazzino@recmet.it" },
  { nome: "Recmetal S.r.l.s.", indirizzo: "STRADA PROVINCIALE PIOSSASCO 46/I, 10040 VOLVERA (TO)", cf: "12763770018", tipo: "IMPIANTO", email: "amministrazione.recmetal@gmail.com" },
  { nome: "Recuperi Marengo Srl", indirizzo: "VIA RANA 3, SPINETTA M.GO (AL)", cf: "02642080069", tipo: "IMPIANTO", email: "recuperimarengosrl@gmail.com" },
  { nome: "Reggio Ecologia Srl", indirizzo: "VIA L.L. ZAMENHOF 25/A, REGGIO NELL'EMILIA (RE)", cf: "01774780355", tipo: "IMPIANTO" },
  { nome: "Reggio Rottami S.r.l.", indirizzo: "VIA SAN BIAGIO 76/C, CASTELNOVO DI SOTTO (RE)", cf: "02398040358", tipo: "IMPIANTO", email: "info@reggiorottamisrl.it" },
  { nome: "Ricci Srl", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@riccipelletterie.it" },
  { nome: "Riva S.r.l.", indirizzo: "VIA CASELLETTE 200, 10091 ALPIGNANO (TO)", cf: "04760110017", tipo: "IMPIANTO", email: "segreteria@rivarottami.it", tel: "011 967 4789" },
  { nome: "Rizzi Tobia S.a.s.", indirizzo: "VIA VALLOMBROSA 1, 20080 VERNATE (MI)", cf: "04793740962", tipo: "IMPIANTO", email: "amministrazione@rizzirottami.com" },
  { nome: "Rota Fer-Metal S.r.l.", indirizzo: "VIA STEZZANO 33, ZANICA (BG)", cf: "00971530167", tipo: "IMPIANTO", email: "info@rotafermetal.it" },
  { nome: "Rottam Ferrara Di Cavicchi S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "rottam@libero.it" },
  { nome: "Rottam Ittica S.r.l.", indirizzo: "VIA MONTALBANO 1419/A, 47842 SAN GIOVANNI IN MARIGNANO (RN)", cf: "01278430408", tipo: "IMPIANTO", email: "info@rottamittica.it", tel: "0541 955219" },
  { nome: "Rottami Italia S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "rottamiitalia@gmail.com" },
  { nome: "RPF Di Riccardino Roberto S.a.s.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "rpfambiente@gmail.com" },

  // === S ===
  { nome: "Sa.Fer. Srl", indirizzo: "VIA BABIASSO 13, 10070 FRONT (TO)", cf: "12915590017", tipo: "IMPIANTO", email: "safergroupsrl@virgilio.it", tel: "0119251723" },
  { nome: "Salvadori Demolizioni S.r.l.", indirizzo: "VIA ENRIQUES 106, 57121 LIVORNO (LI)", cf: "01680630496", tipo: "IMPIANTO", email: "salvadori.demolizioni@gmail.com" },
  { nome: "Sannicolo' Sandra", indirizzo: "VIA DELLO SCALO 16, 05026 MONTECASTRILLI (TR)", cf: "00563600550", tipo: "IMPIANTO", email: "sannicolo.sandra@virgilio.it", tel: "0744 943971" },
  { nome: "Scarponi Luciano Srl", indirizzo: "VIA A. CANINI 7, 06081 TORCHIAGINA DI ASSISI (PG)", cf: "02352780544", tipo: "IMPIANTO", email: "info@scarponilucianosrl.it" },
  { nome: "Seraplastic S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "amministrazione@seraplastic.it" },
  { nome: "SG S.r.l.", indirizzo: "VIA MONTE BIANCO 2/A, 20149 MILANO (MI)", cf: "04151190966", tipo: "IMPIANTO", email: "laura.sgsrl@gmail.com" },
  { nome: "Siderfer S.r.l.", indirizzo: "STRADA DELLA CEBROSA 15, 10036 SETTIMO TORINESE (TO)", cf: "00916070014", tipo: "IMPIANTO", email: "info@siderfer.it" },
  { nome: "Sivieri Metalli S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@sivierimetalli.it" },
  { nome: "Spada Rottami S.r.l.", indirizzo: "VIA LARGO BOSCHETTI 32, GAMBETTOLA (FC)", cf: "04537610406", tipo: "IMPIANTO", email: "spadarottamisrl@gmail.com" },
  { nome: "Spazio Serramenti S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "leo@spazioserramenti.it" },
  { nome: "Station Service Srl", indirizzo: "VIA NOMENTANA 1107, 00137 ROMA (RM)", cf: "04371431000", tipo: "IMPIANTO", email: "acquisti@stationservicesrl.it", tel: "335 186 4947" },
  { nome: "Stena Metalli Srls", indirizzo: "VIA COTTOLENGO 75, 10079 MAPPANO (TO)", cf: "11784280015", tipo: "IMPIANTO", email: "stenametallisrls@gmail.com", tel: "333 2239866" },

  // === T ===
  { nome: "Tecnorame S.r.l.", indirizzo: "VIA KENNEDY 2, TORGIANO (PG)", cf: "03205690542", tipo: "IMPIANTO", email: "info@ercolanoni.it" },
  { nome: "Torino Recuperi Metalli S.r.l.", indirizzo: "VIA ANDREA CIARDI 17, 76125 TRANI (BT)", cf: "12260910018", tipo: "IMPIANTO" },
  { nome: "TR Trulli Rottami Srl", indirizzo: "VIA TOMBARELLO 1/C, 40053 VALSAMOGGIA (BO)", cf: "03960891202", tipo: "IMPIANTO", email: "TrulliRottami@outlook.it" },
  { nome: "Trebi S.r.l.", indirizzo: "VIA CREMONESE 142/B, 43126 PARMA (PR)", cf: "02805710346", tipo: "IMPIANTO", email: "info.trebisrl@gmail.com", tel: "0521647173" },
  { nome: "Truccolo Angelo S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@truccoloangelo.com" },

  // === V ===
  { nome: "V.G. Serramenti Di Vaia Giacinto", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@vgserramenti.it" },
  { nome: "V.T.R. Di Cilisto Raimondo Valerio S.a.s.", indirizzo: "VIA PATRIOTI ROMANESI 160, 24058 ROMANO DI LOMBARDIA (BG)", cf: "02218580161", tipo: "IMPIANTO", email: "vtr.cilisto@live.it", tel: "0363 903089" },
  { nome: "Valfed S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "falegnameriavalfed@gmail.com" },
  { nome: "Vassena Srl", indirizzo: "VIA PIOGALLI SNC, ANNONE BRIANZA (LC)", cf: "0189239139", tipo: "IMPIANTO", email: "info@vassenarottami.com" },
  { nome: "Verde Liguria Riciclaggi Srl", indirizzo: "VIA DEL COMMERCIO E DELL'INDUSTRIA 7, 17055 TOIRANO (SV)", cf: "01426720098", tipo: "IMPIANTO", email: "sara.info@verdeliguria.it" },
  { nome: "Versilia Rottami S.r.l.", indirizzo: "VIA BOUCHETTE 4, 55041 CAMAIORE (LU)", cf: "01569450461", tipo: "IMPIANTO", email: "versiliarottamisrl@gmail.com" },
  { nome: "Vigna Recycling S.r.l.", indirizzo: "VIA IGNAZIO SILONE 16, 60035 JESI (AN)", cf: "02530140421", tipo: "IMPIANTO", email: "fir@vignarecycling.it", tel: "0731605784" },
  { nome: "Villa Costruzioni Edili S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "contabilita@villacostruzioni.com" },

  // === Z ===
  { nome: "Zac S.r.l.", indirizzo: "", cf: "", tipo: "IMPIANTO", email: "info@zacecology.it" },
  { nome: "Zampoli S.r.l.", indirizzo: "VIA GALILEO GALILEI 35, 38015 LAVIS (TN)", cf: "01264120229", tipo: "IMPIANTO", email: "info@zampoli.it" },
  { nome: "Zanchelini Srl", indirizzo: "VIA PRIMA STRADA 21/23, 36071 ARZIGNANO (VI)", cf: "03333620247", tipo: "IMPIANTO", email: "info@zanchelini.com" },
  { nome: "Zimbardi S.r.l.", indirizzo: "CORSO VITTORIO OLCESE 5, 12060 CLAVESANA (CN)", cf: "03491680041", tipo: "IMPIANTO", email: "gzimbardi@tiscali.it", tel: "0173 790170" },
  { nome: "Zinco Cofani Srl", indirizzo: "VIA MAJORANA 21, 27036 MORTARA (PV)", cf: "00227730181", tipo: "IMPIANTO", email: "info@zincocofani.it" },
];

// Tutti i destinatari selezionabili (solo IMPIANTO, esclusi TRASPORTATORE)
export const DESTINATARI = IMPIANTI.filter(s => s.tipo === "IMPIANTO");

// PRODUTTORI punta a IMPIANTI per compatibilità
export const PRODUTTORI = IMPIANTI;
