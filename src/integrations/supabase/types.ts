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
      _stress_log: {
        Row: {
          at: string | null
          id: number
          step: string | null
          val: string | null
        }
        Insert: {
          at?: string | null
          id?: number
          step?: string | null
          val?: string | null
        }
        Update: {
          at?: string | null
          id?: number
          step?: string | null
          val?: string | null
        }
        Relationships: []
      }
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
      ai_user_memory: {
        Row: {
          category: string | null
          created_at: string
          environment: string | null
          fact_key: string
          fact_value: string
          id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          environment?: string | null
          fact_key: string
          fact_value: string
          id?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          environment?: string | null
          fact_key?: string
          fact_value?: string
          id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anagrafica_aziende_mp: {
        Row: {
          alias: string | null
          attivo: boolean | null
          cap: string | null
          cellulare: string | null
          citta: string | null
          cliente: boolean | null
          cliente_fatturazione: string | null
          cod_cliente: string | null
          cod_tipologia: string | null
          codice: string | null
          codice_cat_eco: string | null
          codice_cdc: string | null
          codice_destinatario: string | null
          codice_fiscale: string | null
          created_at: string
          destinatario: boolean | null
          email: string | null
          fax: string | null
          fornitore: boolean | null
          id: string
          indirizzo: string | null
          intermediario: boolean | null
          latitudine: string | null
          longitudine: string | null
          nazione: string | null
          note: string | null
          p_sl: boolean | null
          p_ul: boolean | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          ragione_sociale: string
          stato: string | null
          stato_amm: string | null
          telefono: string | null
          tenant_id: string | null
          tipologia: string | null
          trasportatore: boolean | null
          updated_at: string
          urbano: boolean | null
          zona_gruppo_cliente: string | null
        }
        Insert: {
          alias?: string | null
          attivo?: boolean | null
          cap?: string | null
          cellulare?: string | null
          citta?: string | null
          cliente?: boolean | null
          cliente_fatturazione?: string | null
          cod_cliente?: string | null
          cod_tipologia?: string | null
          codice?: string | null
          codice_cat_eco?: string | null
          codice_cdc?: string | null
          codice_destinatario?: string | null
          codice_fiscale?: string | null
          created_at?: string
          destinatario?: boolean | null
          email?: string | null
          fax?: string | null
          fornitore?: boolean | null
          id?: string
          indirizzo?: string | null
          intermediario?: boolean | null
          latitudine?: string | null
          longitudine?: string | null
          nazione?: string | null
          note?: string | null
          p_sl?: boolean | null
          p_ul?: boolean | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale: string
          stato?: string | null
          stato_amm?: string | null
          telefono?: string | null
          tenant_id?: string | null
          tipologia?: string | null
          trasportatore?: boolean | null
          updated_at?: string
          urbano?: boolean | null
          zona_gruppo_cliente?: string | null
        }
        Update: {
          alias?: string | null
          attivo?: boolean | null
          cap?: string | null
          cellulare?: string | null
          citta?: string | null
          cliente?: boolean | null
          cliente_fatturazione?: string | null
          cod_cliente?: string | null
          cod_tipologia?: string | null
          codice?: string | null
          codice_cat_eco?: string | null
          codice_cdc?: string | null
          codice_destinatario?: string | null
          codice_fiscale?: string | null
          created_at?: string
          destinatario?: boolean | null
          email?: string | null
          fax?: string | null
          fornitore?: boolean | null
          id?: string
          indirizzo?: string | null
          intermediario?: boolean | null
          latitudine?: string | null
          longitudine?: string | null
          nazione?: string | null
          note?: string | null
          p_sl?: boolean | null
          p_ul?: boolean | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string
          stato?: string | null
          stato_amm?: string | null
          telefono?: string | null
          tenant_id?: string | null
          tipologia?: string | null
          trasportatore?: boolean | null
          updated_at?: string
          urbano?: boolean | null
          zona_gruppo_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anagrafica_aziende_mp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          modello_automezzo: string | null
          nazione: string | null
          nome: string
          note: string | null
          numero_documento: string | null
          numero_tessera: string | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          scadenza_documento: string | null
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
          modello_automezzo?: string | null
          nazione?: string | null
          nome: string
          note?: string | null
          numero_documento?: string | null
          numero_tessera?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          scadenza_documento?: string | null
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
          modello_automezzo?: string | null
          nazione?: string | null
          nome?: string
          note?: string | null
          numero_documento?: string | null
          numero_tessera?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          scadenza_documento?: string | null
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
      app_reset_flags: {
        Row: {
          note: string | null
          reset_token: string
          scope: string
          updated_at: string
        }
        Insert: {
          note?: string | null
          reset_token: string
          scope: string
          updated_at?: string
        }
        Update: {
          note?: string | null
          reset_token?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      appuntamenti_personale: {
        Row: {
          created_at: string
          id: string
          messaggio_disponibilita: string | null
          nome: string
          risposta_riccardo: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          messaggio_disponibilita?: string | null
          nome: string
          risposta_riccardo?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          messaggio_disponibilita?: string | null
          nome?: string
          risposta_riccardo?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      autorizzazioni_aziendali: {
        Row: {
          azienda: string
          contenuto: string | null
          created_at: string
          created_by: string | null
          data_rilascio: string | null
          data_scadenza: string | null
          ente: string | null
          file_name: string | null
          file_path: string | null
          id: string
          metadata: Json
          numero: string | null
          oggetto: string | null
          tipo: string
          titolo: string
          updated_at: string
        }
        Insert: {
          azienda: string
          contenuto?: string | null
          created_at?: string
          created_by?: string | null
          data_rilascio?: string | null
          data_scadenza?: string | null
          ente?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          numero?: string | null
          oggetto?: string | null
          tipo?: string
          titolo: string
          updated_at?: string
        }
        Update: {
          azienda?: string
          contenuto?: string | null
          created_at?: string
          created_by?: string | null
          data_rilascio?: string | null
          data_scadenza?: string | null
          ente?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          numero?: string | null
          oggetto?: string | null
          tipo?: string
          titolo?: string
          updated_at?: string
        }
        Relationships: []
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
      cernita_output: {
        Row: {
          cer_output: string
          cernita_id: string
          created_at: string | null
          descrizione_output: string | null
          id: string
          quantita: number
          tipo_output: string | null
        }
        Insert: {
          cer_output: string
          cernita_id: string
          created_at?: string | null
          descrizione_output?: string | null
          id?: string
          quantita: number
          tipo_output?: string | null
        }
        Update: {
          cer_output?: string
          cernita_id?: string
          created_at?: string | null
          descrizione_output?: string | null
          id?: string
          quantita?: number
          tipo_output?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cernita_output_cernita_id_fkey"
            columns: ["cernita_id"]
            isOneToOne: false
            referencedRelation: "cernite"
            referencedColumns: ["id"]
          },
        ]
      }
      cernite: {
        Row: {
          cer_input: string
          created_at: string | null
          created_by: string | null
          descrizione_input: string | null
          id: string
          impianto_id: string | null
          note: string | null
          quantita_input: number
          stato: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          cer_input: string
          created_at?: string | null
          created_by?: string | null
          descrizione_input?: string | null
          id?: string
          impianto_id?: string | null
          note?: string | null
          quantita_input: number
          stato?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cer_input?: string
          created_at?: string | null
          created_by?: string | null
          descrizione_input?: string | null
          id?: string
          impianto_id?: string | null
          note?: string | null
          quantita_input?: number
          stato?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cernite_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cernite_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_autorizzazioni: {
        Row: {
          cliente_id: string
          created_at: string
          data_inizio: string | null
          data_scadenza: string | null
          documento_url: string | null
          ente_rilascio: string | null
          id: string
          note: string | null
          numero_autorizzazione: string
          tenant_id: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_inizio?: string | null
          data_scadenza?: string | null
          documento_url?: string | null
          ente_rilascio?: string | null
          id?: string
          note?: string | null
          numero_autorizzazione: string
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_inizio?: string | null
          data_scadenza?: string | null
          documento_url?: string | null
          ente_rilascio?: string | null
          id?: string
          note?: string | null
          numero_autorizzazione?: string
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_autorizzazioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_autorizzazioni_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_cantieri: {
        Row: {
          attivo: boolean
          cliente_id: string
          comune: string | null
          created_at: string
          denominazione: string
          id: string
          indirizzo: string | null
          note: string | null
          provincia: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cliente_id: string
          comune?: string | null
          created_at?: string
          denominazione: string
          id?: string
          indirizzo?: string | null
          note?: string | null
          provincia?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cliente_id?: string
          comune?: string | null
          created_at?: string
          denominazione?: string
          id?: string
          indirizzo?: string | null
          note?: string | null
          provincia?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_cantieri_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_cantieri_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_conducenti: {
        Row: {
          cliente_id: string | null
          cognome: string | null
          created_at: string
          id: string
          nome: string | null
          note: string | null
          tenant_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          cognome?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          note?: string | null
          tenant_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          cognome?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          note?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_conducenti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_documenti: {
        Row: {
          cliente_id: string
          created_at: string
          data_documento: string | null
          data_scadenza: string | null
          descrizione: string | null
          file_url: string
          id: string
          mime_type: string | null
          storage_path: string | null
          tenant_id: string | null
          tipo: string
          uploaded_by: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_documento?: string | null
          data_scadenza?: string | null
          descrizione?: string | null
          file_url: string
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          tenant_id?: string | null
          tipo: string
          uploaded_by?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_documento?: string | null
          data_scadenza?: string | null
          descrizione?: string | null
          file_url?: string
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          tenant_id?: string | null
          tipo?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_documenti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_documenti_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_partner_default: {
        Row: {
          cap: string | null
          citta: string | null
          cliente_id: string | null
          created_at: string
          id: string
          indirizzo: string | null
          provincia: string | null
          ragione_sociale: string | null
          ruolo: string
          tenant_id: string | null
        }
        Insert: {
          cap?: string | null
          citta?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          indirizzo?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          ruolo: string
          tenant_id?: string | null
        }
        Update: {
          cap?: string | null
          citta?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          indirizzo?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          ruolo?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_partner_default_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_targhe: {
        Row: {
          cliente_id: string
          conducente_default: string | null
          created_at: string
          id: string
          note: string | null
          targa: string
          tenant_id: string | null
          tipo_mezzo: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          conducente_default?: string | null
          created_at?: string
          id?: string
          note?: string | null
          targa: string
          tenant_id?: string | null
          tipo_mezzo?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          conducente_default?: string | null
          created_at?: string
          id?: string
          note?: string | null
          targa?: string
          tenant_id?: string | null
          tipo_mezzo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_targhe_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_targhe_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_unita_locali: {
        Row: {
          cap: string | null
          cliente_id: string
          comune: string | null
          created_at: string
          denominazione: string
          id: string
          indirizzo: string | null
          note: string | null
          provincia: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cap?: string | null
          cliente_id: string
          comune?: string | null
          created_at?: string
          denominazione: string
          id?: string
          indirizzo?: string | null
          note?: string | null
          provincia?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cap?: string | null
          cliente_id?: string
          comune?: string | null
          created_at?: string
          denominazione?: string
          id?: string
          indirizzo?: string | null
          note?: string | null
          provincia?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_unita_locali_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_unita_locali_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      ddt_forms: {
        Row: {
          anno: number
          causale_trasporto: string
          cliente_destinatario: string
          conducente: string | null
          created_at: string
          created_by: string | null
          data: string
          descrizione_bene: string
          id: string
          indirizzo_destinazione: string | null
          note: string | null
          numero_ddt: string
          quantita: string | null
          targa_mezzo: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          anno?: number
          causale_trasporto?: string
          cliente_destinatario: string
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione_bene: string
          id?: string
          indirizzo_destinazione?: string | null
          note?: string | null
          numero_ddt: string
          quantita?: string | null
          targa_mezzo?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          anno?: number
          causale_trasporto?: string
          cliente_destinatario?: string
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione_bene?: string
          id?: string
          indirizzo_destinazione?: string | null
          note?: string | null
          numero_ddt?: string
          quantita?: string | null
          targa_mezzo?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ddt_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documenti_privati: {
        Row: {
          anagrafica_id: string
          created_at: string
          created_by: string | null
          id: string
          nome_file: string
          note: string | null
          storage_path: string
          tenant_id: string | null
          tipo_documento: string
        }
        Insert: {
          anagrafica_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_file: string
          note?: string | null
          storage_path: string
          tenant_id?: string | null
          tipo_documento?: string
        }
        Update: {
          anagrafica_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_file?: string
          note?: string | null
          storage_path?: string
          tenant_id?: string | null
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documenti_privati_anagrafica_id_fkey"
            columns: ["anagrafica_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_privati"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documenti_privati_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_audit_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["dragon_audit_action"]
          after_state: Json | null
          before_state: Json | null
          entity_id: string
          entity_type: string
          id: string
          performed_at: string
          performed_by: string | null
          reason: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["dragon_audit_action"]
          after_state?: Json | null
          before_state?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          performed_at?: string
          performed_by?: string | null
          reason?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["dragon_audit_action"]
          after_state?: Json | null
          before_state?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          performed_at?: string
          performed_by?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      dragon_causes: {
        Row: {
          active: boolean
          code: string
          config: Json | null
          created_at: string
          default_document_type:
            | Database["public"]["Enums"]["dragon_document_type"]
            | null
          direction: Database["public"]["Enums"]["dragon_cause_direction"]
          generates_stock_movement: boolean
          id: string
          name: string
          requires_fir: boolean
          requires_site: boolean
          requires_source_movement: boolean
          scope: Database["public"]["Enums"]["dragon_cause_scope"]
          stock_sign: Database["public"]["Enums"]["dragon_stock_sign"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          config?: Json | null
          created_at?: string
          default_document_type?:
            | Database["public"]["Enums"]["dragon_document_type"]
            | null
          direction?: Database["public"]["Enums"]["dragon_cause_direction"]
          generates_stock_movement?: boolean
          id?: string
          name: string
          requires_fir?: boolean
          requires_site?: boolean
          requires_source_movement?: boolean
          scope?: Database["public"]["Enums"]["dragon_cause_scope"]
          stock_sign?: Database["public"]["Enums"]["dragon_stock_sign"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          config?: Json | null
          created_at?: string
          default_document_type?:
            | Database["public"]["Enums"]["dragon_document_type"]
            | null
          direction?: Database["public"]["Enums"]["dragon_cause_direction"]
          generates_stock_movement?: boolean
          id?: string
          name?: string
          requires_fir?: boolean
          requires_site?: boolean
          requires_source_movement?: boolean
          scope?: Database["public"]["Enums"]["dragon_cause_scope"]
          stock_sign?: Database["public"]["Enums"]["dragon_stock_sign"]
          updated_at?: string
        }
        Relationships: []
      }
      dragon_documents: {
        Row: {
          company_id: string
          counterparty_id: string | null
          created_at: string
          document_date: string | null
          document_type: Database["public"]["Enums"]["dragon_document_type"]
          id: string
          metadata: Json | null
          notes: string | null
          number: string | null
          status: string
          test_session: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          counterparty_id?: string | null
          created_at?: string
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["dragon_document_type"]
          id?: string
          metadata?: Json | null
          notes?: string | null
          number?: string | null
          status?: string
          test_session?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          counterparty_id?: string | null
          created_at?: string
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["dragon_document_type"]
          id?: string
          metadata?: Json | null
          notes?: string | null
          number?: string | null
          status?: string
          test_session?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dragon_inventory_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["dragon_adjustment_type"]
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          quantity: number
          reason: string
          related_stock_movement_id: string | null
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["dragon_adjustment_type"]
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          quantity: number
          reason: string
          related_stock_movement_id?: string | null
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["dragon_adjustment_type"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          quantity?: number
          reason?: string
          related_stock_movement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dragon_inventory_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_inventory_adjustments_related_stock_movement_id_fkey"
            columns: ["related_stock_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_stock_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_items: {
        Row: {
          attivo: boolean
          classi_hp: string[] | null
          codice_cer: string
          company_id: string
          created_at: string
          default_warehouse_id: string | null
          descrizione: string
          fattore_conversione: number
          id: string
          item_type: Database["public"]["Enums"]["dragon_item_type"]
          metadata: Json | null
          pericoloso: boolean
          stato_fisico_default: string | null
          test_session: string | null
          tipo_mps_eow: string | null
          tipo_mps_eow_desc: string | null
          unita_misura_default: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          classi_hp?: string[] | null
          codice_cer: string
          company_id: string
          created_at?: string
          default_warehouse_id?: string | null
          descrizione: string
          fattore_conversione?: number
          id?: string
          item_type?: Database["public"]["Enums"]["dragon_item_type"]
          metadata?: Json | null
          pericoloso?: boolean
          stato_fisico_default?: string | null
          test_session?: string | null
          tipo_mps_eow?: string | null
          tipo_mps_eow_desc?: string | null
          unita_misura_default?: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          classi_hp?: string[] | null
          codice_cer?: string
          company_id?: string
          created_at?: string
          default_warehouse_id?: string | null
          descrizione?: string
          fattore_conversione?: number
          id?: string
          item_type?: Database["public"]["Enums"]["dragon_item_type"]
          metadata?: Json | null
          pericoloso?: boolean
          stato_fisico_default?: string | null
          test_session?: string | null
          tipo_mps_eow?: string | null
          tipo_mps_eow_desc?: string | null
          unita_misura_default?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_items_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "dragon_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_lot_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          lot_id: string
          note: string | null
          quantity: number
          sign: Database["public"]["Enums"]["dragon_sign"]
          stock_movement_id: string | null
          transform_batch_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          lot_id: string
          note?: string | null
          quantity: number
          sign: Database["public"]["Enums"]["dragon_sign"]
          stock_movement_id?: string | null
          transform_batch_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          lot_id?: string
          note?: string | null
          quantity?: number
          sign?: Database["public"]["Enums"]["dragon_sign"]
          stock_movement_id?: string | null
          transform_batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dragon_lot_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_lot_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_lot_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "dragon_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_lot_movements_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_lot_movements_transform_batch_id_fkey"
            columns: ["transform_batch_id"]
            isOneToOne: false
            referencedRelation: "dragon_transform_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_lots: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          lot_code: string
          notes: string | null
          origin: string | null
          parent_lot_id: string | null
          production_date: string
          status: string
          test_session: string | null
          updated_at: string
          warehouse_scope: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          lot_code: string
          notes?: string | null
          origin?: string | null
          parent_lot_id?: string | null
          production_date?: string
          status?: string
          test_session?: string | null
          updated_at?: string
          warehouse_scope: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          lot_code?: string
          notes?: string | null
          origin?: string | null
          parent_lot_id?: string | null
          production_date?: string
          status?: string
          test_session?: string | null
          updated_at?: string
          warehouse_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "dragon_lots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_lots_parent_lot_id_fkey"
            columns: ["parent_lot_id"]
            isOneToOne: false
            referencedRelation: "dragon_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_movement_allocations: {
        Row: {
          allocated_quantity: number
          created_at: string
          id: string
          in_movement_id: string
          out_movement_id: string
        }
        Insert: {
          allocated_quantity: number
          created_at?: string
          id?: string
          in_movement_id: string
          out_movement_id: string
        }
        Update: {
          allocated_quantity?: number
          created_at?: string
          id?: string
          in_movement_id?: string
          out_movement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_movement_allocations_in_movement_id_fkey"
            columns: ["in_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_register_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_movement_allocations_out_movement_id_fkey"
            columns: ["out_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_register_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_production_sites: {
        Row: {
          active: boolean
          activity_type: Database["public"]["Enums"]["dragon_site_activity"]
          address: string | null
          company_id: string
          created_at: string
          id: string
          municipality: string | null
          name: string
          notes: string | null
          province: string | null
          site_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          activity_type?: Database["public"]["Enums"]["dragon_site_activity"]
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          municipality?: string | null
          name: string
          notes?: string | null
          province?: string | null
          site_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          activity_type?: Database["public"]["Enums"]["dragon_site_activity"]
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          municipality?: string | null
          name?: string
          notes?: string | null
          province?: string | null
          site_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      dragon_register_movements: {
        Row: {
          annotations: string | null
          cause_id: string
          cer_code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description_snapshot: string | null
          destination_type: string | null
          hp_codes: string[] | null
          id: string
          internal_number: string | null
          item_id: string
          linked_document_id: string | null
          movement_date: string
          movement_number: number
          movement_type: Database["public"]["Enums"]["dragon_movement_type"]
          note: string | null
          operation_code: string | null
          parent_movement_id: string | null
          physical_state: string | null
          quantity: number
          recording_date: string
          register_id: string | null
          sign: Database["public"]["Enums"]["dragon_sign"]
          source_context: Database["public"]["Enums"]["dragon_source_context"]
          source_site_id: string | null
          source_transform_batch_id: string | null
          status: Database["public"]["Enums"]["dragon_movement_status"]
          test_session: string | null
          unit_of_measure: string
          updated_at: string
          updated_by: string | null
          weight_status: Database["public"]["Enums"]["dragon_weight_status"]
        }
        Insert: {
          annotations?: string | null
          cause_id: string
          cer_code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description_snapshot?: string | null
          destination_type?: string | null
          hp_codes?: string[] | null
          id?: string
          internal_number?: string | null
          item_id: string
          linked_document_id?: string | null
          movement_date?: string
          movement_number?: number
          movement_type: Database["public"]["Enums"]["dragon_movement_type"]
          note?: string | null
          operation_code?: string | null
          parent_movement_id?: string | null
          physical_state?: string | null
          quantity?: number
          recording_date?: string
          register_id?: string | null
          sign: Database["public"]["Enums"]["dragon_sign"]
          source_context?: Database["public"]["Enums"]["dragon_source_context"]
          source_site_id?: string | null
          source_transform_batch_id?: string | null
          status?: Database["public"]["Enums"]["dragon_movement_status"]
          test_session?: string | null
          unit_of_measure?: string
          updated_at?: string
          updated_by?: string | null
          weight_status?: Database["public"]["Enums"]["dragon_weight_status"]
        }
        Update: {
          annotations?: string | null
          cause_id?: string
          cer_code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description_snapshot?: string | null
          destination_type?: string | null
          hp_codes?: string[] | null
          id?: string
          internal_number?: string | null
          item_id?: string
          linked_document_id?: string | null
          movement_date?: string
          movement_number?: number
          movement_type?: Database["public"]["Enums"]["dragon_movement_type"]
          note?: string | null
          operation_code?: string | null
          parent_movement_id?: string | null
          physical_state?: string | null
          quantity?: number
          recording_date?: string
          register_id?: string | null
          sign?: Database["public"]["Enums"]["dragon_sign"]
          source_context?: Database["public"]["Enums"]["dragon_source_context"]
          source_site_id?: string | null
          source_transform_batch_id?: string | null
          status?: Database["public"]["Enums"]["dragon_movement_status"]
          test_session?: string | null
          unit_of_measure?: string
          updated_at?: string
          updated_by?: string | null
          weight_status?: Database["public"]["Enums"]["dragon_weight_status"]
        }
        Relationships: [
          {
            foreignKeyName: "dragon_register_movements_cause_id_fkey"
            columns: ["cause_id"]
            isOneToOne: false
            referencedRelation: "dragon_causes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_register_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_register_movements_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "dragon_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_register_movements_parent_movement_id_fkey"
            columns: ["parent_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_register_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_register_movements_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "dragon_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_register_movements_source_site_id_fkey"
            columns: ["source_site_id"]
            isOneToOne: false
            referencedRelation: "dragon_production_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dragon_reg_mov_batch"
            columns: ["source_transform_batch_id"]
            isOneToOne: false
            referencedRelation: "dragon_transform_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_registers: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          description: string | null
          id: string
          register_code: string
          subject_type: Database["public"]["Enums"]["dragon_subject_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          register_code: string
          subject_type?: Database["public"]["Enums"]["dragon_subject_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          register_code?: string
          subject_type?: Database["public"]["Enums"]["dragon_subject_type"]
          updated_at?: string
        }
        Relationships: []
      }
      dragon_stock_movements: {
        Row: {
          cause_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          lot_reference: string | null
          movement_date: string
          note: string | null
          quantity: number
          sign: Database["public"]["Enums"]["dragon_sign"]
          source_document_id: string | null
          source_register_movement_id: string | null
          source_transform_batch_id: string | null
          test_session: string | null
          warehouse_id: string | null
          warehouse_scope: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Insert: {
          cause_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          lot_reference?: string | null
          movement_date?: string
          note?: string | null
          quantity?: number
          sign: Database["public"]["Enums"]["dragon_sign"]
          source_document_id?: string | null
          source_register_movement_id?: string | null
          source_transform_batch_id?: string | null
          test_session?: string | null
          warehouse_id?: string | null
          warehouse_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Update: {
          cause_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          lot_reference?: string | null
          movement_date?: string
          note?: string | null
          quantity?: number
          sign?: Database["public"]["Enums"]["dragon_sign"]
          source_document_id?: string | null
          source_register_movement_id?: string | null
          source_transform_batch_id?: string | null
          test_session?: string | null
          warehouse_id?: string | null
          warehouse_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "dragon_stock_movements_cause_id_fkey"
            columns: ["cause_id"]
            isOneToOne: false
            referencedRelation: "dragon_causes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_stock_movements_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "dragon_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_stock_movements_source_register_movement_id_fkey"
            columns: ["source_register_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_register_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "dragon_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dragon_stock_mov_batch"
            columns: ["source_transform_batch_id"]
            isOneToOne: false
            referencedRelation: "dragon_transform_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_transform_batch_outputs: {
        Row: {
          batch_id: string
          created_at: string
          generated_register_movement_id: string | null
          generated_stock_movement_id: string | null
          id: string
          lot_id: string | null
          output_item_id: string
          output_quantity: number
          warehouse_scope: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Insert: {
          batch_id: string
          created_at?: string
          generated_register_movement_id?: string | null
          generated_stock_movement_id?: string | null
          id?: string
          lot_id?: string | null
          output_item_id: string
          output_quantity: number
          warehouse_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Update: {
          batch_id?: string
          created_at?: string
          generated_register_movement_id?: string | null
          generated_stock_movement_id?: string | null
          id?: string
          lot_id?: string | null
          output_item_id?: string
          output_quantity?: number
          warehouse_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "dragon_transform_batch_output_generated_register_movement__fkey"
            columns: ["generated_register_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_register_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_transform_batch_outputs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dragon_transform_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_transform_batch_outputs_generated_stock_movement_id_fkey"
            columns: ["generated_stock_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_transform_batch_outputs_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "dragon_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_transform_batch_outputs_output_item_id_fkey"
            columns: ["output_item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_transform_batches: {
        Row: {
          calo_peso_kg: number
          company_id: string
          created_at: string
          created_by: string | null
          execution_date: string
          id: string
          input_quantity: number
          model_id: string | null
          notes: string | null
          source_item_id: string
          source_register_movement_id: string | null
          status: Database["public"]["Enums"]["dragon_batch_status"]
          test_session: string | null
          updated_at: string
        }
        Insert: {
          calo_peso_kg?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          execution_date?: string
          id?: string
          input_quantity: number
          model_id?: string | null
          notes?: string | null
          source_item_id: string
          source_register_movement_id?: string | null
          status?: Database["public"]["Enums"]["dragon_batch_status"]
          test_session?: string | null
          updated_at?: string
        }
        Update: {
          calo_peso_kg?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          execution_date?: string
          id?: string
          input_quantity?: number
          model_id?: string | null
          notes?: string | null
          source_item_id?: string
          source_register_movement_id?: string | null
          status?: Database["public"]["Enums"]["dragon_batch_status"]
          test_session?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_transform_batches_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "dragon_transform_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_transform_batches_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_transform_batches_source_register_movement_id_fkey"
            columns: ["source_register_movement_id"]
            isOneToOne: false
            referencedRelation: "dragon_register_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_transform_model_outputs: {
        Row: {
          created_at: string
          id: string
          model_id: string
          notes: string | null
          output_item_id: string
          output_type: Database["public"]["Enums"]["dragon_item_type"]
          quantity_mode: Database["public"]["Enums"]["dragon_quantity_mode"]
          quantity_value: number
          warehouse_scope: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          notes?: string | null
          output_item_id: string
          output_type?: Database["public"]["Enums"]["dragon_item_type"]
          quantity_mode?: Database["public"]["Enums"]["dragon_quantity_mode"]
          quantity_value?: number
          warehouse_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          notes?: string | null
          output_item_id?: string
          output_type?: Database["public"]["Enums"]["dragon_item_type"]
          quantity_mode?: Database["public"]["Enums"]["dragon_quantity_mode"]
          quantity_value?: number
          warehouse_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "dragon_transform_model_outputs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "dragon_transform_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_transform_model_outputs_output_item_id_fkey"
            columns: ["output_item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_transform_models: {
        Row: {
          active: boolean
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          input_item_id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          input_item_id: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          input_item_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_transform_models_input_item_id_fkey"
            columns: ["input_item_id"]
            isOneToOne: false
            referencedRelation: "dragon_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_warehouses: {
        Row: {
          active: boolean
          code: string
          company_id: string
          created_at: string
          description: string
          has_cer: boolean
          has_mps: boolean
          id: string
          limit_mps_eow: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          company_id: string
          created_at?: string
          description?: string
          has_cer?: boolean
          has_mps?: boolean
          id?: string
          limit_mps_eow?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          company_id?: string
          created_at?: string
          description?: string
          has_cer?: boolean
          has_mps?: boolean
          id?: string
          limit_mps_eow?: number | null
          updated_at?: string
        }
        Relationships: []
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
      emails_global_inbox: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string | null
          fir_id: string | null
          from_address: string
          id: string
          impianto_id: string | null
          is_read: boolean
          message_id: string
          received_at: string
          subject: string | null
          to_address: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          fir_id?: string | null
          from_address: string
          id?: string
          impianto_id?: string | null
          is_read?: boolean
          message_id: string
          received_at: string
          subject?: string | null
          to_address: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          fir_id?: string | null
          from_address?: string
          id?: string
          impianto_id?: string | null
          is_read?: boolean
          message_id?: string
          received_at?: string
          subject?: string | null
          to_address?: string
        }
        Relationships: []
      }
      emails_global_outbox: {
        Row: {
          body_html: string | null
          category: string
          created_at: string | null
          error_message: string | null
          fir_id: string | null
          from_address: string
          id: string
          impianto_id: string | null
          sent_at: string
          status: string
          subject: string | null
          to_address: string
        }
        Insert: {
          body_html?: string | null
          category?: string
          created_at?: string | null
          error_message?: string | null
          fir_id?: string | null
          from_address?: string
          id?: string
          impianto_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          to_address: string
        }
        Update: {
          body_html?: string | null
          category?: string
          created_at?: string | null
          error_message?: string | null
          fir_id?: string | null
          from_address?: string
          id?: string
          impianto_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          to_address?: string
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
      fatture: {
        Row: {
          anno: number
          cliente_codice_fiscale: string | null
          cliente_id: string | null
          cliente_indirizzo: string | null
          cliente_partita_iva: string | null
          cliente_ragione_sociale: string
          cliente_unita_locale: string | null
          cortesia_pdf_url: string | null
          created_at: string
          created_by: string | null
          data_emissione: string
          id: string
          imponibile: number
          inviata_at: string | null
          iva: number
          locked: boolean
          note: string | null
          numero: number
          numero_completo: string | null
          reverse_charge: boolean
          stato: string
          tenant_id: string
          tipo: string
          totale: number
          updated_at: string
          xml_generato_at: string | null
          xml_url: string | null
        }
        Insert: {
          anno?: number
          cliente_codice_fiscale?: string | null
          cliente_id?: string | null
          cliente_indirizzo?: string | null
          cliente_partita_iva?: string | null
          cliente_ragione_sociale: string
          cliente_unita_locale?: string | null
          cortesia_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          data_emissione?: string
          id?: string
          imponibile?: number
          inviata_at?: string | null
          iva?: number
          locked?: boolean
          note?: string | null
          numero: number
          numero_completo?: string | null
          reverse_charge?: boolean
          stato?: string
          tenant_id: string
          tipo?: string
          totale?: number
          updated_at?: string
          xml_generato_at?: string | null
          xml_url?: string | null
        }
        Update: {
          anno?: number
          cliente_codice_fiscale?: string | null
          cliente_id?: string | null
          cliente_indirizzo?: string | null
          cliente_partita_iva?: string | null
          cliente_ragione_sociale?: string
          cliente_unita_locale?: string | null
          cortesia_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          data_emissione?: string
          id?: string
          imponibile?: number
          inviata_at?: string | null
          iva?: number
          locked?: boolean
          note?: string | null
          numero?: number
          numero_completo?: string | null
          reverse_charge?: boolean
          stato?: string
          tenant_id?: string
          tipo?: string
          totale?: number
          updated_at?: string
          xml_generato_at?: string | null
          xml_url?: string | null
        }
        Relationships: []
      }
      fatture_righe: {
        Row: {
          aliquota_iva: number
          cer: string | null
          created_at: string
          descrizione: string
          fattura_id: string
          fir_form_id: string | null
          id: string
          imponibile: number
          iva: number
          numero_fir: string | null
          ordine: number
          prezzo_unitario: number
          quantita: number
          reverse_charge: boolean
          tipo_riga: string
          totale: number
          unita_misura: string
        }
        Insert: {
          aliquota_iva?: number
          cer?: string | null
          created_at?: string
          descrizione: string
          fattura_id: string
          fir_form_id?: string | null
          id?: string
          imponibile?: number
          iva?: number
          numero_fir?: string | null
          ordine?: number
          prezzo_unitario?: number
          quantita?: number
          reverse_charge?: boolean
          tipo_riga?: string
          totale?: number
          unita_misura?: string
        }
        Update: {
          aliquota_iva?: number
          cer?: string | null
          created_at?: string
          descrizione?: string
          fattura_id?: string
          fir_form_id?: string | null
          id?: string
          imponibile?: number
          iva?: number
          numero_fir?: string | null
          ordine?: number
          prezzo_unitario?: number
          quantita?: number
          reverse_charge?: boolean
          tipo_riga?: string
          totale?: number
          unita_misura?: string
        }
        Relationships: [
          {
            foreignKeyName: "fatture_righe_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
        ]
      }
      fatture_sibill_sync: {
        Row: {
          created_at: string
          delivery_status: string | null
          document_status: string | null
          error_detail: string | null
          error_title: string | null
          fattura_id: string
          id: string
          last_sync_at: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          raw_response: Json | null
          sibill_document_id: string | null
          sync_status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_status?: string | null
          document_status?: string | null
          error_detail?: string | null
          error_title?: string | null
          fattura_id: string
          id?: string
          last_sync_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          raw_response?: Json | null
          sibill_document_id?: string | null
          sync_status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_status?: string | null
          document_status?: string | null
          error_detail?: string | null
          error_title?: string | null
          fattura_id?: string
          id?: string
          last_sync_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          raw_response?: Json | null
          sibill_document_id?: string | null
          sync_status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      fir_form_templates: {
        Row: {
          created_at: string
          fields: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
      impianti_accounts: {
        Row: {
          attivo: boolean
          created_at: string
          email: string
          id: string
          password_hash: string
          ragione_sociale: string
          tenant_id: string | null
          ultimo_accesso: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          email: string
          id?: string
          password_hash: string
          ragione_sociale: string
          tenant_id?: string | null
          ultimo_accesso?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          email?: string
          id?: string
          password_hash?: string
          ragione_sociale?: string
          tenant_id?: string | null
          ultimo_accesso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impianti_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impianto_fir_inbox: {
        Row: {
          created_at: string
          data_conferma: string | null
          fir_form_id: string
          id: string
          impianto_account_id: string
          note_impianto: string | null
          peso_verificato: number | null
          stato: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conferma?: string | null
          fir_form_id: string
          id?: string
          impianto_account_id: string
          note_impianto?: string | null
          peso_verificato?: number | null
          stato?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conferma?: string | null
          fir_form_id?: string
          id?: string
          impianto_account_id?: string
          note_impianto?: string | null
          peso_verificato?: number | null
          stato?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impianto_fir_inbox_fir_form_id_fkey"
            columns: ["fir_form_id"]
            isOneToOne: false
            referencedRelation: "fir_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impianto_fir_inbox_impianto_account_id_fkey"
            columns: ["impianto_account_id"]
            isOneToOne: false
            referencedRelation: "impianti_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impianto_fir_inbox_tenant_id_fkey"
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
      magazzino_giacenze: {
        Row: {
          area_stoccaggio: string | null
          cer: string
          created_at: string
          descrizione_cer: string | null
          id: string
          impianto_id: string | null
          quantita_kg: number
          saldo_iniziale_kg: number
          saldo_snapshot_at: string | null
          stato: string | null
          tenant_id: string | null
          tipo_conferente: string | null
          ultimo_carico_at: string | null
          ultimo_scarico_at: string | null
          updated_at: string
        }
        Insert: {
          area_stoccaggio?: string | null
          cer: string
          created_at?: string
          descrizione_cer?: string | null
          id?: string
          impianto_id?: string | null
          quantita_kg?: number
          saldo_iniziale_kg?: number
          saldo_snapshot_at?: string | null
          stato?: string | null
          tenant_id?: string | null
          tipo_conferente?: string | null
          ultimo_carico_at?: string | null
          ultimo_scarico_at?: string | null
          updated_at?: string
        }
        Update: {
          area_stoccaggio?: string | null
          cer?: string
          created_at?: string
          descrizione_cer?: string | null
          id?: string
          impianto_id?: string | null
          quantita_kg?: number
          saldo_iniziale_kg?: number
          saldo_snapshot_at?: string | null
          stato?: string | null
          tenant_id?: string | null
          tipo_conferente?: string | null
          ultimo_carico_at?: string | null
          ultimo_scarico_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "magazzino_giacenze_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magazzino_giacenze_tenant_id_fkey"
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
          privati_conferimento_id: string | null
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
          privati_conferimento_id?: string | null
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
          privati_conferimento_id?: string | null
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
            foreignKeyName: "movimenti_impianto_privati_conferimento_id_fkey"
            columns: ["privati_conferimento_id"]
            isOneToOne: false
            referencedRelation: "privati_conferimenti"
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
      noleggi: {
        Row: {
          cassone_descrizione: string | null
          cassone_id: string | null
          cliente_id: string | null
          cliente_partita_iva: string | null
          cliente_ragione_sociale: string
          created_at: string
          created_by: string | null
          fattura_id: string | null
          fatturato_stato: string
          id: string
          mese_riferimento: string
          note: string | null
          tariffa_mensile: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cassone_descrizione?: string | null
          cassone_id?: string | null
          cliente_id?: string | null
          cliente_partita_iva?: string | null
          cliente_ragione_sociale: string
          created_at?: string
          created_by?: string | null
          fattura_id?: string | null
          fatturato_stato?: string
          id?: string
          mese_riferimento: string
          note?: string | null
          tariffa_mensile?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cassone_descrizione?: string | null
          cassone_id?: string | null
          cliente_id?: string | null
          cliente_partita_iva?: string | null
          cliente_ragione_sociale?: string
          created_at?: string
          created_by?: string | null
          fattura_id?: string | null
          fatturato_stato?: string
          id?: string
          mese_riferimento?: string
          note?: string | null
          tariffa_mensile?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "noleggi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "anagrafica_aziende_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noleggi_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noleggi_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          app_context: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          tenant_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          app_context?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          app_context?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          anno_dbt: number | null
          cer: string
          cf_pi: string | null
          codice_ce: string | null
          created_at: string
          data: string
          esito_pesata: string | null
          gruppo_id: string | null
          id: string
          impianto_id: string
          importo_pagato: number | null
          kg_pesati: number
          metodo_pag: string | null
          modello_automezzo: string | null
          nome_privato: string
          note: string | null
          numero_fir: string | null
          numero_progressivo: number | null
          prezzo_kg: number | null
          privato_id: string | null
          quantita_presunta: number | null
          stato_rifiuto: string | null
          targa_automezzo: string | null
          tenant_id: string | null
          tipo_utenza: string | null
          updated_at: string
        }
        Insert: {
          anno_dbt?: number | null
          cer: string
          cf_pi?: string | null
          codice_ce?: string | null
          created_at?: string
          data?: string
          esito_pesata?: string | null
          gruppo_id?: string | null
          id?: string
          impianto_id: string
          importo_pagato?: number | null
          kg_pesati: number
          metodo_pag?: string | null
          modello_automezzo?: string | null
          nome_privato: string
          note?: string | null
          numero_fir?: string | null
          numero_progressivo?: number | null
          prezzo_kg?: number | null
          privato_id?: string | null
          quantita_presunta?: number | null
          stato_rifiuto?: string | null
          targa_automezzo?: string | null
          tenant_id?: string | null
          tipo_utenza?: string | null
          updated_at?: string
        }
        Update: {
          anno_dbt?: number | null
          cer?: string
          cf_pi?: string | null
          codice_ce?: string | null
          created_at?: string
          data?: string
          esito_pesata?: string | null
          gruppo_id?: string | null
          id?: string
          impianto_id?: string
          importo_pagato?: number | null
          kg_pesati?: number
          metodo_pag?: string | null
          modello_automezzo?: string | null
          nome_privato?: string
          note?: string | null
          numero_fir?: string | null
          numero_progressivo?: number | null
          prezzo_kg?: number | null
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
          deactivated_at: string | null
          id: string
          invited_by: string | null
          is_social_only: boolean
          mn_context: string | null
          nome: string
          social_bio: string | null
          social_warnings: number
          targa_automezzo: string | null
          targa_rimorchio: string | null
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
          deactivated_at?: string | null
          id?: string
          invited_by?: string | null
          is_social_only?: boolean
          mn_context?: string | null
          nome: string
          social_bio?: string | null
          social_warnings?: number
          targa_automezzo?: string | null
          targa_rimorchio?: string | null
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
          deactivated_at?: string | null
          id?: string
          invited_by?: string | null
          is_social_only?: boolean
          mn_context?: string | null
          nome?: string
          social_bio?: string | null
          social_warnings?: number
          targa_automezzo?: string | null
          targa_rimorchio?: string | null
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
      registro_generale: {
        Row: {
          al_rentri: boolean | null
          annotazioni: string | null
          att_orig_rif: string | null
          cap_cantiere: string | null
          carico_scarico: string | null
          cer: string | null
          classi_pericolo: string | null
          cod_intermed: string | null
          cod_magazzino: string | null
          comune_cantiere: string | null
          conai: string | null
          created_at: string | null
          data_ddt_ingresso: string | null
          data_emissione_formulario: string | null
          data_movimento: string | null
          data_ricezione: string | null
          ddt_ingresso: string | null
          descrizione: string | null
          descrizione_tipica: string | null
          destinazione: string | null
          flagnomud: boolean | null
          form_urbano: boolean | null
          id: string
          indirizzo_cantiere: string | null
          indirizzo_intermed: string | null
          intermediario: string | null
          luogo_produzione: string | null
          nota_int: string | null
          numero_formulario: string | null
          numero_interno: number | null
          numero_movimento: string | null
          origine_rifiuto: string | null
          peso_destino: number | null
          peso_lordo: number | null
          provincia_cantiere: string | null
          pseudonimo_cantiere: string | null
          qta_scaricata: number | null
          quantita: number | null
          raw: Json | null
          respinto: string | null
          scaricato: string | null
          segno: string | null
          stato_fisico: string | null
          tara: number | null
          tenant_id: string
          tipo_operazione: string | null
        }
        Insert: {
          al_rentri?: boolean | null
          annotazioni?: string | null
          att_orig_rif?: string | null
          cap_cantiere?: string | null
          carico_scarico?: string | null
          cer?: string | null
          classi_pericolo?: string | null
          cod_intermed?: string | null
          cod_magazzino?: string | null
          comune_cantiere?: string | null
          conai?: string | null
          created_at?: string | null
          data_ddt_ingresso?: string | null
          data_emissione_formulario?: string | null
          data_movimento?: string | null
          data_ricezione?: string | null
          ddt_ingresso?: string | null
          descrizione?: string | null
          descrizione_tipica?: string | null
          destinazione?: string | null
          flagnomud?: boolean | null
          form_urbano?: boolean | null
          id?: string
          indirizzo_cantiere?: string | null
          indirizzo_intermed?: string | null
          intermediario?: string | null
          luogo_produzione?: string | null
          nota_int?: string | null
          numero_formulario?: string | null
          numero_interno?: number | null
          numero_movimento?: string | null
          origine_rifiuto?: string | null
          peso_destino?: number | null
          peso_lordo?: number | null
          provincia_cantiere?: string | null
          pseudonimo_cantiere?: string | null
          qta_scaricata?: number | null
          quantita?: number | null
          raw?: Json | null
          respinto?: string | null
          scaricato?: string | null
          segno?: string | null
          stato_fisico?: string | null
          tara?: number | null
          tenant_id: string
          tipo_operazione?: string | null
        }
        Update: {
          al_rentri?: boolean | null
          annotazioni?: string | null
          att_orig_rif?: string | null
          cap_cantiere?: string | null
          carico_scarico?: string | null
          cer?: string | null
          classi_pericolo?: string | null
          cod_intermed?: string | null
          cod_magazzino?: string | null
          comune_cantiere?: string | null
          conai?: string | null
          created_at?: string | null
          data_ddt_ingresso?: string | null
          data_emissione_formulario?: string | null
          data_movimento?: string | null
          data_ricezione?: string | null
          ddt_ingresso?: string | null
          descrizione?: string | null
          descrizione_tipica?: string | null
          destinazione?: string | null
          flagnomud?: boolean | null
          form_urbano?: boolean | null
          id?: string
          indirizzo_cantiere?: string | null
          indirizzo_intermed?: string | null
          intermediario?: string | null
          luogo_produzione?: string | null
          nota_int?: string | null
          numero_formulario?: string | null
          numero_interno?: number | null
          numero_movimento?: string | null
          origine_rifiuto?: string | null
          peso_destino?: number | null
          peso_lordo?: number | null
          provincia_cantiere?: string | null
          pseudonimo_cantiere?: string | null
          qta_scaricata?: number | null
          quantita?: number | null
          raw?: Json | null
          respinto?: string | null
          scaricato?: string | null
          segno?: string | null
          stato_fisico?: string | null
          tara?: number | null
          tenant_id?: string
          tipo_operazione?: string | null
        }
        Relationships: []
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
      rentri_invii_registri: {
        Row: {
          cliente: string
          created_at: string
          error_message: string | null
          http_status: number | null
          id: string
          movimenti: Json
          num_movimenti: number
          registro_id: string
          registro_nome: string | null
          stato: string
          tenant_id: string | null
          tipo: string | null
          transazione_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente: string
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          movimenti?: Json
          num_movimenti?: number
          registro_id: string
          registro_nome?: string | null
          stato?: string
          tenant_id?: string | null
          tipo?: string | null
          transazione_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          cliente?: string
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          movimenti?: Json
          num_movimenti?: number
          registro_id?: string
          registro_nome?: string | null
          stato?: string
          tenant_id?: string | null
          tipo?: string | null
          transazione_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rentri_logs: {
        Row: {
          cliente: string | null
          created_at: string
          dati_inviati: Json | null
          id: string
          messaggio: string | null
          risposta_rentri: Json | null
          ruolo: string | null
          stato: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          dati_inviati?: Json | null
          id?: string
          messaggio?: string | null
          risposta_rentri?: Json | null
          ruolo?: string | null
          stato?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string
          dati_inviati?: Json | null
          id?: string
          messaggio?: string | null
          risposta_rentri?: Json | null
          ruolo?: string | null
          stato?: string | null
        }
        Relationships: []
      }
      rentri_operation_history: {
        Row: {
          cliente: string
          created_at: string
          error_code: string | null
          error_message: string | null
          http_status: number | null
          id: string
          mode: string
          rentri_method: string | null
          rentri_path: string | null
          success: boolean
          tenant_id: string | null
          tipo_operazione: string
          user_id: string | null
        }
        Insert: {
          cliente: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          mode?: string
          rentri_method?: string | null
          rentri_path?: string | null
          success?: boolean
          tenant_id?: string | null
          tipo_operazione: string
          user_id?: string | null
        }
        Update: {
          cliente?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          mode?: string
          rentri_method?: string | null
          rentri_path?: string | null
          success?: boolean
          tenant_id?: string | null
          tipo_operazione?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ricevute_privati: {
        Row: {
          anno: number
          conferimento_id: string | null
          created_at: string
          data_emissione: string
          gruppo_id: string | null
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
          gruppo_id?: string | null
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
          gruppo_id?: string | null
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
          autorizzazioni: string | null
          cap: string | null
          categoria: string
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
          ruoli: string | null
          telefono: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          anagrafica_id?: string | null
          autorizzazioni?: string | null
          cap?: string | null
          categoria?: string
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
          ruoli?: string | null
          telefono?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          anagrafica_id?: string | null
          autorizzazioni?: string | null
          cap?: string | null
          categoria?: string
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
          ruoli?: string | null
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
      sibill_counterparts: {
        Row: {
          azienda_id: string | null
          company_name: string
          created_at: string
          id: string
          raw_payload: Json | null
          sibill_counterpart_id: string
          tax_number: string | null
          tenant_id: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          azienda_id?: string | null
          company_name: string
          created_at?: string
          id?: string
          raw_payload?: Json | null
          sibill_counterpart_id: string
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          azienda_id?: string | null
          company_name?: string
          created_at?: string
          id?: string
          raw_payload?: Json | null
          sibill_counterpart_id?: string
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      sibill_documents_cache: {
        Row: {
          counterpart: string | null
          currency: string | null
          delivery_date: string | null
          delivery_status: string | null
          direction: string | null
          doc_id: string
          document_date: string | null
          file_name: string | null
          gross: number | null
          is_e_invoice: boolean | null
          number: string | null
          raw: Json | null
          status: string | null
          synced_at: string
          type: string | null
          vat: number | null
        }
        Insert: {
          counterpart?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_status?: string | null
          direction?: string | null
          doc_id: string
          document_date?: string | null
          file_name?: string | null
          gross?: number | null
          is_e_invoice?: boolean | null
          number?: string | null
          raw?: Json | null
          status?: string | null
          synced_at?: string
          type?: string | null
          vat?: number | null
        }
        Update: {
          counterpart?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_status?: string | null
          direction?: string | null
          doc_id?: string
          document_date?: string | null
          file_name?: string | null
          gross?: number | null
          is_e_invoice?: boolean | null
          number?: string | null
          raw?: Json | null
          status?: string | null
          synced_at?: string
          type?: string | null
          vat?: number | null
        }
        Relationships: []
      }
      sibill_scan_state: {
        Row: {
          cursor: string | null
          done: boolean
          id: string
          scanned: number
          started_at: string
          updated_at: string
        }
        Insert: {
          cursor?: string | null
          done?: boolean
          id: string
          scanned?: number
          started_at?: string
          updated_at?: string
        }
        Update: {
          cursor?: string | null
          done?: boolean
          id?: string
          scanned?: number
          started_at?: string
          updated_at?: string
        }
        Relationships: []
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
      social_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      social_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_invites: {
        Row: {
          created_at: string
          expires_at: string
          guest_cf: string | null
          guest_name: string | null
          id: string
          invite_code: string
          invited_by: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          guest_cf?: string | null
          guest_name?: string | null
          id?: string
          invite_code?: string
          invited_by: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          guest_cf?: string | null
          guest_name?: string | null
          id?: string
          invite_code?: string
          invited_by?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      social_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_moderation: {
        Row: {
          action_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          moderator_id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          moderator_id: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          author_id: string
          comments_count: number
          content: string
          created_at: string
          hidden_by: string | null
          hidden_reason: string | null
          id: string
          image_url: string | null
          is_hidden: boolean
          likes_count: number
          post_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          comments_count?: number
          content: string
          created_at?: string
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          likes_count?: number
          post_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          likes_count?: number
          post_type?: string
          tenant_id?: string
          updated_at?: string
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
      system_prompt_requests: {
        Row: {
          admin_notes: string | null
          category: string
          content: string
          created_at: string
          id: string
          status: string
          tenant_id: string | null
          tenant_label: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          content: string
          created_at?: string
          id?: string
          status?: string
          tenant_id?: string | null
          tenant_label: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          status?: string
          tenant_id?: string | null
          tenant_label?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_prompt_requests_tenant_id_fkey"
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
      admin_set_fir_number: {
        Args: { p_form_id: string; p_numero_fir: string }
        Returns: string
      }
      assert_magazzino_giacenza: {
        Args: { p_cer: string; p_impianto_id: string; p_tenant_id: string }
        Returns: undefined
      }
      auto_assign_after_consume: {
        Args: { p_user_id: string }
        Returns: string
      }
      auto_distribute_baseline_fir: {
        Args: { p_societa?: string }
        Returns: number
      }
      auto_distribute_fir_numbers: { Args: never; Returns: number }
      bootstrap_admin_role: { Args: never; Returns: undefined }
      can_access_tenant: { Args: { _tenant: string }; Returns: boolean }
      can_read_mp_registry: { Args: never; Returns: boolean }
      check_giacenze_allineate: {
        Args: { p_tenant_id?: string }
        Returns: {
          atteso_kg: number
          cer: string
          delta_kg: number
          impianto_id: string
          quantita_kg: number
        }[]
      }
      consume_fir_number: { Args: { p_fir_id: string }; Returns: undefined }
      crea_conferimento_privato_atomico: {
        Args: {
          p_cf_pi: string
          p_data: string
          p_impianto_id: string
          p_importo: number
          p_materiali: Json
          p_metodo_pag: string
          p_modello: string
          p_nome_privato: string
          p_note: string
          p_privato_id: string
          p_targa: string
          p_tenant_id: string
          p_tipo_utenza: string
        }
        Returns: Json
      }
      create_extra_fir_draft: { Args: { p_user_id: string }; Returns: string }
      create_manual_fir_draft_for_tenant: {
        Args: { p_numero_fir: string; p_tenant_id: string; p_user_id: string }
        Returns: string
      }
      dragon_cancel_cernita_atomic: {
        Args: { p_batch_id: string; p_reason?: string }
        Returns: string
      }
      dragon_complete_cernita_atomic: {
        Args: { p_batch_id: string; p_outputs: Json }
        Returns: string
      }
      dragon_create_cernita_atomic: {
        Args: {
          p_company_id: string
          p_deferred?: boolean
          p_execution_date?: string
          p_input_quantity: number
          p_model_id?: string
          p_notes?: string
          p_outputs?: Json
          p_source_item_id: string
        }
        Returns: string
      }
      dragon_get_stock_balance: {
        Args: {
          p_company_id: string
          p_item_id: string
          p_scope?: Database["public"]["Enums"]["dragon_warehouse_scope"]
        }
        Returns: number
      }
      dragon_lot_balance: { Args: { p_lot_id: string }; Returns: number }
      dragon_merge_lots_atomic: {
        Args: {
          p_notes?: string
          p_source_lot_ids: string[]
          p_target_lot_code: string
        }
        Returns: string
      }
      dragon_next_movement_number: {
        Args: { p_company_id: string; p_register_id: string }
        Returns: number
      }
      dragon_split_lot_atomic: {
        Args: {
          p_lot_id: string
          p_new_lot_code: string
          p_notes?: string
          p_quantity: number
        }
        Returns: string
      }
      dragon_test_balance_snapshot: {
        Args: { p_company_id: string }
        Returns: Json
      }
      dragon_test_cleanup: {
        Args: { p_company_id: string; p_session: string }
        Returns: Json
      }
      dragon_test_run: {
        Args: { p_company_id: string; p_scenario: string }
        Returns: Json
      }
      dragon_test_tag_batch: {
        Args: { p_batch_id: string; p_company_id: string; p_session: string }
        Returns: undefined
      }
      ensure_fir_draft_by_number_for_tenant: {
        Args: { p_numero_fir: string; p_tenant_id: string; p_user_id: string }
        Returns: string
      }
      ensure_user_has_fir_draft: {
        Args: { p_user_id: string }
        Returns: string
      }
      ensure_user_has_fir_draft_for_tenant: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: string
      }
      esegui_cernita_atomica: {
        Args: {
          p_cer_input: string
          p_data?: string
          p_impianto_id: string
          p_note?: string
          p_outputs: Json
          p_quantita_input: number
          p_tenant_id: string
        }
        Returns: string
      }
      exec_sql_readonly: { Args: { query: string }; Returns: Json }
      exec_sql_write: { Args: { query: string }; Returns: Json }
      generate_fir_numbers_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_admin_user_id: { Args: never; Returns: string }
      get_app_reset_token: { Args: { p_scope: string }; Returns: string }
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
      inventory_lock_key: {
        Args: { p_cer: string; p_impianto_id: string; p_tenant_id: string }
        Returns: number
      }
      is_allowed_multy_niyol_tenant: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      is_multy_niyol_admin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      is_valid_fir_number: { Args: { p_value: string }; Returns: boolean }
      lookup_social_invite: {
        Args: { p_code: string }
        Returns: {
          expires_at: string
          guest_cf: string
          guest_name: string
          id: string
          invite_code: string
          invited_by: string
        }[]
      }
      map_tenant_to_societa: { Args: { p_tenant_id: string }; Returns: string }
      next_ddt_number: {
        Args: { p_anno: number; p_tenant_id: string }
        Returns: string
      }
      next_fattura_number: {
        Args: { p_anno: number; p_tenant_id: string }
        Returns: number
      }
      next_prima_nota_number: {
        Args: { p_anno: number; p_tenant_id: string }
        Returns: number
      }
      next_progressivo_dbt: {
        Args: { p_anno: number; p_tenant_id: string }
        Returns: number
      }
      next_ricevuta_number: {
        Args: { p_anno: number; p_impianto_id: string }
        Returns: string
      }
      notify_fir_pool_empty: {
        Args: {
          p_societa_id: string
          p_tenant_id: string
          p_triggered_by?: string
        }
        Returns: number
      }
      reassign_fir_number: {
        Args: {
          p_assigned_by?: string
          p_fir_number_id: string
          p_new_user_id: string
        }
        Returns: boolean
      }
      recalculate_magazzino_giacenza: {
        Args: { p_cer: string; p_impianto_id: string; p_tenant_id: string }
        Returns: undefined
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
      update_impianto_password: {
        Args: { p_account_id: string; p_new_password: string }
        Returns: undefined
      }
      upsert_soggetto_anagrafica: {
        Args: {
          p_autorizzazioni?: string
          p_cap?: string
          p_categoria?: string
          p_cellulare?: string
          p_codice_fiscale?: string
          p_comune?: string
          p_contatto_id?: string
          p_email?: string
          p_indirizzo?: string
          p_note?: string
          p_partita_iva?: string
          p_pec?: string
          p_provincia?: string
          p_ragione_sociale: string
          p_telefono?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      verify_impianto_password: {
        Args: { p_email: string; p_password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      call_status: "ringing" | "answered" | "ended" | "missed" | "ai_fallback"
      call_type: "audio" | "video"
      dragon_adjustment_type: "POSITIVE" | "NEGATIVE"
      dragon_audit_action:
        | "CREATE"
        | "UPDATE"
        | "SOFT_DELETE"
        | "RESTORE"
        | "CONFIRM"
        | "CANCEL"
        | "ADJUST"
      dragon_batch_status: "BOZZA" | "CONFERMATA" | "ANNULLATA" | "PENDENTE"
      dragon_cause_direction: "IN" | "OUT" | "TRANSFORM" | "ADJUST"
      dragon_cause_scope: "REGISTER" | "STOCK" | "BOTH"
      dragon_document_type:
        | "FIR"
        | "DDT_IN"
        | "DDT_OUT"
        | "FORMULARIO_MODELLO"
        | "ALTRO"
      dragon_item_type: "WASTE_CER" | "MPS" | "MATERIAL"
      dragon_movement_status:
        | "BOZZA"
        | "CONSOLIDATO"
        | "STAMPATO"
        | "DA_NON_STAMPARE"
        | "DA_NON_INVIARE_RENTRI"
        | "INVIATO_RENTRI"
      dragon_movement_type: "CARICO" | "SCARICO"
      dragon_quantity_mode: "PERCENT" | "FIXED"
      dragon_sign: "PLUS" | "MINUS"
      dragon_site_activity:
        | "ND"
        | "MANUTENZIONE"
        | "ASSISTENZA_SANITARIA"
        | "CANTIERE_TEMPORANEO_MOBILE"
        | "BONIFICA_AMIANTO"
      dragon_source_context: "UL" | "FUORI_UL"
      dragon_stock_sign: "PLUS" | "MINUS" | "NONE"
      dragon_subject_type:
        | "PRODUTTORE"
        | "DESTINATARIO"
        | "TRASPORTATORE"
        | "INTERMEDIARIO"
      dragon_warehouse_scope: "WASTE" | "MPS"
      dragon_weight_status: "DEFINITIVO" | "DA_VERIFICARE_A_DESTINO"
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
      dragon_adjustment_type: ["POSITIVE", "NEGATIVE"],
      dragon_audit_action: [
        "CREATE",
        "UPDATE",
        "SOFT_DELETE",
        "RESTORE",
        "CONFIRM",
        "CANCEL",
        "ADJUST",
      ],
      dragon_batch_status: ["BOZZA", "CONFERMATA", "ANNULLATA", "PENDENTE"],
      dragon_cause_direction: ["IN", "OUT", "TRANSFORM", "ADJUST"],
      dragon_cause_scope: ["REGISTER", "STOCK", "BOTH"],
      dragon_document_type: [
        "FIR",
        "DDT_IN",
        "DDT_OUT",
        "FORMULARIO_MODELLO",
        "ALTRO",
      ],
      dragon_item_type: ["WASTE_CER", "MPS", "MATERIAL"],
      dragon_movement_status: [
        "BOZZA",
        "CONSOLIDATO",
        "STAMPATO",
        "DA_NON_STAMPARE",
        "DA_NON_INVIARE_RENTRI",
        "INVIATO_RENTRI",
      ],
      dragon_movement_type: ["CARICO", "SCARICO"],
      dragon_quantity_mode: ["PERCENT", "FIXED"],
      dragon_sign: ["PLUS", "MINUS"],
      dragon_site_activity: [
        "ND",
        "MANUTENZIONE",
        "ASSISTENZA_SANITARIA",
        "CANTIERE_TEMPORANEO_MOBILE",
        "BONIFICA_AMIANTO",
      ],
      dragon_source_context: ["UL", "FUORI_UL"],
      dragon_stock_sign: ["PLUS", "MINUS", "NONE"],
      dragon_subject_type: [
        "PRODUTTORE",
        "DESTINATARIO",
        "TRASPORTATORE",
        "INTERMEDIARIO",
      ],
      dragon_warehouse_scope: ["WASTE", "MPS"],
      dragon_weight_status: ["DEFINITIVO", "DA_VERIFICARE_A_DESTINO"],
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
