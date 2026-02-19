export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          keywords: string[] | null
          metadata: Json | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          tool_call_id: string | null
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      anagrafica_privati: {
        Row: {
          attivo: boolean
          automezzo: string | null
          cap: string | null
          cellulare: string | null
          codice_destinatario: string | null
          codice_fiscale: string
          cognome: string
          comune_residenza: string | null
          created_at: string
          denominazione: string | null
          email: string | null
          fax: string | null
          id: string
          impianto_id: string | null
          import_batch_id: string | null
          import_source: string | null
          indirizzo: string | null
          nazione: string | null
          nome: string
          note: string | null
          numero_tessera: string | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          targa_automezzo: string | null
          telefono: string | null
          tenant_id: string | null
          tipo_utenza: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          automezzo?: string | null
          cap?: string | null
          cellulare?: string | null
          codice_destinatario?: string | null
          codice_fiscale: string
          cognome: string
          comune_residenza?: string | null
          created_at?: string
          denominazione?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          impianto_id?: string | null
          import_batch_id?: string | null
          import_source?: string | null
          indirizzo?: string | null
          nazione?: string | null
          nome: string
          note?: string | null
          numero_tessera?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          targa_automezzo?: string | null
          telefono?: string | null
          tenant_id?: string | null
          tipo_utenza?: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          automezzo?: string | null
          cap?: string | null
          cellulare?: string | null
          codice_destinatario?: string | null
          codice_fiscale?: string
          cognome?: string
          comune_residenza?: string | null
          created_at?: string
          denominazione?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          impianto_id?: string | null
          import_batch_id?: string | null
          import_source?: string | null
          indirizzo?: string | null
          nazione?: string | null
          nome?: string
          note?: string | null
          numero_tessera?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          targa_automezzo?: string | null
          telefono?: string | null
          tenant_id?: string | null
          tipo_utenza?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anagrafica_privati_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anagrafica_privati_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      call_cost_adjustments: {
        Row: {
          amount: number
          call_id: string | null
          created_at: string
          id: string
          reason: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          call_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          call_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_cost_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          answered_at: string | null
          answered_by: string | null
          call_type: Database["public"]["Enums"]["call_type"]
          callee_ids: string[]
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          metadata: Json | null
          retell_call_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["call_status"]
          transcript: string | null
          video_enabled: boolean
        }
        Insert: {
          answered_at?: string | null
          answered_by?: string | null
          call_type?: Database["public"]["Enums"]["call_type"]
          callee_ids: string[]
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          retell_call_id?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["call_status"]
          transcript?: string | null
          video_enabled?: boolean
        }
        Update: {
          answered_at?: string | null
          answered_by?: string | null
          call_type?: Database["public"]["Enums"]["call_type"]
          callee_ids?: string[]
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          retell_call_id?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["call_status"]
          transcript?: string | null
          video_enabled?: boolean
        }
        Relationships: []
      }
      comunicazioni_log: {
        Row: {
          canale: string
          contatto_id: string | null
          contenuto: string
          created_at: string
          created_by: string | null
          destinatario: string
          id: string
          oggetto: string | null
          risposta_api: Json | null
          stato: string
          tenant_id: string
        }
        Insert: {
          canale: string
          contatto_id?: string | null
          contenuto: string
          created_at?: string
          created_by?: string | null
          destinatario: string
          id?: string
          oggetto?: string | null
          risposta_api?: Json | null
          stato?: string
          tenant_id: string
        }
        Update: {
          canale?: string
          contatto_id?: string | null
          contenuto?: string
          created_at?: string
          created_by?: string | null
          destinatario?: string
          id?: string
          oggetto?: string | null
          risposta_api?: Json | null
          stato?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicazioni_log_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "rubrica_contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicazioni_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          fir_id: string | null
          id: string
          lat: number
          lng: number
          speed: number | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          fir_id?: string | null
          id?: string
          lat: number
          lng: number
          speed?: number | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          fir_id?: string | null
          id?: string
          lat?: number
          lng?: number
          speed?: number | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      erp_anagrafiche: {
        Row: {
          attivo: boolean
          cap: string | null
          codice_destinatario: string | null
          codice_fiscale: string | null
          cognome: string | null
          comune: string | null
          condizioni_pagamento_default: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          indirizzo: string | null
          nazione: string | null
          nome: string | null
          note: string | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          ragione_sociale: string
          telefono: string | null
          tenant_id: string | null
          tipo_soggetto: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cap?: string | null
          codice_destinatario?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          comune?: string | null
          condizioni_pagamento_default?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          indirizzo?: string | null
          nazione?: string | null
          nome?: string | null
          note?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale: string
          telefono?: string | null
          tenant_id?: string | null
          tipo_soggetto: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cap?: string | null
          codice_destinatario?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          comune?: string | null
          condizioni_pagamento_default?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          indirizzo?: string | null
          nazione?: string | null
          nome?: string | null
          note?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string
          telefono?: string | null
          tenant_id?: string | null
          tipo_soggetto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_anagrafiche_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_causali_contabili: {
        Row: {
          attivo: boolean
          codice: string
          created_at: string
          descrizione: string
          id: string
          tenant_id: string | null
          tipo: string
        }
        Insert: {
          attivo?: boolean
          codice: string
          created_at?: string
          descrizione: string
          id?: string
          tenant_id?: string | null
          tipo: string
        }
        Update: {
          attivo?: boolean
          codice?: string
          created_at?: string
          descrizione?: string
          id?: string
          tenant_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_causali_contabili_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_codici_iva: {
        Row: {
          aliquota: number
          attivo: boolean
          codice: string
          created_at: string
          descrizione: string
          id: string
          natura: string | null
          tenant_id: string | null
        }
        Insert: {
          aliquota?: number
          attivo?: boolean
          codice: string
          created_at?: string
          descrizione: string
          id?: string
          natura?: string | null
          tenant_id?: string | null
        }
        Update: {
          aliquota?: number
          attivo?: boolean
          codice?: string
          created_at?: string
          descrizione?: string
          id?: string
          natura?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_codici_iva_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_fatture_vendita: {
        Row: {
          causale_id: string | null
          cliente_id: string | null
          condizioni_pagamento: string | null
          contabilizzata: boolean
          created_at: string
          created_by: string | null
          da_conferimenti: boolean
          data_fattura: string
          id: string
          imponibile: number
          iva: number
          metodo_pagamento_id: string | null
          netto_a_pagare: number
          note: string | null
          numero: string
          ritenuta_acconto: number | null
          stato: string
          tenant_id: string | null
          tipo_documento: string
          totale: number
          updated_at: string
        }
        Insert: {
          causale_id?: string | null
          cliente_id?: string | null
          condizioni_pagamento?: string | null
          contabilizzata?: boolean
          created_at?: string
          created_by?: string | null
          da_conferimenti?: boolean
          data_fattura?: string
          id?: string
          imponibile?: number
          iva?: number
          metodo_pagamento_id?: string | null
          netto_a_pagare?: number
          note?: string | null
          numero: string
          ritenuta_acconto?: number | null
          stato?: string
          tenant_id?: string | null
          tipo_documento?: string
          totale?: number
          updated_at?: string
        }
        Update: {
          causale_id?: string | null
          cliente_id?: string | null
          condizioni_pagamento?: string | null
          contabilizzata?: boolean
          created_at?: string
          created_by?: string | null
          da_conferimenti?: boolean
          data_fattura?: string
          id?: string
          imponibile?: number
          iva?: number
          metodo_pagamento_id?: string | null
          netto_a_pagare?: number
          note?: string | null
          numero?: string
          ritenuta_acconto?: number | null
          stato?: string
          tenant_id?: string | null
          tipo_documento?: string
          totale?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_fatture_vendita_causale_id_fkey"
            columns: ["causale_id"]
            isOneToOne: false
            referencedRelation: "erp_causali_contabili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_fatture_vendita_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "erp_anagrafiche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_fatture_vendita_metodo_pagamento_id_fkey"
            columns: ["metodo_pagamento_id"]
            isOneToOne: false
            referencedRelation: "erp_metodi_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_fatture_vendita_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_fatture_xml: {
        Row: {
          created_at: string
          esito_json: Json | null
          fattura_id: string
          id: string
          nome_file: string | null
          sdi_id: string | null
          stato: string
          tenant_id: string | null
          updated_at: string
          versione: number
          xml_content: string | null
        }
        Insert: {
          created_at?: string
          esito_json?: Json | null
          fattura_id: string
          id?: string
          nome_file?: string | null
          sdi_id?: string | null
          stato?: string
          tenant_id?: string | null
          updated_at?: string
          versione?: number
          xml_content?: string | null
        }
        Update: {
          created_at?: string
          esito_json?: Json | null
          fattura_id?: string
          id?: string
          nome_file?: string | null
          sdi_id?: string | null
          stato?: string
          tenant_id?: string | null
          updated_at?: string
          versione?: number
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_fatture_xml_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "erp_fatture_vendita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_fatture_xml_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_metodi_pagamento: {
        Row: {
          attivo: boolean
          codice: string
          codice_fatturapa: string | null
          created_at: string
          descrizione: string
          giorni_scadenza: number | null
          id: string
          numero_rate: number | null
          tenant_id: string | null
        }
        Insert: {
          attivo?: boolean
          codice: string
          codice_fatturapa?: string | null
          created_at?: string
          descrizione: string
          giorni_scadenza?: number | null
          id?: string
          numero_rate?: number | null
          tenant_id?: string | null
        }
        Update: {
          attivo?: boolean
          codice?: string
          codice_fatturapa?: string | null
          created_at?: string
          descrizione?: string
          giorni_scadenza?: number | null
          id?: string
          numero_rate?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_metodi_pagamento_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_piano_conti: {
        Row: {
          codice: string
          created_at: string
          descrizione: string
          id: string
          is_movimentabile: boolean
          livello: number
          parent_id: string | null
          tenant_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          codice: string
          created_at?: string
          descrizione: string
          id?: string
          is_movimentabile?: boolean
          livello?: number
          parent_id?: string | null
          tenant_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          codice?: string
          created_at?: string
          descrizione?: string
          id?: string
          is_movimentabile?: boolean
          livello?: number
          parent_id?: string | null
          tenant_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_piano_conti_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "erp_piano_conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_piano_conti_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_prima_nota: {
        Row: {
          causale_id: string | null
          created_at: string
          created_by: string | null
          data_registrazione: string
          descrizione: string
          documento_id: string | null
          documento_tipo: string | null
          id: string
          numero_registro: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          causale_id?: string | null
          created_at?: string
          created_by?: string | null
          data_registrazione?: string
          descrizione?: string
          documento_id?: string | null
          documento_tipo?: string | null
          id?: string
          numero_registro?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          causale_id?: string | null
          created_at?: string
          created_by?: string | null
          data_registrazione?: string
          descrizione?: string
          documento_id?: string | null
          documento_tipo?: string | null
          id?: string
          numero_registro?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_prima_nota_causale_id_fkey"
            columns: ["causale_id"]
            isOneToOne: false
            referencedRelation: "erp_causali_contabili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_prima_nota_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_prima_nota_righe: {
        Row: {
          centro_costo: string | null
          commessa: string | null
          conto_id: string | null
          created_at: string
          descrizione_riga: string | null
          id: string
          importo: number
          prima_nota_id: string
          segno: string
        }
        Insert: {
          centro_costo?: string | null
          commessa?: string | null
          conto_id?: string | null
          created_at?: string
          descrizione_riga?: string | null
          id?: string
          importo?: number
          prima_nota_id: string
          segno: string
        }
        Update: {
          centro_costo?: string | null
          commessa?: string | null
          conto_id?: string | null
          created_at?: string
          descrizione_riga?: string | null
          id?: string
          importo?: number
          prima_nota_id?: string
          segno?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_prima_nota_righe_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "erp_piano_conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_prima_nota_righe_prima_nota_id_fkey"
            columns: ["prima_nota_id"]
            isOneToOne: false
            referencedRelation: "erp_prima_nota"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_righe_fatture_vendita: {
        Row: {
          aliquota_iva: number
          centro_costo: string | null
          cer: string | null
          codice_iva_id: string | null
          commessa: string | null
          conferimento_id: string | null
          created_at: string
          descrizione: string
          fattura_id: string
          fir_id: string | null
          id: string
          impianto_id: string | null
          imponibile: number
          importo_iva: number
          peso_totale: number | null
          prezzo_unitario: number
          quantita: number
          riga_numero: number
          sconto_percentuale: number | null
        }
        Insert: {
          aliquota_iva?: number
          centro_costo?: string | null
          cer?: string | null
          codice_iva_id?: string | null
          commessa?: string | null
          conferimento_id?: string | null
          created_at?: string
          descrizione: string
          fattura_id: string
          fir_id?: string | null
          id?: string
          impianto_id?: string | null
          imponibile?: number
          importo_iva?: number
          peso_totale?: number | null
          prezzo_unitario?: number
          quantita?: number
          riga_numero?: number
          sconto_percentuale?: number | null
        }
        Update: {
          aliquota_iva?: number
          centro_costo?: string | null
          cer?: string | null
          codice_iva_id?: string | null
          commessa?: string | null
          conferimento_id?: string | null
          created_at?: string
          descrizione?: string
          fattura_id?: string
          fir_id?: string | null
          id?: string
          impianto_id?: string | null
          imponibile?: number
          importo_iva?: number
          peso_totale?: number | null
          prezzo_unitario?: number
          quantita?: number
          riga_numero?: number
          sconto_percentuale?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_righe_fatture_vendita_codice_iva_id_fkey"
            columns: ["codice_iva_id"]
            isOneToOne: false
            referencedRelation: "erp_codici_iva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_righe_fatture_vendita_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "erp_fatture_vendita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_righe_fatture_vendita_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
        ]
      }
      fir: {
        Row: {
          caratteristiche_hp: string[] | null
          cer: string | null
          conducente: string | null
          created_at: string
          created_by: string | null
          data_ora_fine: string | null
          data_ora_inizio: string | null
          descrizione_rifiuto: string | null
          destinatario_id: string | null
          id: string
          intermediario_id: string | null
          note: string | null
          numero_fir_local: string | null
          numero_fir_rentri: string | null
          organization_id: string
          percorso: string | null
          produttore_id: string | null
          quantita_prevista: number | null
          quantita_verificata: number | null
          rentri_fir_id: string | null
          rentri_sent_at: string | null
          rentri_version: number | null
          stato: Database["public"]["Enums"]["fir_stato"]
          stato_fisico: string | null
          targa: string | null
          targa_rimorchio: string | null
          trasportatore_id: string | null
          unita_misura: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          caratteristiche_hp?: string[] | null
          cer?: string | null
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data_ora_fine?: string | null
          data_ora_inizio?: string | null
          descrizione_rifiuto?: string | null
          destinatario_id?: string | null
          id?: string
          intermediario_id?: string | null
          note?: string | null
          numero_fir_local?: string | null
          numero_fir_rentri?: string | null
          organization_id: string
          percorso?: string | null
          produttore_id?: string | null
          quantita_prevista?: number | null
          quantita_verificata?: number | null
          rentri_fir_id?: string | null
          rentri_sent_at?: string | null
          rentri_version?: number | null
          stato?: Database["public"]["Enums"]["fir_stato"]
          stato_fisico?: string | null
          targa?: string | null
          targa_rimorchio?: string | null
          trasportatore_id?: string | null
          unita_misura?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          caratteristiche_hp?: string[] | null
          cer?: string | null
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data_ora_fine?: string | null
          data_ora_inizio?: string | null
          descrizione_rifiuto?: string | null
          destinatario_id?: string | null
          id?: string
          intermediario_id?: string | null
          note?: string | null
          numero_fir_local?: string | null
          numero_fir_rentri?: string | null
          organization_id?: string
          percorso?: string | null
          produttore_id?: string | null
          quantita_prevista?: number | null
          quantita_verificata?: number | null
          rentri_fir_id?: string | null
          rentri_sent_at?: string | null
          rentri_version?: number | null
          stato?: Database["public"]["Enums"]["fir_stato"]
          stato_fisico?: string | null
          targa?: string | null
          targa_rimorchio?: string | null
          trasportatore_id?: string | null
          unita_misura?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fir_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fir_intermediario_id_fkey"
            columns: ["intermediario_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fir_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fir_produttore_id_fkey"
            columns: ["produttore_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fir_trasportatore_id_fkey"
            columns: ["trasportatore_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fir_digitali: {
        Row: {
          api_rentri_esito: Json | null
          created_at: string
          fir_id: string | null
          id: string
          organization_id: string | null
          stato_firma_imp: string | null
          stato_firma_prod: string | null
          stato_firma_tras: string | null
          tenant_id: string | null
          updated_at: string
          xml_xfir: string | null
        }
        Insert: {
          api_rentri_esito?: Json | null
          created_at?: string
          fir_id?: string | null
          id?: string
          organization_id?: string | null
          stato_firma_imp?: string | null
          stato_firma_prod?: string | null
          stato_firma_tras?: string | null
          tenant_id?: string | null
          updated_at?: string
          xml_xfir?: string | null
        }
        Update: {
          api_rentri_esito?: Json | null
          created_at?: string
          fir_id?: string | null
          id?: string
          organization_id?: string | null
          stato_firma_imp?: string | null
          stato_firma_prod?: string | null
          stato_firma_tras?: string | null
          tenant_id?: string | null
          updated_at?: string
          xml_xfir?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fir_digitali_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "fir"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fir_digitali_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fir_digitali_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fir_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          fir_id: string
          id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          fir_id: string
          id?: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          fir_id?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fir_events_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "fir"
            referencedColumns: ["id"]
          },
        ]
      }
      fir_forms: {
        Row: {
          allegati: Json | null
          caratteristiche_hp: string[] | null
          codice_eer: string | null
          completed_at: string | null
          created_at: string
          data_arrivo: string | null
          data_partenza: string | null
          deleted_by_user: boolean
          descrizione_rifiuto: string | null
          destinatario_autorizzazione: string | null
          destinatario_cap: string | null
          destinatario_codice_fiscale: string | null
          destinatario_comune: string | null
          destinatario_denominazione: string | null
          destinatario_indirizzo: string | null
          destinatario_provincia: string | null
          form_data: Json | null
          id: string
          intermediario_codice_fiscale: string | null
          intermediario_denominazione: string | null
          intermediario_iscrizione_albo: string | null
          note: string | null
          numero_fir: string | null
          produttore_cap: string | null
          produttore_codice_fiscale: string | null
          produttore_comune: string | null
          produttore_denominazione: string | null
          produttore_indirizzo: string | null
          produttore_provincia: string | null
          quantita: number | null
          stato_fisico: string | null
          status: string
          submitted_at: string | null
          tenant_id: string
          trasportatore_codice_fiscale: string | null
          trasportatore_conducente: string | null
          trasportatore_denominazione: string | null
          trasportatore_iscrizione_albo: string | null
          trasportatore_targa_automezzo: string | null
          trasportatore_targa_rimorchio: string | null
          unita_misura: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allegati?: Json | null
          caratteristiche_hp?: string[] | null
          codice_eer?: string | null
          completed_at?: string | null
          created_at?: string
          data_arrivo?: string | null
          data_partenza?: string | null
          deleted_by_user?: boolean
          descrizione_rifiuto?: string | null
          destinatario_autorizzazione?: string | null
          destinatario_cap?: string | null
          destinatario_codice_fiscale?: string | null
          destinatario_comune?: string | null
          destinatario_denominazione?: string | null
          destinatario_indirizzo?: string | null
          destinatario_provincia?: string | null
          form_data?: Json | null
          id?: string
          intermediario_codice_fiscale?: string | null
          intermediario_denominazione?: string | null
          intermediario_iscrizione_albo?: string | null
          note?: string | null
          numero_fir?: string | null
          produttore_cap?: string | null
          produttore_codice_fiscale?: string | null
          produttore_comune?: string | null
          produttore_denominazione?: string | null
          produttore_indirizzo?: string | null
          produttore_provincia?: string | null
          quantita?: number | null
          stato_fisico?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          trasportatore_codice_fiscale?: string | null
          trasportatore_conducente?: string | null
          trasportatore_denominazione?: string | null
          trasportatore_iscrizione_albo?: string | null
          trasportatore_targa_automezzo?: string | null
          trasportatore_targa_rimorchio?: string | null
          unita_misura?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allegati?: Json | null
          caratteristiche_hp?: string[] | null
          codice_eer?: string | null
          completed_at?: string | null
          created_at?: string
          data_arrivo?: string | null
          data_partenza?: string | null
          deleted_by_user?: boolean
          descrizione_rifiuto?: string | null
          destinatario_autorizzazione?: string | null
          destinatario_cap?: string | null
          destinatario_codice_fiscale?: string | null
          destinatario_comune?: string | null
          destinatario_denominazione?: string | null
          destinatario_indirizzo?: string | null
          destinatario_provincia?: string | null
          form_data?: Json | null
          id?: string
          intermediario_codice_fiscale?: string | null
          intermediario_denominazione?: string | null
          intermediario_iscrizione_albo?: string | null
          note?: string | null
          numero_fir?: string | null
          produttore_cap?: string | null
          produttore_codice_fiscale?: string | null
          produttore_comune?: string | null
          produttore_denominazione?: string | null
          produttore_indirizzo?: string | null
          produttore_provincia?: string | null
          quantita?: number | null
          stato_fisico?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          trasportatore_codice_fiscale?: string | null
          trasportatore_conducente?: string | null
          trasportatore_denominazione?: string | null
          trasportatore_iscrizione_albo?: string | null
          trasportatore_targa_automezzo?: string | null
          trasportatore_targa_rimorchio?: string | null
          unita_misura?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fir_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fir_number_pool: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          consumed_at: string | null
          created_at: string
          fir_number: string
          id: string
          qr_code_data: string | null
          reserved_by_fir_id: string | null
          societa_id: string
          status: string
          suspended: boolean
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          consumed_at?: string | null
          created_at?: string
          fir_number: string
          id?: string
          qr_code_data?: string | null
          reserved_by_fir_id?: string | null
          societa_id?: string
          status?: string
          suspended?: boolean
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          consumed_at?: string | null
          created_at?: string
          fir_number?: string
          id?: string
          qr_code_data?: string | null
          reserved_by_fir_id?: string | null
          societa_id?: string
          status?: string
          suspended?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fir_number_pool_reserved_by_fir_id_fkey"
            columns: ["reserved_by_fir_id"]
            isOneToOne: false
            referencedRelation: "fir_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      impianti: {
        Row: {
          autorizzaz_regione: string | null
          capacita_m3: number | null
          codice_rentri: string | null
          comune: string | null
          coord_geo: Json | null
          created_at: string
          created_by: string | null
          id: string
          indirizzo: string | null
          nome: string
          organization_id: string | null
          provincia: string | null
          tenant_id: string | null
          tipi_trattamento: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          autorizzaz_regione?: string | null
          capacita_m3?: number | null
          codice_rentri?: string | null
          comune?: string | null
          coord_geo?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          organization_id?: string | null
          provincia?: string | null
          tenant_id?: string | null
          tipi_trattamento?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          autorizzaz_regione?: string | null
          capacita_m3?: number | null
          codice_rentri?: string | null
          comune?: string | null
          coord_geo?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          organization_id?: string | null
          provincia?: string | null
          tenant_id?: string | null
          tipi_trattamento?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impianti_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impianti_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intermediari: {
        Row: {
          attivo: boolean
          cap: string | null
          categoria_albo: string | null
          cer_autorizzati: string[] | null
          codice_destinatario: string | null
          codice_fiscale: string | null
          cognome: string | null
          comune: string | null
          created_at: string
          data_iscrizione_albo: string | null
          data_scadenza_albo: string | null
          email: string | null
          id: string
          indirizzo: string | null
          nazione: string | null
          nome: string | null
          note: string | null
          numero_iscrizione_albo: string | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          ragione_sociale: string
          telefono: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cap?: string | null
          categoria_albo?: string | null
          cer_autorizzati?: string[] | null
          codice_destinatario?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          comune?: string | null
          created_at?: string
          data_iscrizione_albo?: string | null
          data_scadenza_albo?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          nazione?: string | null
          nome?: string | null
          note?: string | null
          numero_iscrizione_albo?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale: string
          telefono?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cap?: string | null
          categoria_albo?: string | null
          cer_autorizzati?: string[] | null
          codice_destinatario?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          comune?: string | null
          created_at?: string
          data_iscrizione_albo?: string | null
          data_scadenza_albo?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          nazione?: string | null
          nome?: string | null
          note?: string | null
          numero_iscrizione_albo?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string
          telefono?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intermediari_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intermediazioni: {
        Row: {
          cer: string | null
          condizioni_economiche: string | null
          contratto_ref: string | null
          created_at: string
          created_by: string | null
          descrizione_rifiuto: string | null
          destinatario_id: string | null
          fattura_id: string | null
          fatturata: boolean
          fir_form_id: string | null
          fir_id: string | null
          id: string
          importo_provvigione: number | null
          intermediario_id: string
          note: string | null
          produttore_id: string | null
          quantita_effettiva_kg: number | null
          quantita_stimata_kg: number | null
          stato: string
          tenant_id: string | null
          tipo_provvigione: string
          trasportatore_id: string | null
          updated_at: string
          valore_provvigione: number
        }
        Insert: {
          cer?: string | null
          condizioni_economiche?: string | null
          contratto_ref?: string | null
          created_at?: string
          created_by?: string | null
          descrizione_rifiuto?: string | null
          destinatario_id?: string | null
          fattura_id?: string | null
          fatturata?: boolean
          fir_form_id?: string | null
          fir_id?: string | null
          id?: string
          importo_provvigione?: number | null
          intermediario_id: string
          note?: string | null
          produttore_id?: string | null
          quantita_effettiva_kg?: number | null
          quantita_stimata_kg?: number | null
          stato?: string
          tenant_id?: string | null
          tipo_provvigione?: string
          trasportatore_id?: string | null
          updated_at?: string
          valore_provvigione?: number
        }
        Update: {
          cer?: string | null
          condizioni_economiche?: string | null
          contratto_ref?: string | null
          created_at?: string
          created_by?: string | null
          descrizione_rifiuto?: string | null
          destinatario_id?: string | null
          fattura_id?: string | null
          fatturata?: boolean
          fir_form_id?: string | null
          fir_id?: string | null
          id?: string
          importo_provvigione?: number | null
          intermediario_id?: string
          note?: string | null
          produttore_id?: string | null
          quantita_effettiva_kg?: number | null
          quantita_stimata_kg?: number | null
          stato?: string
          tenant_id?: string | null
          tipo_provvigione?: string
          trasportatore_id?: string | null
          updated_at?: string
          valore_provvigione?: number
        }
        Relationships: [
          {
            foreignKeyName: "intermediazioni_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediazioni_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "erp_fatture_vendita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediazioni_fir_form_id_fkey"
            columns: ["fir_form_id"]
            isOneToOne: false
            referencedRelation: "fir_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediazioni_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "fir"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediazioni_intermediario_id_fkey"
            columns: ["intermediario_id"]
            isOneToOne: false
            referencedRelation: "intermediari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediazioni_produttore_id_fkey"
            columns: ["produttore_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediazioni_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediazioni_trasportatore_id_fkey"
            columns: ["trasportatore_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      limiti_privati: {
        Row: {
          cer: string
          created_at: string
          id: string
          impianto_id: string | null
          limite_annuo_kg: number | null
          limite_conferimento_kg: number | null
          limite_giornaliero_kg: number | null
          limite_mensile_kg: number | null
          note: string | null
          periodo_riferimento: string
          tenant_id: string | null
          tipo_utenza: string
          updated_at: string
        }
        Insert: {
          cer: string
          created_at?: string
          id?: string
          impianto_id?: string | null
          limite_annuo_kg?: number | null
          limite_conferimento_kg?: number | null
          limite_giornaliero_kg?: number | null
          limite_mensile_kg?: number | null
          note?: string | null
          periodo_riferimento?: string
          tenant_id?: string | null
          tipo_utenza?: string
          updated_at?: string
        }
        Update: {
          cer?: string
          created_at?: string
          id?: string
          impianto_id?: string | null
          limite_annuo_kg?: number | null
          limite_conferimento_kg?: number | null
          limite_giornaliero_kg?: number | null
          limite_mensile_kg?: number | null
          note?: string | null
          periodo_riferimento?: string
          tenant_id?: string | null
          tipo_utenza?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "limiti_privati_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limiti_privati_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      listini_intermediazione: {
        Row: {
          attivo: boolean
          cer: string | null
          created_at: string
          descrizione: string | null
          fee_minimo: number | null
          id: string
          intermediario_id: string
          produttore_id: string | null
          tenant_id: string | null
          tipo_provvigione: string
          updated_at: string
          valido_al: string | null
          valido_dal: string | null
          valore_provvigione: number
        }
        Insert: {
          attivo?: boolean
          cer?: string | null
          created_at?: string
          descrizione?: string | null
          fee_minimo?: number | null
          id?: string
          intermediario_id: string
          produttore_id?: string | null
          tenant_id?: string | null
          tipo_provvigione?: string
          updated_at?: string
          valido_al?: string | null
          valido_dal?: string | null
          valore_provvigione?: number
        }
        Update: {
          attivo?: boolean
          cer?: string | null
          created_at?: string
          descrizione?: string | null
          fee_minimo?: number | null
          id?: string
          intermediario_id?: string
          produttore_id?: string | null
          tenant_id?: string | null
          tipo_provvigione?: string
          updated_at?: string
          valido_al?: string | null
          valido_dal?: string | null
          valore_provvigione?: number
        }
        Relationships: [
          {
            foreignKeyName: "listini_intermediazione_intermediario_id_fkey"
            columns: ["intermediario_id"]
            isOneToOne: false
            referencedRelation: "intermediari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listini_intermediazione_produttore_id_fkey"
            columns: ["produttore_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listini_intermediazione_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      magazzino_deposito: {
        Row: {
          cer: string
          created_at: string
          data_in: string | null
          data_out: string | null
          id: string
          impianto_id: string
          kg_in: number
          kg_out: number
          limite_m3: number | null
          note: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cer: string
          created_at?: string
          data_in?: string | null
          data_out?: string | null
          id?: string
          impianto_id: string
          kg_in?: number
          kg_out?: number
          limite_m3?: number | null
          note?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cer?: string
          created_at?: string
          data_in?: string | null
          data_out?: string | null
          id?: string
          impianto_id?: string
          kg_in?: number
          kg_out?: number
          limite_m3?: number | null
          note?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "magazzino_deposito_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magazzino_deposito_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["membership_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          deleted_by_receiver: boolean
          deleted_by_sender: boolean
          id: string
          is_read: boolean
          read_at: string | null
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_by_receiver?: boolean
          deleted_by_sender?: boolean
          id?: string
          is_read?: boolean
          read_at?: string | null
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_by_receiver?: boolean
          deleted_by_sender?: boolean
          id?: string
          is_read?: boolean
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimenti_impianto: {
        Row: {
          cer: string
          created_at: string
          created_by: string | null
          data_movimento: string
          descrizione_rifiuto: string | null
          destinatario_denominazione: string | null
          esito_accettazione: string | null
          fir_id: string | null
          id: string
          impianto_id: string
          note: string | null
          numero_fir: string | null
          origine: string | null
          produttore_denominazione: string | null
          quantita_kg: number
          quantita_presunta: number | null
          ruolo_impianto: string
          tenant_id: string | null
          tipo_movimento: string
          trasportatore_denominazione: string | null
          updated_at: string
        }
        Insert: {
          cer: string
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descrizione_rifiuto?: string | null
          destinatario_denominazione?: string | null
          esito_accettazione?: string | null
          fir_id?: string | null
          id?: string
          impianto_id: string
          note?: string | null
          numero_fir?: string | null
          origine?: string | null
          produttore_denominazione?: string | null
          quantita_kg?: number
          quantita_presunta?: number | null
          ruolo_impianto: string
          tenant_id?: string | null
          tipo_movimento: string
          trasportatore_denominazione?: string | null
          updated_at?: string
        }
        Update: {
          cer?: string
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descrizione_rifiuto?: string | null
          destinatario_denominazione?: string | null
          esito_accettazione?: string | null
          fir_id?: string | null
          id?: string
          impianto_id?: string
          note?: string | null
          numero_fir?: string | null
          origine?: string | null
          produttore_denominazione?: string | null
          quantita_kg?: number
          quantita_presunta?: number | null
          ruolo_impianto?: string
          tenant_id?: string | null
          tipo_movimento?: string
          trasportatore_denominazione?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_impianto_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "fir_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_impianto_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_impianto_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      movimenti_intermediario: {
        Row: {
          cer: string
          created_at: string
          created_by: string | null
          data_movimento: string
          descrizione_rifiuto: string | null
          destinatario_denominazione: string | null
          destinatario_id: string | null
          fir_form_id: string | null
          fir_id: string | null
          id: string
          intermediario_id: string
          intermediazione_id: string | null
          note: string | null
          numero_fir: string | null
          produttore_denominazione: string | null
          produttore_id: string | null
          quantita_kg: number
          tenant_id: string | null
          tipo_movimento: string
          updated_at: string
        }
        Insert: {
          cer: string
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descrizione_rifiuto?: string | null
          destinatario_denominazione?: string | null
          destinatario_id?: string | null
          fir_form_id?: string | null
          fir_id?: string | null
          id?: string
          intermediario_id: string
          intermediazione_id?: string | null
          note?: string | null
          numero_fir?: string | null
          produttore_denominazione?: string | null
          produttore_id?: string | null
          quantita_kg?: number
          tenant_id?: string | null
          tipo_movimento?: string
          updated_at?: string
        }
        Update: {
          cer?: string
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descrizione_rifiuto?: string | null
          destinatario_denominazione?: string | null
          destinatario_id?: string | null
          fir_form_id?: string | null
          fir_id?: string | null
          id?: string
          intermediario_id?: string
          intermediazione_id?: string | null
          note?: string | null
          numero_fir?: string | null
          produttore_denominazione?: string | null
          produttore_id?: string | null
          quantita_kg?: number
          tenant_id?: string | null
          tipo_movimento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_intermediario_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_intermediario_fir_form_id_fkey"
            columns: ["fir_form_id"]
            isOneToOne: false
            referencedRelation: "fir_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_intermediario_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "fir"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_intermediario_intermediario_id_fkey"
            columns: ["intermediario_id"]
            isOneToOne: false
            referencedRelation: "intermediari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_intermediario_intermediazione_id_fkey"
            columns: ["intermediazione_id"]
            isOneToOne: false
            referencedRelation: "intermediazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_intermediario_produttore_id_fkey"
            columns: ["produttore_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_intermediario_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      office_calls: {
        Row: {
          agent_id: string | null
          call_successful: boolean | null
          call_summary: string | null
          created_at: string | null
          direction: string | null
          disconnection_reason: string | null
          duration_ms: number | null
          end_timestamp: number | null
          fir_id: string | null
          from_number: string | null
          id: string
          metadata: Json | null
          recording_url: string | null
          retell_call_id: string
          start_timestamp: number | null
          status: string | null
          tenant_id: string | null
          to_number: string | null
          transcript: string | null
          updated_at: string | null
          user_id: string
          user_sentiment: string | null
        }
        Insert: {
          agent_id?: string | null
          call_successful?: boolean | null
          call_summary?: string | null
          created_at?: string | null
          direction?: string | null
          disconnection_reason?: string | null
          duration_ms?: number | null
          end_timestamp?: number | null
          fir_id?: string | null
          from_number?: string | null
          id?: string
          metadata?: Json | null
          recording_url?: string | null
          retell_call_id: string
          start_timestamp?: number | null
          status?: string | null
          tenant_id?: string | null
          to_number?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id: string
          user_sentiment?: string | null
        }
        Update: {
          agent_id?: string | null
          call_successful?: boolean | null
          call_summary?: string | null
          created_at?: string | null
          direction?: string | null
          disconnection_reason?: string | null
          duration_ms?: number | null
          end_timestamp?: number | null
          fir_id?: string | null
          from_number?: string | null
          id?: string
          metadata?: Json | null
          recording_url?: string | null
          retell_call_id?: string
          start_timestamp?: number | null
          status?: string | null
          tenant_id?: string | null
          to_number?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
          user_sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_calls_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "fir_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      online_status: {
        Row: {
          receive_calls: boolean
          status: Database["public"]["Enums"]["presence_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          receive_calls?: boolean
          status?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          receive_calls?: boolean
          status?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          cap: string | null
          codice_fiscale: string | null
          comune: string | null
          created_at: string
          created_by: string | null
          id: string
          indirizzo: string | null
          iscrizione_albo: string | null
          name: string
          numero_autorizzazione: string | null
          piva: string
          provincia: string | null
          role_rentri: Database["public"]["Enums"]["org_role_rentri"][]
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cap?: string | null
          codice_fiscale?: string | null
          comune?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          indirizzo?: string | null
          iscrizione_albo?: string | null
          name: string
          numero_autorizzazione?: string | null
          piva: string
          provincia?: string | null
          role_rentri?: Database["public"]["Enums"]["org_role_rentri"][]
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cap?: string | null
          codice_fiscale?: string | null
          comune?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          indirizzo?: string | null
          iscrizione_albo?: string | null
          name?: string
          numero_autorizzazione?: string | null
          piva?: string
          provincia?: string | null
          role_rentri?: Database["public"]["Enums"]["org_role_rentri"][]
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamenti_privati: {
        Row: {
          conferimento_id: string
          created_at: string
          data_scad: string | null
          id: string
          importo: number
          note: string | null
          stato: string
          tenant_id: string | null
          updated_at: string
          xml_fattura_sdi: string | null
        }
        Insert: {
          conferimento_id: string
          created_at?: string
          data_scad?: string | null
          id?: string
          importo: number
          note?: string | null
          stato?: string
          tenant_id?: string | null
          updated_at?: string
          xml_fattura_sdi?: string | null
        }
        Update: {
          conferimento_id?: string
          created_at?: string
          data_scad?: string | null
          id?: string
          importo?: number
          note?: string | null
          stato?: string
          tenant_id?: string | null
          updated_at?: string
          xml_fattura_sdi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamenti_privati_conferimento_id_fkey"
            columns: ["conferimento_id"]
            isOneToOne: false
            referencedRelation: "privati_conferimenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_privati_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      privati_conferimenti: {
        Row: {
          cer: string
          cf_pi: string | null
          codice_ce: string | null
          created_at: string
          data: string
          esito_pesata: string | null
          id: string
          impianto_id: string
          importo_pagato: number | null
          kg_pesati: number
          metodo_pag: string | null
          modello_automezzo: string | null
          nome_privato: string
          note: string | null
          numero_fir: string | null
          privato_id: string | null
          quantita_presunta: number | null
          stato_rifiuto: string | null
          targa_automezzo: string | null
          tenant_id: string | null
          tipo_utenza: string | null
          updated_at: string
        }
        Insert: {
          cer: string
          cf_pi?: string | null
          codice_ce?: string | null
          created_at?: string
          data?: string
          esito_pesata?: string | null
          id?: string
          impianto_id: string
          importo_pagato?: number | null
          kg_pesati: number
          metodo_pag?: string | null
          modello_automezzo?: string | null
          nome_privato: string
          note?: string | null
          numero_fir?: string | null
          privato_id?: string | null
          quantita_presunta?: number | null
          stato_rifiuto?: string | null
          targa_automezzo?: string | null
          tenant_id?: string | null
          tipo_utenza?: string | null
          updated_at?: string
        }
        Update: {
          cer?: string
          cf_pi?: string | null
          codice_ce?: string | null
          created_at?: string
          data?: string
          esito_pesata?: string | null
          id?: string
          impianto_id?: string
          importo_pagato?: number | null
          kg_pesati?: number
          metodo_pag?: string | null
          modello_automezzo?: string | null
          nome_privato?: string
          note?: string | null
          numero_fir?: string | null
          privato_id?: string | null
          quantita_presunta?: number | null
          stato_rifiuto?: string | null
          targa_automezzo?: string | null
          tenant_id?: string | null
          tipo_utenza?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privati_conferimenti_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privati_conferimenti_privato_id_fkey"
            columns: ["privato_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_privati"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privati_conferimenti_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_video: boolean
          autista_alternativo: string | null
          avatar_url: string | null
          codice_fiscale: string
          cognome: string
          created_at: string | null
          id: string
          mn_context: string | null
          nome: string
          targa_automezzo: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_video?: boolean
          autista_alternativo?: string | null
          avatar_url?: string | null
          codice_fiscale: string
          cognome: string
          created_at?: string | null
          id?: string
          mn_context?: string | null
          nome: string
          targa_automezzo?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_video?: boolean
          autista_alternativo?: string | null
          avatar_url?: string | null
          codice_fiscale?: string
          cognome?: string
          created_at?: string | null
          id?: string
          mn_context?: string | null
          nome?: string
          targa_automezzo?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      register_movements: {
        Row: {
          cer: string
          created_at: string
          created_by: string | null
          data_movimento: string
          descrizione_rifiuto: string | null
          fir_id: string | null
          id: string
          impianto_id: string | null
          note: string | null
          organization_id: string
          quantita_kg: number
          stato_invio: Database["public"]["Enums"]["register_send_status"]
          tipo: Database["public"]["Enums"]["register_movement_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cer: string
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descrizione_rifiuto?: string | null
          fir_id?: string | null
          id?: string
          impianto_id?: string | null
          note?: string | null
          organization_id: string
          quantita_kg: number
          stato_invio?: Database["public"]["Enums"]["register_send_status"]
          tipo: Database["public"]["Enums"]["register_movement_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cer?: string
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descrizione_rifiuto?: string | null
          fir_id?: string | null
          id?: string
          impianto_id?: string | null
          note?: string | null
          organization_id?: string
          quantita_kg?: number
          stato_invio?: Database["public"]["Enums"]["register_send_status"]
          tipo?: Database["public"]["Enums"]["register_movement_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "register_movements_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "fir"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "register_movements_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "register_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_kg_privati: {
        Row: {
          cer: string
          created_at: string
          giacenza_iniz: number
          id: string
          impianto_id: string
          kg_totali_cer: number
          mese: string
          movimenti: Json | null
          privato_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cer: string
          created_at?: string
          giacenza_iniz?: number
          id?: string
          impianto_id: string
          kg_totali_cer?: number
          mese: string
          movimenti?: Json | null
          privato_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cer?: string
          created_at?: string
          giacenza_iniz?: number
          id?: string
          impianto_id?: string
          kg_totali_cer?: number
          mese?: string
          movimenti?: Json | null
          privato_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_kg_privati_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_kg_privati_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ricevute_privati: {
        Row: {
          anno: number
          conferimento_id: string | null
          created_at: string
          data_emissione: string
          id: string
          impianto_id: string | null
          importo: number | null
          note: string | null
          numero_ricevuta: string
          pdf_path: string | null
          privato_id: string | null
          qr_code_data: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          anno?: number
          conferimento_id?: string | null
          created_at?: string
          data_emissione?: string
          id?: string
          impianto_id?: string | null
          importo?: number | null
          note?: string | null
          numero_ricevuta: string
          pdf_path?: string | null
          privato_id?: string | null
          qr_code_data?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          anno?: number
          conferimento_id?: string | null
          created_at?: string
          data_emissione?: string
          id?: string
          impianto_id?: string | null
          importo?: number | null
          note?: string | null
          numero_ricevuta?: string
          pdf_path?: string | null
          privato_id?: string | null
          qr_code_data?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ricevute_privati_conferimento_id_fkey"
            columns: ["conferimento_id"]
            isOneToOne: false
            referencedRelation: "privati_conferimenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ricevute_privati_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ricevute_privati_privato_id_fkey"
            columns: ["privato_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_privati"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ricevute_privati_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_contatti: {
        Row: {
          anagrafica_id: string | null
          cellulare: string | null
          codice_fiscale: string | null
          cognome: string | null
          comune: string | null
          created_at: string
          email: string | null
          id: string
          indirizzo: string | null
          nome: string
          note: string | null
          origine: string
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          ragione_sociale: string | null
          telefono: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          anagrafica_id?: string | null
          cellulare?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          comune?: string | null
          created_at?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          note?: string | null
          origine?: string
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          telefono?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          anagrafica_id?: string | null
          cellulare?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          comune?: string | null
          created_at?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          note?: string | null
          origine?: string
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          telefono?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrica_contatti_anagrafica_id_fkey"
            columns: ["anagrafica_id"]
            isOneToOne: false
            referencedRelation: "erp_anagrafiche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubrica_contatti_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          candidate: Json | null
          created_at: string
          from_id: string | null
          id: string
          room_id: string
          sdp: Json | null
          to_ids: string[] | null
          type: string
        }
        Insert: {
          candidate?: Json | null
          created_at?: string
          from_id?: string | null
          id?: string
          room_id: string
          sdp?: Json | null
          to_ids?: string[] | null
          type: string
        }
        Update: {
          candidate?: Json | null
          created_at?: string
          from_id?: string | null
          id?: string
          room_id?: string
          sdp?: Json | null
          to_ids?: string[] | null
          type?: string
        }
        Relationships: []
      }
      storico_ricevute_privati: {
        Row: {
          cap: string | null
          citta: string | null
          codice_cliente: string | null
          codice_fiscale: string | null
          created_at: string
          data_doc: string
          descrizione_pagamento: string | null
          id: string
          imponibile: number | null
          indirizzo: string | null
          metodo_pagamento: string | null
          numero_doc: string
          peso_lordo: number | null
          peso_netto: number | null
          provincia: string | null
          quantita_fatturabile: number | null
          quantita_kg: number | null
          ragione_sociale: string
          stato_ddt: string | null
          tenant_id: string | null
          tipo_doc: string | null
          totale_doc: number | null
        }
        Insert: {
          cap?: string | null
          citta?: string | null
          codice_cliente?: string | null
          codice_fiscale?: string | null
          created_at?: string
          data_doc: string
          descrizione_pagamento?: string | null
          id?: string
          imponibile?: number | null
          indirizzo?: string | null
          metodo_pagamento?: string | null
          numero_doc: string
          peso_lordo?: number | null
          peso_netto?: number | null
          provincia?: string | null
          quantita_fatturabile?: number | null
          quantita_kg?: number | null
          ragione_sociale: string
          stato_ddt?: string | null
          tenant_id?: string | null
          tipo_doc?: string | null
          totale_doc?: number | null
        }
        Update: {
          cap?: string | null
          citta?: string | null
          codice_cliente?: string | null
          codice_fiscale?: string | null
          created_at?: string
          data_doc?: string
          descrizione_pagamento?: string | null
          id?: string
          imponibile?: number | null
          indirizzo?: string | null
          metodo_pagamento?: string | null
          numero_doc?: string
          peso_lordo?: number | null
          peso_netto?: number | null
          provincia?: string | null
          quantita_fatturabile?: number | null
          quantita_kg?: number | null
          ragione_sociale?: string
          stato_ddt?: string | null
          tenant_id?: string | null
          tipo_doc?: string | null
          totale_doc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storico_ricevute_privati_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_fir_numbers: {
        Args: {
          p_assigned_by?: string
          p_count: number
          p_target_user_id: string
        }
        Returns: number
      }
      auto_assign_after_consume: {
        Args: { p_user_id: string }
        Returns: string
      }
      auto_distribute_fir_numbers: { Args: never; Returns: number }
      bootstrap_admin_role: { Args: never; Returns: undefined }
      consume_fir_number: { Args: { p_fir_id: string }; Returns: undefined }
      exec_sql_readonly: { Args: { query: string }; Returns: Json }
      exec_sql_write: { Args: { query: string }; Returns: Json }
      generate_fir_numbers_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_admin_user_id: { Args: never; Returns: string }
      get_online_admins: {
        Args: never
        Returns: {
          email: string
          receive_calls: boolean
          user_id: string
        }[]
      }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_prima_nota_number: {
        Args: { p_anno: number; p_tenant_id: string }
        Returns: number
      }
      next_ricevuta_number: {
        Args: { p_anno: number; p_impianto_id: string }
        Returns: string
      }
      reassign_fir_number: {
        Args: {
          p_assigned_by?: string
          p_fir_number_id: string
          p_new_user_id: string
        }
        Returns: boolean
      }
      release_fir_number: { Args: { p_fir_id: string }; Returns: undefined }
      reserve_fir_number: {
        Args: { p_fir_id: string; p_fir_number: string }
        Returns: boolean
      }
      toggle_fir_suspension: {
        Args: { p_fir_number_id: string; p_suspend: boolean }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      call_status: "ringing" | "answered" | "ended" | "missed" | "ai_fallback"
      call_type: "audio" | "video"
      fir_stato:
        | "DRAFT"
        | "READY_TO_SEND"
        | "ACTIVE"
        | "IN_TRANSIT"
        | "DELIVERED_PENDING_ACCEPTANCE"
        | "CLOSED"
        | "SENT_TO_RENTRI_DATA"
      membership_role: "owner" | "admin" | "operator" | "viewer"
      org_role_rentri:
        | "produttore"
        | "trasportatore"
        | "destinatario"
        | "intermediario"
      presence_status: "online" | "offline" | "busy" | "away"
      register_movement_type: "CARICO" | "SCARICO"
      register_send_status: "PENDING" | "SENT"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      call_status: ["ringing", "answered", "ended", "missed", "ai_fallback"],
      call_type: ["audio", "video"],
      fir_stato: [
        "DRAFT",
        "READY_TO_SEND",
        "ACTIVE",
        "IN_TRANSIT",
        "DELIVERED_PENDING_ACCEPTANCE",
        "CLOSED",
        "SENT_TO_RENTRI_DATA",
      ],
      membership_role: ["owner", "admin", "operator", "viewer"],
      org_role_rentri: [
        "produttore",
        "trasportatore",
        "destinatario",
        "intermediario",
      ],
      presence_status: ["online", "offline", "busy", "away"],
      register_movement_type: ["CARICO", "SCARICO"],
      register_send_status: ["PENDING", "SENT"],
    },
  },
} as const
