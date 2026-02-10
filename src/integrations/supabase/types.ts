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
      assignments: {
        Row: {
          assigned_by: string
          created_at: string
          due_date: string | null
          id: string
          project_id: string
          stage_name: Database["public"]["Enums"]["stage_name"]
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          due_date?: string | null
          id?: string
          project_id: string
          stage_name: Database["public"]["Enums"]["stage_name"]
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          due_date?: string | null
          id?: string
          project_id?: string
          stage_name?: Database["public"]["Enums"]["stage_name"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_date: string
          id: string
          project_stage_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          due_date: string
          id?: string
          project_stage_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          id?: string
          project_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "v_deadlines_risk"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deadlines_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "v_project_current_stage"
            referencedColumns: ["stage_id"]
          },
        ]
      }
      defense_sessions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          location: string
          notes: string | null
          scheduled_at: string
          stage_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          location: string
          notes?: string | null
          scheduled_at: string
          stage_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          location?: string
          notes?: string | null
          scheduled_at?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "defense_sessions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defense_sessions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_deadlines_risk"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "defense_sessions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_project_current_stage"
            referencedColumns: ["stage_id"]
          },
        ]
      }
      endorsements: {
        Row: {
          approved: boolean
          comments: string | null
          created_at: string
          endorsed_by: string
          id: string
          submission_id: string
        }
        Insert: {
          approved?: boolean
          comments?: string | null
          created_at?: string
          endorsed_by: string
          id?: string
          submission_id: string
        }
        Update: {
          approved?: boolean
          comments?: string | null
          created_at?: string
          endorsed_by?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          comments: string | null
          created_at: string
          evaluation_id: string
          id: string
          rubric_item_id: string
          score: number | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          evaluation_id: string
          id?: string
          rubric_item_id: string
          score?: number | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          evaluation_id?: string
          id?: string
          rubric_item_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_rubric_item_id_fkey"
            columns: ["rubric_item_id"]
            isOneToOne: false
            referencedRelation: "rubric_items"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          id: string
          observations: string | null
          official_result: string | null
          project_stage_id: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          id?: string
          observations?: string | null
          official_result?: string | null
          project_stage_id?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          id?: string
          observations?: string | null
          official_result?: string | null
          project_stage_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "v_deadlines_risk"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "evaluations_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "v_project_current_stage"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "evaluations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      modalities: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          created_at: string
          final_grade: number | null
          id: string
          observations: string | null
          official_state: Database["public"]["Enums"]["official_state"]
          project_id: string
          stage_name: Database["public"]["Enums"]["stage_name"]
          system_state: Database["public"]["Enums"]["system_state"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          final_grade?: number | null
          id?: string
          observations?: string | null
          official_state?: Database["public"]["Enums"]["official_state"]
          project_id: string
          stage_name: Database["public"]["Enums"]["stage_name"]
          system_state?: Database["public"]["Enums"]["system_state"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          final_grade?: number | null
          id?: string
          observations?: string | null
          official_state?: Database["public"]["Enums"]["official_state"]
          project_id?: string
          stage_name?: Database["public"]["Enums"]["stage_name"]
          system_state?: Database["public"]["Enums"]["system_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          director_id: string | null
          global_status: Database["public"]["Enums"]["global_status"]
          id: string
          modality_id: string
          program_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          director_id?: string | null
          global_status?: Database["public"]["Enums"]["global_status"]
          id?: string
          modality_id: string
          program_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          director_id?: string | null
          global_status?: Database["public"]["Enums"]["global_status"]
          id?: string
          modality_id?: string
          program_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_items: {
        Row: {
          created_at: string
          description: string
          id: string
          max_score: number
          rubric_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          max_score: number
          rubric_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          max_score?: number
          rubric_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubric_items_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string
          id: string
          name: string
          stage_name: Database["public"]["Enums"]["stage_name"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          stage_name: Database["public"]["Enums"]["stage_name"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          stage_name?: Database["public"]["Enums"]["stage_name"]
        }
        Relationships: []
      }
      submissions: {
        Row: {
          created_at: string
          external_url: string | null
          file_url: string | null
          id: string
          notes: string | null
          project_stage_id: string
          submitted_by: string
          version: number
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          project_stage_id: string
          submitted_by: string
          version?: number
        }
        Update: {
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          project_stage_id?: string
          submitted_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "v_deadlines_risk"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "submissions_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "v_project_current_stage"
            referencedColumns: ["stage_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          program_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          program_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          program_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      v_deadlines_risk: {
        Row: {
          days_remaining: number | null
          deadline_created_at: string | null
          deadline_description: string | null
          deadline_id: string | null
          due_date: string | null
          global_status: Database["public"]["Enums"]["global_status"] | null
          official_state: Database["public"]["Enums"]["official_state"] | null
          program_name: string | null
          project_id: string | null
          project_title: string | null
          risk_status: string | null
          stage_id: string | null
          stage_name: Database["public"]["Enums"]["stage_name"] | null
          system_state: Database["public"]["Enums"]["system_state"] | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_project_current_stage: {
        Row: {
          director_id: string | null
          final_grade: number | null
          global_status: Database["public"]["Enums"]["global_status"] | null
          modality_id: string | null
          modality_name: string | null
          observations: string | null
          official_state: Database["public"]["Enums"]["official_state"] | null
          program_id: string | null
          program_name: string | null
          project_created_at: string | null
          project_id: string | null
          project_title: string | null
          stage_created_at: string | null
          stage_id: string | null
          stage_name: Database["public"]["Enums"]["stage_name"] | null
          stage_updated_at: string | null
          system_state: Database["public"]["Enums"]["system_state"] | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_project_access: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_project: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_coordinator: { Args: { uid: string }; Returns: boolean }
      is_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "STUDENT" | "COORDINATOR" | "DIRECTOR" | "JUROR"
      global_status: "VIGENTE" | "FINALIZADO" | "VENCIDO" | "CANCELADO"
      member_role: "AUTHOR" | "DIRECTOR" | "JUROR"
      official_state:
        | "APROBADA"
        | "APROBADA_CON_MODIFICACIONES"
        | "NO_APROBADA"
        | "PENDIENTE"
      stage_name:
        | "PROPUESTA"
        | "ANTEPROYECTO"
        | "INFORME_FINAL"
        | "SUSTENTACION"
      system_state:
        | "BORRADOR"
        | "RADICADA"
        | "EN_REVISION"
        | "CON_OBSERVACIONES"
        | "CERRADA"
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
      app_role: ["STUDENT", "COORDINATOR", "DIRECTOR", "JUROR"],
      global_status: ["VIGENTE", "FINALIZADO", "VENCIDO", "CANCELADO"],
      member_role: ["AUTHOR", "DIRECTOR", "JUROR"],
      official_state: [
        "APROBADA",
        "APROBADA_CON_MODIFICACIONES",
        "NO_APROBADA",
        "PENDIENTE",
      ],
      stage_name: [
        "PROPUESTA",
        "ANTEPROYECTO",
        "INFORME_FINAL",
        "SUSTENTACION",
      ],
      system_state: [
        "BORRADOR",
        "RADICADA",
        "EN_REVISION",
        "CON_OBSERVACIONES",
        "CERRADA",
      ],
    },
  },
} as const
