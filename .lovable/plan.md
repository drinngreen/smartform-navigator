
# Ripristino File Progetto via Storage Upload

## Obiettivo
Permettere all'utente di caricare tutti i file del progetto (33MB) tramite una pagina web dedicata, salvarli nello Storage cloud, e poi ripristinarli nel progetto.

## Passaggi

### 1. Creare bucket Storage "code-backup"
- Bucket pubblico per semplificare la lettura
- Nessuna RLS complessa necessaria (temporaneo, per il ripristino)

### 2. Creare pagina /restore con upload multiplo
- Input file con attributo `webkitdirectory` per caricare intere cartelle mantenendo i path
- Barra di progresso per monitorare l'upload
- Lista dei file caricati con il loro percorso relativo
- Pulsante "Carica tutto" 

### 3. Upload dei file nello Storage
- Ogni file viene caricato nel bucket `code-backup` con il path relativo come chiave (es. `server/index.ts`, `src/pages/Home.tsx`)
- Upload sequenziale o a batch per evitare timeout

### 4. Ripristino manuale
- Una volta caricati, potrò elencare i file nel bucket e leggerne il contenuto
- Ricreo ogni file nel progetto con il contenuto originale

## Dettagli Tecnici

### Storage bucket
```sql
-- Bucket pubblico temporaneo per il ripristino
INSERT INTO storage.objects ... (gestito via Supabase Storage API)
```

### Pagina /restore (nuova)
- Componente React con input `directory` per upload cartelle
- Usa `supabase.storage.from('code-backup').upload(path, file)` per ogni file
- Mostra progresso: file caricati / totali
- Filtra automaticamente file non necessari (node_modules, .git, dist)

### Flusso
```text
Utente seleziona cartella progetto
        |
        v
Frontend legge tutti i file con webkitdirectory
        |
        v
Upload sequenziale su Storage bucket "code-backup"
        |
        v
AI legge i file dal bucket e li ricrea nel progetto
```

### Limitazioni note
- File binari (immagini, .p12) verranno caricati ma potranno richiedere gestione separata
- Il bucket verra' eliminato dopo il ripristino
- Upload di ~33MB potrebbe richiedere qualche minuto
