export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
          age: number | null
          location: string | null
          school: string | null
          grade_level: string | null
          subjects_of_interest: string[] | null
          learning_goals: string | null
          bio: string | null
          streak: number
          total_sessions: number
          xp: number
          level: number
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          age?: number | null
          location?: string | null
          school?: string | null
          grade_level?: string | null
          subjects_of_interest?: string[] | null
          learning_goals?: string | null
          bio?: string | null
          streak?: number
          total_sessions?: number
          xp?: number
          level?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          age?: number | null
          location?: string | null
          school?: string | null
          grade_level?: string | null
          subjects_of_interest?: string[] | null
          learning_goals?: string | null
          bio?: string | null
          streak?: number
          total_sessions?: number
          xp?: number
          level?: number
        }
      }
      subjects: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          name: string
          description: string | null
          icon: string
          gradient: string
          total_topics: number
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          name: string
          description?: string | null
          icon: string
          gradient: string
          total_topics?: number
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          name?: string
          description?: string | null
          icon?: string
          gradient?: string
          total_topics?: number
          user_id?: string
        }
      }
      topics: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          name: string
          subject_id: string
          completed: boolean
          progress: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          name: string
          subject_id: string
          completed?: boolean
          progress?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          name?: string
          subject_id?: string
          completed?: boolean
          progress?: number
        }
      }
      achievements: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string
          user_id: string
          icon: string | null
          xp_reward: number
          unlocked: boolean
          rarity: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description: string
          user_id: string
          icon?: string | null
          xp_reward?: number
          unlocked?: boolean
          rarity?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string
          user_id?: string
          icon?: string | null
          xp_reward?: number
          unlocked?: boolean
          rarity?: string | null
        }
      }
      study_sessions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          subject_id: string | null
          topic_id: string | null
          duration_minutes: number
          session_type: string
          completed: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          subject_id?: string | null
          topic_id?: string | null
          duration_minutes: number
          session_type: string
          completed?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          subject_id?: string | null
          topic_id?: string | null
          duration_minutes?: number
          session_type?: string
          completed?: boolean
        }
      }
      resources: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          subject_id: string
          topic_id: string
          title: string
          description: string | null
          file_url: string
          content_type: string
          content_text: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          subject_id: string
          topic_id: string
          title: string
          description?: string | null
          file_url: string
          content_type: string
          content_text?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          subject_id?: string
          topic_id?: string
          title?: string
          description?: string | null
          file_url?: string
          content_type?: string
          content_text?: string | null
        }
      }
      lessons: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          user_id: string
          subject_id: string
          topic_id: string
          lesson_content: string
          audio_url: string | null
          duration_minutes: number
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          user_id: string
          subject_id: string
          topic_id: string
          lesson_content: string
          audio_url?: string | null
          duration_minutes?: number
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          user_id?: string
          subject_id?: string
          topic_id?: string
          lesson_content?: string
          audio_url?: string | null
          duration_minutes?: number
          status?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_resources_by_topic: {
        Args: {
          subject_uuid: string
          topic_uuid: string
        }
        Returns: {
          id: string
          subject_id: string
          topic_id: string
          title: string
          description: string | null
          file_url: string
          content_type: string
          content_text: string | null
          created_at: string
          updated_at: string | null
        }[]
      }
      create_lesson: {
        Args: {
          user_uuid: string
          subject_uuid: string
          topic_uuid: string
          lesson_text: string
          audio_file_url?: string
        }
        Returns: string
      }
      update_lesson_audio: {
        Args: {
          lesson_uuid: string
          audio_file_url: string
        }
        Returns: void
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