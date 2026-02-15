# RENTRI API Survey e Fonti

## Linee Guida AGID e pattern JWT
- https://www.agid.gov.it/sites/agid/files/2024-05/1._piattaforma_acquisizione_dati%20(1).pdf
- https://www.agid.gov.it/sites/agid/files/2024-05/linee_guida_tecnologie_e_standard_sicurezza_interoperabilit_api_sistemi_informatici.pdf

## Implementazioni e interpretazioni operative (GovWay)
- https://govway.readthedocs.io/it/latest/console/profiloModIPA/messaggio/avanzata/header/index.html
- https://govway.org/documentazione/console/profiloModIPA/messaggio/avanzata/header/index.html

## RENTRI API (demo)
- https://demoapi.rentri.gov.it/docs?page=api-flussi-operativi-registri

## Osservazioni pratiche
- Header richiesti: Authorization Bearer (idAuth), Agid-JWT-Signature (jwt di integrità), Digest.
- POST: digest calcolato sul body e firma `signed_headers` con `digest` e `content-type`.
- GET: digest su stringa vuota e firma `signed_headers` con `digest`; possibili varianti di path per status e liste.

