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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      aar_reports: {
        Row: {
          corrective_actions: Json
          executive_summary: string
          id: string
          incident_id: string
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          corrective_actions?: Json
          executive_summary?: string
          id?: string
          incident_id: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          corrective_actions?: Json
          executive_summary?: string
          id?: string
          incident_id?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aar_reports_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aar_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      city_fleet_assets: {
        Row: {
          asset_number: string
          created_at: string
          custom_hourly_rate: number | null
          department_id: string | null
          fema_rate_id: string | null
          id: string
          justification_notes: string | null
          make_model_hp: string | null
          nickname: string
          organization_id: string
          rate_source: Database["public"]["Enums"]["rate_source"]
        }
        Insert: {
          asset_number: string
          created_at?: string
          custom_hourly_rate?: number | null
          department_id?: string | null
          fema_rate_id?: string | null
          id?: string
          justification_notes?: string | null
          make_model_hp?: string | null
          nickname: string
          organization_id: string
          rate_source?: Database["public"]["Enums"]["rate_source"]
        }
        Update: {
          asset_number?: string
          created_at?: string
          custom_hourly_rate?: number | null
          department_id?: string | null
          fema_rate_id?: string | null
          id?: string
          justification_notes?: string | null
          make_model_hp?: string | null
          nickname?: string
          organization_id?: string
          rate_source?: Database["public"]["Enums"]["rate_source"]
        }
        Relationships: [
          {
            foreignKeyName: "city_fleet_assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_fleet_assets_fema_rate_id_fkey"
            columns: ["fema_rate_id"]
            isOneToOne: false
            referencedRelation: "fema_equipment_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_fleet_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_fleet_seed: {
        Row: {
          asset_number: string
          cost_code: string | null
          department_name: string | null
          nickname: string
          rate_source: Database["public"]["Enums"]["rate_source"]
        }
        Insert: {
          asset_number: string
          cost_code?: string | null
          department_name?: string | null
          nickname: string
          rate_source?: Database["public"]["Enums"]["rate_source"]
        }
        Update: {
          asset_number?: string
          cost_code?: string | null
          department_name?: string | null
          nickname?: string
          rate_source?: Database["public"]["Enums"]["rate_source"]
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_entries: {
        Row: {
          active_hours: number
          author_name: string | null
          city_fleet_asset_id: string | null
          client_generated_id: string
          created_at: string
          created_by: string | null
          department: string | null
          edited_at: string | null
          edited_by: string | null
          entry_time: string
          equipment_name: string
          fema_category: Database["public"]["Enums"]["fema_category"]
          fema_code: string | null
          fema_cost_code: string | null
          hourly_rate: number
          id: string
          incident_id: string
          operator_name: string | null
          organization_id: string
          original_timestamp: string
          rate_source: string | null
          rate_verified: boolean
          reimbursable_total: number | null
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          schedule_edition: string | null
          standby_hours: number
          timestamp_edited: boolean
          total_cost: number | null
          work_location: string | null
        }
        Insert: {
          active_hours?: number
          author_name?: string | null
          city_fleet_asset_id?: string | null
          client_generated_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          equipment_name: string
          fema_category?: Database["public"]["Enums"]["fema_category"]
          fema_code?: string | null
          fema_cost_code?: string | null
          hourly_rate?: number
          id?: string
          incident_id: string
          operator_name?: string | null
          organization_id: string
          original_timestamp?: string
          rate_source?: string | null
          rate_verified?: boolean
          reimbursable_total?: number | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_edition?: string | null
          standby_hours?: number
          timestamp_edited?: boolean
          total_cost?: number | null
          work_location?: string | null
        }
        Update: {
          active_hours?: number
          author_name?: string | null
          city_fleet_asset_id?: string | null
          client_generated_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          equipment_name?: string
          fema_category?: Database["public"]["Enums"]["fema_category"]
          fema_code?: string | null
          fema_cost_code?: string | null
          hourly_rate?: number
          id?: string
          incident_id?: string
          operator_name?: string | null
          organization_id?: string
          original_timestamp?: string
          rate_source?: string | null
          rate_verified?: boolean
          reimbursable_total?: number | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_edition?: string | null
          standby_hours?: number
          timestamp_edited?: boolean
          total_cost?: number | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_entries_city_fleet_asset_id_fkey"
            columns: ["city_fleet_asset_id"]
            isOneToOne: false
            referencedRelation: "city_fleet_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_photos: {
        Row: {
          author_name: string | null
          caption: string | null
          client_generated_id: string
          created_at: string
          created_by: string | null
          edited_at: string | null
          edited_by: string | null
          field_log_id: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          incident_id: string
          organization_id: string
          original_timestamp: string
          phase: string
          storage_path: string
          taken_at: string
          timestamp_edited: boolean
        }
        Insert: {
          author_name?: string | null
          caption?: string | null
          client_generated_id: string
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          field_log_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          incident_id: string
          organization_id: string
          original_timestamp?: string
          phase?: string
          storage_path: string
          taken_at?: string
          timestamp_edited?: boolean
        }
        Update: {
          author_name?: string | null
          caption?: string | null
          client_generated_id?: string
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          field_log_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          incident_id?: string
          organization_id?: string
          original_timestamp?: string
          phase?: string
          storage_path?: string
          taken_at?: string
          timestamp_edited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evidence_photos_field_log_id_fkey"
            columns: ["field_log_id"]
            isOneToOne: false
            referencedRelation: "field_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fema_equipment_rates: {
        Row: {
          category: string
          cost_code: string
          created_at: string
          equipment_name: string
          hourly_rate: number
          id: string
          notes: string | null
          organization_id: string | null
          schedule_edition: string
          specifications: string | null
          unit: string
        }
        Insert: {
          category?: string
          cost_code: string
          created_at?: string
          equipment_name: string
          hourly_rate?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          schedule_edition?: string
          specifications?: string | null
          unit?: string
        }
        Update: {
          category?: string
          cost_code?: string
          created_at?: string
          equipment_name?: string
          hourly_rate?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          schedule_edition?: string
          specifications?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "fema_equipment_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      field_logs: {
        Row: {
          author_name: string | null
          category: string
          client_generated_id: string
          created_at: string
          created_by: string | null
          department: string | null
          edited_at: string | null
          edited_by: string | null
          entry_time: string
          fema_category: Database["public"]["Enums"]["fema_category"] | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          incident_id: string
          location_address: string | null
          notes: string
          organization_id: string
          original_timestamp: string
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          timestamp_edited: boolean
        }
        Insert: {
          author_name?: string | null
          category?: string
          client_generated_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          fema_category?: Database["public"]["Enums"]["fema_category"] | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          incident_id: string
          location_address?: string | null
          notes?: string
          organization_id: string
          original_timestamp?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          timestamp_edited?: boolean
        }
        Update: {
          author_name?: string | null
          category?: string
          client_generated_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          fema_category?: Database["public"]["Enums"]["fema_category"] | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          incident_id?: string
          location_address?: string | null
          notes?: string
          organization_id?: string
          original_timestamp?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          timestamp_edited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "field_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          fema_declaration: string | null
          id: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          name: string
          operational_period: string | null
          organization_id: string
          started_at: string
          status: Database["public"]["Enums"]["incident_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          fema_declaration?: string | null
          id?: string
          incident_type?: Database["public"]["Enums"]["incident_type"]
          name: string
          operational_period?: string | null
          organization_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          fema_declaration?: string | null
          id?: string
          incident_type?: Database["public"]["Enums"]["incident_type"]
          name?: string
          operational_period?: string | null
          organization_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
        }
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string | null
          full_name: string | null
          id: string
          organization_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_entries: {
        Row: {
          author_name: string | null
          client_generated_id: string
          created_at: string
          created_by: string | null
          department: string | null
          edited_at: string | null
          edited_by: string | null
          entry_time: string
          fema_category: Database["public"]["Enums"]["fema_category"]
          fringe_pct: number
          hourly_rate: number
          id: string
          incident_id: string
          organization_id: string
          original_timestamp: string
          overtime_hours: number
          rate_verified: boolean
          regular_hours: number
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_title: string | null
          staff_name: string
          task_description: string | null
          timestamp_edited: boolean
          total_cost: number | null
        }
        Insert: {
          author_name?: string | null
          client_generated_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          fema_category?: Database["public"]["Enums"]["fema_category"]
          fringe_pct?: number
          hourly_rate?: number
          id?: string
          incident_id: string
          organization_id: string
          original_timestamp?: string
          overtime_hours?: number
          rate_verified?: boolean
          regular_hours?: number
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          staff_name: string
          task_description?: string | null
          timestamp_edited?: boolean
          total_cost?: number | null
        }
        Update: {
          author_name?: string | null
          client_generated_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          fema_category?: Database["public"]["Enums"]["fema_category"]
          fringe_pct?: number
          hourly_rate?: number
          id?: string
          incident_id?: string
          organization_id?: string
          original_timestamp?: string
          overtime_hours?: number
          rate_verified?: boolean
          regular_hours?: number
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          staff_name?: string
          task_description?: string | null
          timestamp_edited?: boolean
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_entries: {
        Row: {
          author_name: string | null
          client_generated_id: string
          created_at: string
          created_by: string | null
          department: string | null
          edited_at: string | null
          edited_by: string | null
          entry_time: string
          fema_category: Database["public"]["Enums"]["fema_category"]
          id: string
          incident_id: string
          item_description: string
          organization_id: string
          original_timestamp: string
          quantity: number
          rate_verified: boolean
          receipt_path: string | null
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          timestamp_edited: boolean
          total_cost: number | null
          unit_cost: number
          vendor: string | null
        }
        Insert: {
          author_name?: string | null
          client_generated_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          fema_category?: Database["public"]["Enums"]["fema_category"]
          id?: string
          incident_id: string
          item_description: string
          organization_id: string
          original_timestamp?: string
          quantity?: number
          rate_verified?: boolean
          receipt_path?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          timestamp_edited?: boolean
          total_cost?: number | null
          unit_cost?: number
          vendor?: string | null
        }
        Update: {
          author_name?: string | null
          client_generated_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entry_time?: string
          fema_category?: Database["public"]["Enums"]["fema_category"]
          id?: string
          incident_id?: string
          item_description?: string
          organization_id?: string
          original_timestamp?: string
          quantity?: number
          rate_verified?: boolean
          receipt_path?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          timestamp_edited?: boolean
          total_cost?: number | null
          unit_cost?: number
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email: string
          expires_at?: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          join_code: string
          logo_url: string | null
          name: string
          primary_color: string
          slug: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          join_code?: string
          logo_url?: string | null
          name: string
          primary_color?: string
          slug: string
          state?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          join_code?: string
          logo_url?: string | null
          name?: string
          primary_color?: string
          slug?: string
          state?: string
        }
        Relationships: []
      }
      rate_cards: {
        Row: {
          code: string | null
          created_at: string
          fringe_pct: number
          hourly_rate: number
          id: string
          kind: string
          name: string
          organization_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          fringe_pct?: number
          hourly_rate?: number
          id?: string
          kind: string
          name: string
          organization_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          fringe_pct?: number
          hourly_rate?: number
          id?: string
          kind?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      record_edits: {
        Row: {
          edited_at: string
          edited_by: string | null
          id: string
          organization_id: string
          previous: Json
          record_id: string
          table_name: string
        }
        Insert: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          organization_id: string
          previous: Json
          record_id: string
          table_name: string
        }
        Update: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          organization_id?: string
          previous?: Json
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_edits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { _full_name: string; _token: string }
        Returns: string
      }
      can_read_org: { Args: { _org: string }; Returns: boolean }
      decide_join_request: {
        Args: {
          _approve: boolean
          _department?: string
          _id: string
          _role?: Database["public"]["Enums"]["org_role"]
        }
        Returns: undefined
      }
      get_invite: {
        Args: { _token: string }
        Returns: {
          department: string
          email: string
          expires_at: string
          organization_name: string
          organization_state: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
        }[]
      }
      has_org_role: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      is_demo_org: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      join_city: {
        Args: { _code: string; _full_name: string }
        Returns: string
      }
      register_city: {
        Args: {
          _full_name: string
          _name: string
          _slug: string
          _state: string
        }
        Returns: string
      }
      reset_demo_city: { Args: never; Returns: undefined }
      rotate_join_code: { Args: { _org: string }; Returns: string }
      seed_winter_scenario: {
        Args: { _org: string; _user: string }
        Returns: string
      }
    }
    Enums: {
      fema_category: "A" | "B" | "C" | "D" | "E" | "F" | "G"
      incident_status: "active" | "recovery" | "closed"
      incident_type:
        | "freeze"
        | "flood"
        | "severe_storm"
        | "cyber"
        | "utility_outage"
        | "other"
      org_role:
        | "city_admin"
        | "eoc_commander"
        | "field_responder"
        | "finance_auditor"
      rate_source: "fema_schedule" | "local_rate" | "unlisted_pending_fema"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      fema_category: ["A", "B", "C", "D", "E", "F", "G"],
      incident_status: ["active", "recovery", "closed"],
      incident_type: [
        "freeze",
        "flood",
        "severe_storm",
        "cyber",
        "utility_outage",
        "other",
      ],
      org_role: [
        "city_admin",
        "eoc_commander",
        "field_responder",
        "finance_auditor",
      ],
      rate_source: ["fema_schedule", "local_rate", "unlisted_pending_fema"],
    },
  },
} as const
