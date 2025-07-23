import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for the store
export interface Subject {
  id: string;
  name: string;
  icon: string;
  progress: number;
  totalTopics: number;
  completedTopics: number;
  lastSession?: Date;
  nextTopic?: string;
  gradient: string;
}

export interface VoiceState {
  status: 'idle' | 'listening' | 'processing' | 'responding';
  isRecording: boolean;
  transcript: string;
  response: string;
  waveformData: number[];
}

export interface UserProgress {
  streak: number;
  totalSessions: number;
  weeklyEngagement: number[];
  masteryMatrix: Record<string, number>;
  achievements: string[];
  xp: number;
  level: number;
  weeklyGoal: {
    current: number;
    target: number;
  };
}

export interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'quantum' | 'biohazard' | 'cosmos';
  reducedMotion: boolean;
  
  // User data
  userProgress: UserProgress;
  subjects: Subject[];
  
  // Voice assistant
  voiceState: VoiceState;
  
  // UI state
  sidebarExpanded: boolean;
  currentSubject: string | null;
  currentTopic: string | null;
  
  // Actions
  setTheme: (theme: AppState['theme']) => void;
  toggleReducedMotion: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setCurrentSubject: (subjectId: string | null) => void;
  setCurrentTopic: (topicId: string | null) => void;
  updateSubjectProgress: (subjectId: string, progress: Partial<Subject>) => void;
  updateVoiceState: (state: Partial<VoiceState>) => void;
  updateUserProgress: (progress: Partial<UserProgress>) => void;
  addAchievement: (achievement: string) => void;
  incrementStreak: () => void;
}

// Initial data
const initialSubjects: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: '📊',
    progress: 75,
    totalTopics: 12,
    completedTopics: 9,
    lastSession: new Date(Date.now() - 86400000), // Yesterday
    nextTopic: 'Calculus Integration',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: '⚛️',
    progress: 60,
    totalTopics: 15,
    completedTopics: 9,
    lastSession: new Date(Date.now() - 172800000), // 2 days ago
    nextTopic: 'Quantum Mechanics',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: '🧪',
    progress: 45,
    totalTopics: 10,
    completedTopics: 4,
    lastSession: new Date(Date.now() - 259200000), // 3 days ago
    nextTopic: 'Organic Compounds',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: '🧬',
    progress: 80,
    totalTopics: 8,
    completedTopics: 6,
    lastSession: new Date(),
    nextTopic: 'DNA Replication',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'computer-science',
    name: 'Computer Science',
    icon: '💻',
    progress: 90,
    totalTopics: 20,
    completedTopics: 18,
    lastSession: new Date(),
    nextTopic: 'Machine Learning',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'english',
    name: 'English',
    icon: '📚',
    progress: 55,
    totalTopics: 12,
    completedTopics: 6,
    lastSession: new Date(Date.now() - 86400000),
    nextTopic: 'Literary Analysis',
    gradient: 'from-orange-500 to-red-500'
  }
];

const initialUserProgress: UserProgress = {
  streak: 12,
  totalSessions: 156,
  weeklyEngagement: [4, 6, 5, 7, 8, 6, 5], // Last 7 days
  masteryMatrix: {
    'mathematics': 85,
    'physics': 70,
    'chemistry': 60,
    'biology': 90,
    'computer-science': 95,
    'english': 65
  },
  achievements: ['First Steps', 'Week Warrior', 'Knowledge Seeker', 'Streak Master'],
  xp: 12450,
  level: 8,
  weeklyGoal: {
    current: 18,
    target: 25
  }
};

const initialVoiceState: VoiceState = {
  status: 'idle',
  isRecording: false,
  transcript: '',
  response: '',
  waveformData: []
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'dark',
      reducedMotion: false,
      userProgress: initialUserProgress,
      subjects: initialSubjects,
      voiceState: initialVoiceState,
      sidebarExpanded: false,
      currentSubject: null,
      currentTopic: null,
      
      // Actions
      setTheme: (theme) => set({ theme }),
      
      toggleReducedMotion: () => set((state) => ({ 
        reducedMotion: !state.reducedMotion 
      })),
      
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
      
      setCurrentSubject: (subjectId) => set({ currentSubject: subjectId }),
      
      setCurrentTopic: (topicId) => set({ currentTopic: topicId }),
      
      updateSubjectProgress: (subjectId, progress) => set((state) => ({
        subjects: state.subjects.map(subject => 
          subject.id === subjectId 
            ? { ...subject, ...progress }
            : subject
        )
      })),
      
      updateVoiceState: (newState) => set((state) => ({
        voiceState: { ...state.voiceState, ...newState }
      })),
      
      updateUserProgress: (progress) => set((state) => ({
        userProgress: { ...state.userProgress, ...progress }
      })),
      
      addAchievement: (achievement) => set((state) => ({
        userProgress: {
          ...state.userProgress,
          achievements: [...state.userProgress.achievements, achievement]
        }
      })),
      
      incrementStreak: () => set((state) => ({
        userProgress: {
          ...state.userProgress,
          streak: state.userProgress.streak + 1
        }
      }))
    }),
    {
      name: 'koro-ai-storage',
      partialize: (state) => ({
        theme: state.theme,
        reducedMotion: state.reducedMotion,
        userProgress: state.userProgress,
        subjects: state.subjects,
        sidebarExpanded: state.sidebarExpanded
      })
    }
  ));

// Export alias for backward compatibility
export const useStore = useAppStore;