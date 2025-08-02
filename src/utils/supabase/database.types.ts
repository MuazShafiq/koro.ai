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
      quiz_attempts: {
        Row: {
          id: string
          created_at: string
          user_id: string
          subject_id: string | null
          topic_id: string | null
          score: number
          total_questions: number
          correct_answers: number
          time_taken_minutes: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          subject_id?: string | null
          topic_id?: string | null
          score: number
          total_questions: number
          correct_answers: number
          time_taken_minutes: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          subject_id?: string | null
          topic_id?: string | null
          score?: number
          total_questions?: number
          correct_answers?: number
          time_taken_minutes?: number
        }
      }
      daily_progress: {
        Row: {
          id: string
          date: string
          user_id: string
          study_time_minutes: number
          sessions_completed: number
          topics_completed: number
          quizzes_taken: number
          average_score: number
          xp_earned: number
        }
        Insert: {
          id?: string
          date: string
          user_id: string
          study_time_minutes?: number
          sessions_completed?: number
          topics_completed?: number
          quizzes_taken?: number
          average_score?: number
          xp_earned?: number
        }
        Update: {
          id?: string
          date?: string
          user_id?: string
          study_time_minutes?: number
          sessions_completed?: number
          topics_completed?: number
          quizzes_taken?: number
          average_score?: number
          xp_earned?: number
        }
      }
      learning_analytics: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          user_id: string
          total_study_time: number
          total_sessions: number
          average_session_duration: number
          total_quizzes: number
          average_quiz_score: number
          current_streak: number
          longest_streak: number
          total_xp: number
          level: number
          subjects_studied: number
          topics_completed: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          user_id: string
          total_study_time?: number
          total_sessions?: number
          average_session_duration?: number
          total_quizzes?: number
          average_quiz_score?: number
          current_streak?: number
          longest_streak?: number
          total_xp?: number
          level?: number
          subjects_studied?: number
          topics_completed?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          user_id?: string
          total_study_time?: number
          total_sessions?: number
          average_session_duration?: number
          total_quizzes?: number
          average_quiz_score?: number
          current_streak?: number
          longest_streak?: number
          total_xp?: number
          level?: number
          subjects_studied?: number
          topics_completed?: number
        }
      }
      user_preferences: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          user_id: string
          theme: string
          notifications_enabled: boolean
          study_reminders: boolean
          daily_goal_minutes: number
          preferred_study_time: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          user_id: string
          theme?: string
          notifications_enabled?: boolean
          study_reminders?: boolean
          daily_goal_minutes?: number
          preferred_study_time?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          user_id?: string
          theme?: string
          notifications_enabled?: boolean
          study_reminders?: boolean
          daily_goal_minutes?: number
          preferred_study_time?: string | null
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