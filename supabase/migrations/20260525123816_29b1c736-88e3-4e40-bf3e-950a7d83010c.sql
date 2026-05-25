
-- Rimuove i caricamenti precedenti (giacenza_iniziale + conferimento_privato) per Multyproget
DELETE FROM movimenti_impianto
WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'
  AND origine IN ('giacenza_iniziale','conferimento_privato');

-- Inserisce CARICO e SCARICO per ogni CER replicando il file di origine StRegRag-4
WITH src(cer, descrizione, carico, scarico) AS (
  VALUES
    ('010408','scarti di ghiaia e pietrisco, diversi da quelli di cui alla voce 01 04 07',42980::numeric,42980::numeric),
    ('030105','segatura, trucioli, residui di taglio, legno, pannelli di truciolare e piallacci',154220,154020),
    ('070213','rifiuti plastici',9220,9220),
    ('080111','pitture e vernici di scarto, contenenti solventi organici o altre sostanze pericolose',1590,1590),
    ('080312','scarti di inchiostro, contenenti sostanze pericolose',210,210),
    ('080318','toner per stampa esauriti, diversi da quelli di cui alla voce 08 03 17',840,840),
    ('090105','soluzioni di lavaggio e soluzioni di arresto-fissaggio',110,110),
    ('100210','scaglie di laminazione',314340,309400),
    ('120101','limatura e trucioli di metalli ferrosi',1663672,1634432),
    ('120102','polveri e particolato di metalli ferrosi',4076158,3970040),
    ('120103','limatura e trucioli di metalli non ferrosi',16020,13530),
    ('120104','polveri e particolato di metalli non ferrosi',9880,9880),
    ('120105','limatura e trucioli di materiali plastici',1160,1160),
    ('120107','oli minerali per macchinari, non contenenti alogeni',340,340),
    ('120109','emulsioni e soluzioni per macchinari, non contenenti alogeni',25726,23100),
    ('120117','residui di materiale di sabbiatura, diversi da quelli di cui alla voce 12 01 16',48463,46063),
    ('120121','corpi d''utensile e materiali di rettifica esauriti',14675,0),
    ('120301','soluzioni acquose di lavaggio',3860,3860),
    ('130110','oli minerali per circuiti idraulici, non clorurati',2160,2160),
    ('130205','oli minerali per motori, ingranaggi e lubrificazione, non clorurati',4840,2000),
    ('150101','imballaggi di carta e cartone',312800,311005),
    ('150102','imballaggi di plastica',124565,121865),
    ('150103','imballaggi in legno',1197409,1187476),
    ('150104','imballaggi metallici',111373.70,111373.70),
    ('150106','imballaggi in materiali misti',1693610,1653243),
    ('150107','imballaggi di vetro',11300,11000),
    ('150110','imballaggi contenenti residui di sostanze pericolose o contaminati',37853,33893),
    ('150202','assorbenti, materiali filtranti (inclusi filtri dell''olio non specificati altrimenti)',67891,59971),
    ('150203','assorbenti, materiali filtranti, stracci e indumenti protettivi',16447,15447),
    ('160103','pneumatici fuori uso',52150,51680),
    ('160117','metalli ferrosi',29820,29820),
    ('160119','plastica',34768,34768),
    ('160120','vetro',35404,33340),
    ('160122','componenti non specificati altrimenti',17960,17960),
    ('160213','apparecchiature fuori uso, contenenti componenti pericolosi',4640,4610),
    ('160214','apparecchiature fuori uso, diverse da quelle di cui alle voci 16 02 09 a 16',208938,202879),
    ('160216','componenti rimossi da apparecchiature fuori uso',99408,98932),
    ('160504','gas in contenitori a pressione (compresi gli halon), contenenti sostanze pericolose',3,0),
    ('160505','gas in contenitori a pressione, diversi da quelli di cui alla voce 16 05 04',43614,43614),
    ('160601','batterie al piombo',594112,588059),
    ('160604','batterie alcaline (tranne 16 06 03)',3988,3940),
    ('160605','altre batterie ed accumulatori',206195,199825),
    ('170102','mattoni',164190,164190),
    ('170107','miscugli di cemento, mattoni, mattonelle e ceramiche',5880,5880),
    ('170201','legno',97694,94294),
    ('170202','vetro',23705,21400),
    ('170203','plastica',33867,33867),
    ('170302','miscele bituminose diverse da quelle di cui alla voce 17 03 01',2020,2020),
    ('170401','rame, bronzo, ottone',194713,190913),
    ('170402','alluminio',394521,393325),
    ('170403','piombo',27415,26615),
    ('170405','ferro e acciaio',8596046.575,8572586),
    ('170407','metalli misti',1103420.50,1090590),
    ('170411','cavi, diversi da quelli di cui alla voce 17 04 10',186219,178416),
    ('170603','altri materiali isolanti contenenti o costituiti da sostanze pericolose',15197,15197),
    ('170604','materiali isolanti, diversi da quelli di cui alle voci 17 06 01 e 17 06 03',14240,14240),
    ('170802','materiali da costruzione a base di gesso',14950,11880),
    ('170904','rifiuti misti dell''attivita'' di costruzione e demolizione',811090,811090),
    ('191202','metalli ferrosi',364000,364000),
    ('191203','metalli non ferrosi',283568,283568),
    ('191204','plastica e gomma',184837,184810),
    ('191207','legno diverso da quello di cui alla voce 19 12 06',4540,4540),
    ('191212','altri rifiuti (compresi materiali misti) prodotti dal trattamento meccanico dei rifiuti',417690,417690),
    ('200101','carta e cartone',2160,2160),
    ('200140','metalli',285587.80,284801),
    ('200140 MET MIX','metalli misti',966,0),
    ('200140-CAVO','cavo',42435,38438),
    ('200140-fe','ferro',158601.50,158014),
    ('200140-OT','ottone',123232.875,123018.875),
    ('200140-PI','piombo',6904,6701),
    ('200140-RA','rame',187403,187247),
    ('200307','rifiuti ingombranti',33666,32835)
)
INSERT INTO movimenti_impianto
  (impianto_id, tenant_id, cer, descrizione_rifiuto, quantita_kg, data_movimento, tipo_movimento, ruolo_impianto, origine, note)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid,
  cer, descrizione, carico, CURRENT_DATE, 'CARICO', 'DESTINATARIO', 'giacenza_iniziale',
  'Import StRegRag - carico storico'
FROM src WHERE carico > 0
UNION ALL
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid,
  cer, descrizione, scarico, CURRENT_DATE, 'SCARICO', 'DESTINATARIO', 'giacenza_iniziale',
  'Import StRegRag - scarico storico'
FROM src WHERE scarico > 0;
