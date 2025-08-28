// Core application types

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  gradient: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface AssessmentQuestion {
  id?: string | number;
  question: string | { question: string; type?: string };
  purpose?: string;
  type?: string;
  audioUrl?: string;
  order?: number;
}

export interface BlackboardItem {
  type: 'text' | 'equation' | 'diagram' | 'step-by-step' | 'definition' | 'example';
  label: string;
  content?: string;
  description?: string;
  steps?: string[];
}

export interface BlackboardEntry {
  id: string;
  timestamp: Date;
  items: BlackboardItem[];
}

export interface SessionData {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id?: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  preview: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// TTS Service types
export interface TTSError {
  status: number;
  statusText: string;
  message?: string;
}

export interface TTSValidationResult {
  isValid: boolean;
  error?: string;
}