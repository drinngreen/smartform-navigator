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
          created_at: string
          data: string
          id: string
          impianto_id: string
          importo_pagato: number | null
          kg_pesati: number
          metodo_pag: string | null
          nome_privato: string
          note: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cer: string
          cf_pi?: string | null
          created_at?: string
          data?: string
          id?: string
          impianto_id: string
          importo_pagato?: number | null
          kg_pesati: number
          metodo_pag?: string | null
          nome_privato: string
          note?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cer?: string
          cf_pi?: string | null
          created_at?: string
          data?: string
          id?: string
          impianto_id?: string
          importo_pagato?: number | null
          kg_pesati?: number
          metodo_pag?: string | null
          nome_privato?: string
          note?: string | null
          tenant_id?: string | null
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
      auto_distribute_fir_numbers: { Args: never; Returns: number }
      bootstrap_admin_role: { Args: never; Returns: undefined }
      consume_fir_number: { Args: { p_fir_id: string }; Returns: undefined }
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
