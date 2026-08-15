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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          unlocked: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          unlocked?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          unlocked?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_progress: {
        Row: {
          date: string
          id: string
          quizzes_taken: number
          sessions_completed: number
          streak_maintained: boolean
          study_time_minutes: number
          user_id: string
          xp_gained: number
        }
        Insert: {
          date?: string
          id?: string
          quizzes_taken?: number
          sessions_completed?: number
          streak_maintained?: boolean
          study_time_minutes?: number
          user_id: string
          xp_gained?: number
        }
        Update: {
          date?: string
          id?: string
          quizzes_taken?: number
          sessions_completed?: number
          streak_maintained?: boolean
          study_time_minutes?: number
          user_id?: string
          xp_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_analytics: {
        Row: {
          created_at: string
          date: string
          id: string
          metric_type: string
          metric_value: number
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          metric_type: string
          metric_value: number
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          metric_type?: string
          metric_value?: number
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_analytics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_analytics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_chunks: {
        Row: {
          audio_url: string | null
          chunk_index: number
          chunk_type: string
          created_at: string
          delivered_at: string | null
          id: string
          interactions_count: number
          last_interaction_at: string | null
          script_content: string
          session_id: string
          student_interaction: Json
        }
        Insert: {
          audio_url?: string | null
          chunk_index: number
          chunk_type?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          interactions_count?: number
          last_interaction_at?: string | null
          script_content: string
          session_id: string
          student_interaction?: Json
        }
        Update: {
          audio_url?: string | null
          chunk_index?: number
          chunk_type?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          interactions_count?: number
          last_interaction_at?: string | null
          script_content?: string
          session_id?: string
          student_interaction?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lesson_chunks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          assessment_score: number | null
          concept_id: string | null
          concept_name: string
          created_at: string
          delivery_status: string
          delivery_timestamp: string | null
          equation_references: Json
          id: string
          notes: string | null
          resource_section: string | null
          session_id: string
          student_engagement_score: number | null
          understanding_verified: boolean
          updated_at: string
        }
        Insert: {
          assessment_score?: number | null
          concept_id?: string | null
          concept_name: string
          created_at?: string
          delivery_status?: string
          delivery_timestamp?: string | null
          equation_references?: Json
          id?: string
          notes?: string | null
          resource_section?: string | null
          session_id: string
          student_engagement_score?: number | null
          understanding_verified?: boolean
          updated_at?: string
        }
        Update: {
          assessment_score?: number | null
          concept_id?: string | null
          concept_name?: string
          created_at?: string
          delivery_status?: string
          delivery_timestamp?: string | null
          equation_references?: Json
          id?: string
          notes?: string | null
          resource_section?: string | null
          session_id?: string
          student_engagement_score?: number | null
          understanding_verified?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sessions: {
        Row: {
          assessment_questions: Json
          completion_validated_at: string | null
          concepts_covered: Json
          content_delivered: Json
          created_at: string
          current_chunk_index: number
          current_phase: string
          equations_covered: Json
          id: string
          last_content_position: Json
          lesson_plan: Json | null
          progress_percentage: number
          resource_coverage: Json
          status: string
          student_responses: Json
          subject_id: string
          topic_id: string | null
          updated_at: string
          user_id: string
          welcome_audio_url: string | null
        }
        Insert: {
          assessment_questions?: Json
          completion_validated_at?: string | null
          concepts_covered?: Json
          content_delivered?: Json
          created_at?: string
          current_chunk_index?: number
          current_phase?: string
          equations_covered?: Json
          id?: string
          last_content_position?: Json
          lesson_plan?: Json | null
          progress_percentage?: number
          resource_coverage?: Json
          status?: string
          student_responses?: Json
          subject_id: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
          welcome_audio_url?: string | null
        }
        Update: {
          assessment_questions?: Json
          completion_validated_at?: string | null
          concepts_covered?: Json
          content_delivered?: Json
          created_at?: string
          current_chunk_index?: number
          current_phase?: string
          equations_covered?: Json
          id?: string
          last_content_position?: Json
          lesson_plan?: Json | null
          progress_percentage?: number
          resource_coverage?: Json
          status?: string
          student_responses?: Json
          subject_id?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
          welcome_audio_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_minutes: number
          id: string
          lesson_content: string
          status: string
          subject_id: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          lesson_content: string
          status?: string
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          lesson_content?: string
          status?: string
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      master_lesson_plans: {
        Row: {
          assessment_criteria: Json
          chapter_title: string | null
          chunk_structure: Json
          chunks: Json
          comprehensive_plan: Json
          concept_hierarchy: Json
          content_coverage_map: Json
          content_sections: Json
          core_concepts: Json
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string
          estimated_duration_minutes: number
          id: string
          is_active: boolean
          key_concepts: Json
          key_equations: Json
          knowledge_checkpoints: Json
          learning_objectives: Json
          practical_applications: Json
          prerequisite_concepts: Json
          recommended_chunk_count: number
          resource_references: Json
          subject_id: string
          title: string
          topic_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          assessment_criteria?: Json
          chapter_title?: string | null
          chunk_structure?: Json
          chunks?: Json
          comprehensive_plan?: Json
          concept_hierarchy?: Json
          content_coverage_map?: Json
          content_sections?: Json
          core_concepts?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          estimated_duration_minutes?: number
          id?: string
          is_active?: boolean
          key_concepts?: Json
          key_equations?: Json
          knowledge_checkpoints?: Json
          learning_objectives?: Json
          practical_applications?: Json
          prerequisite_concepts?: Json
          recommended_chunk_count?: number
          resource_references?: Json
          subject_id: string
          title: string
          topic_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          assessment_criteria?: Json
          chapter_title?: string | null
          chunk_structure?: Json
          chunks?: Json
          comprehensive_plan?: Json
          concept_hierarchy?: Json
          content_coverage_map?: Json
          content_sections?: Json
          core_concepts?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          estimated_duration_minutes?: number
          id?: string
          is_active?: boolean
          key_concepts?: Json
          key_equations?: Json
          knowledge_checkpoints?: Json
          learning_objectives?: Json
          practical_applications?: Json
          prerequisite_concepts?: Json
          recommended_chunk_count?: number
          resource_references?: Json
          subject_id?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "master_lesson_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_lesson_plans_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          grade_level: string | null
          id: string
          learning_goals: string | null
          level: number
          location: string | null
          school: string | null
          streak: number
          subjects_of_interest: string[]
          total_sessions: number
          updated_at: string
          username: string | null
          website: string | null
          xp: number
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          grade_level?: string | null
          id: string
          learning_goals?: string | null
          level?: number
          location?: string | null
          school?: string | null
          streak?: number
          subjects_of_interest?: string[]
          total_sessions?: number
          updated_at?: string
          username?: string | null
          website?: string | null
          xp?: number
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          grade_level?: string | null
          id?: string
          learning_goals?: string | null
          level?: number
          location?: string | null
          school?: string | null
          streak?: number
          subjects_of_interest?: string[]
          total_sessions?: number
          updated_at?: string
          username?: string | null
          website?: string | null
          xp?: number
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          max_score: number
          questions_correct: number
          questions_total: number
          score: number
          subject_id: string | null
          time_taken_seconds: number
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_score: number
          questions_correct?: number
          questions_total?: number
          score: number
          subject_id?: string | null
          time_taken_seconds?: number
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_score?: number
          questions_correct?: number
          questions_total?: number
          score?: number
          subject_id?: string | null
          time_taken_seconds?: number
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          content_text: string | null
          content_type: string
          created_at: string
          description: string | null
          file_url: string
          id: string
          subject_id: string
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_type: string
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          subject_id: string
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          subject_id?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assessments: {
        Row: {
          ai_evaluation: Json | null
          ai_response: string | null
          assessment_type: string
          audio_url: string | null
          created_at: string
          id: string
          interaction_type: string | null
          lesson_adaptation: string | null
          question: string
          resources_used: Json
          session_id: string
          student_answer: string | null
          user_id: string | null
        }
        Insert: {
          ai_evaluation?: Json | null
          ai_response?: string | null
          assessment_type?: string
          audio_url?: string | null
          created_at?: string
          id?: string
          interaction_type?: string | null
          lesson_adaptation?: string | null
          question: string
          resources_used?: Json
          session_id: string
          student_answer?: string | null
          user_id?: string | null
        }
        Update: {
          ai_evaluation?: Json | null
          ai_response?: string | null
          assessment_type?: string
          audio_url?: string | null
          created_at?: string
          id?: string
          interaction_type?: string | null
          lesson_adaptation?: string | null
          question?: string
          resources_used?: Json
          session_id?: string
          student_answer?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_minutes: number
          id: string
          max_score: number | null
          notes: string | null
          score: number | null
          session_type: string
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          max_score?: number | null
          notes?: string | null
          score?: number | null
          session_type?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          max_score?: number | null
          notes?: string | null
          score?: number | null
          session_type?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          gradient: string
          icon: string
          id: string
          name: string
          total_topics: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gradient?: string
          icon?: string
          id?: string
          name: string
          total_topics?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gradient?: string
          icon?: string
          id?: string
          name?: string
          total_topics?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          progress: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          progress?: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          progress?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          daily_goal_minutes: number
          id: string
          notifications_enabled: boolean
          preferred_study_time: string | null
          study_reminders: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_goal_minutes?: number
          id?: string
          notifications_enabled?: boolean
          preferred_study_time?: string | null
          study_reminders?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_goal_minutes?: number
          id?: string
          notifications_enabled?: boolean
          preferred_study_time?: string | null
          study_reminders?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_concept_progress: {
        Args: {
          concept_text: string
          equation_refs?: Json
          resource_section_text?: string
          session_uuid: string
        }
        Returns: string
      }
      check_session_completion_readiness: {
        Args: {
          min_concepts_threshold?: number
          min_equations_threshold?: number
          min_resource_sections?: number
          session_uuid: string
        }
        Returns: {
          completion_percentage: number
          concepts_threshold_met: boolean
          equations_threshold_met: boolean
          missing_requirements: string[]
          ready_for_completion: boolean
          resource_threshold_met: boolean
        }[]
      }
      create_lesson: {
        Args: {
          audio_file_url?: string
          lesson_text: string
          subject_uuid: string
          topic_uuid: string
          user_uuid: string
        }
        Returns: string
      }
      get_or_create_master_lesson_plan: {
        Args: { subject_uuid: string; topic_uuid: string }
        Returns: string
      }
      get_resources_by_topic: {
        Args: { subject_uuid: string; topic_uuid: string }
        Returns: {
          content_text: string
          content_type: string
          description: string
          file_url: string
          id: string
          title: string
        }[]
      }
      get_session_progress_summary: {
        Args: { session_uuid: string }
        Returns: {
          avg_engagement_score: number
          delivered_concepts: number
          equations_count: number
          pending_concepts: number
          progress_percentage: number
          resource_sections_covered: number
          total_concepts: number
        }[]
      }
      get_user_analytics: { Args: { user_uuid: string }; Returns: Json }
      get_weekly_progress: { Args: { user_uuid: string }; Returns: Json }
      initialize_user_profile: {
        Args: { profile_data?: Json }
        Returns: undefined
      }
      is_session_owner: { Args: { session_uuid: string }; Returns: boolean }
      is_subject_owner: { Args: { subject_uuid: string }; Returns: boolean }
      mark_concept_delivered: {
        Args: { engagement_score?: number; progress_uuid: string }
        Returns: undefined
      }
      update_daily_progress: {
        Args: {
          quiz_taken: boolean
          session_completed: boolean
          study_minutes: number
          user_uuid: string
          xp_gained: number
        }
        Returns: undefined
      }
      update_lesson_audio: {
        Args: { audio_file_url: string; lesson_uuid: string }
        Returns: undefined
      }
      update_session_progress: {
        Args: { session_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
