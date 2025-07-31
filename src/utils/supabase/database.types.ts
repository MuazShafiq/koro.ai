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
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description: string
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}