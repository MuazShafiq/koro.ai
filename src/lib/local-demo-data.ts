import { Database } from '@/utils/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];

const now = '2026-01-01T00:00:00.000Z';

export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';

export const localProfile: Profile = {
  id: LOCAL_USER_ID,
  created_at: now,
  updated_at: now,
  username: 'local-learner',
  full_name: 'Local Learner',
  avatar_url: null,
  website: null,
  age: null,
  location: null,
  school: null,
  grade_level: 'Self-paced',
  subjects_of_interest: ['Physics', 'Mathematics', 'Computer Science'],
  learning_goals: 'Build strong fundamentals through short, interactive lessons.',
  bio: 'Running Koro.ai locally with no paid services.',
  streak: 4,
  total_sessions: 12,
  xp: 860,
  level: 3,
};

export const localSubjects: Subject[] = [
  {
    id: 'local-physics',
    created_at: now,
    updated_at: now,
    name: 'Physics',
    description: 'Mechanics, energy, waves, and the rules that shape our world.',
    icon: '⚛️',
    gradient: 'bg-gradient-to-br from-emerald-400 to-green-600',
    total_topics: 3,
    user_id: LOCAL_USER_ID,
  },
  {
    id: 'local-mathematics',
    created_at: now,
    updated_at: now,
    name: 'Mathematics',
    description: 'Algebra, functions, geometry, and problem-solving.',
    icon: '📐',
    gradient: 'bg-gradient-to-br from-sky-400 to-blue-600',
    total_topics: 3,
    user_id: LOCAL_USER_ID,
  },
  {
    id: 'local-computer-science',
    created_at: now,
    updated_at: now,
    name: 'Computer Science',
    description: 'Programming, algorithms, and computational thinking.',
    icon: '💻',
    gradient: 'bg-gradient-to-br from-indigo-400 to-purple-600',
    total_topics: 3,
    user_id: LOCAL_USER_ID,
  },
];

export const localTopics: Topic[] = [
  {
    id: 'local-kinematics',
    created_at: now,
    updated_at: now,
    name: 'Kinematics',
    description: null,
    order_index: 0,
    subject_id: 'local-physics',
    completed: false,
    progress: 35,
  },
  {
    id: 'local-newtons-laws',
    created_at: now,
    updated_at: now,
    name: "Newton's Laws",
    description: null,
    order_index: 1,
    subject_id: 'local-physics',
    completed: false,
    progress: 10,
  },
  {
    id: 'local-energy',
    created_at: now,
    updated_at: now,
    name: 'Work and Energy',
    description: null,
    order_index: 2,
    subject_id: 'local-physics',
    completed: true,
    progress: 100,
  },
  {
    id: 'local-linear-equations',
    created_at: now,
    updated_at: now,
    name: 'Linear Equations',
    description: null,
    order_index: 0,
    subject_id: 'local-mathematics',
    completed: true,
    progress: 100,
  },
  {
    id: 'local-functions',
    created_at: now,
    updated_at: now,
    name: 'Functions and Graphs',
    description: null,
    order_index: 1,
    subject_id: 'local-mathematics',
    completed: false,
    progress: 45,
  },
  {
    id: 'local-calculus',
    created_at: now,
    updated_at: now,
    name: 'Calculus Foundations',
    description: null,
    order_index: 2,
    subject_id: 'local-mathematics',
    completed: false,
    progress: 0,
  },
  {
    id: 'local-programming',
    created_at: now,
    updated_at: now,
    name: 'Programming Fundamentals',
    description: null,
    order_index: 0,
    subject_id: 'local-computer-science',
    completed: true,
    progress: 100,
  },
  {
    id: 'local-algorithms',
    created_at: now,
    updated_at: now,
    name: 'Algorithms',
    description: null,
    order_index: 1,
    subject_id: 'local-computer-science',
    completed: false,
    progress: 55,
  },
  {
    id: 'local-data-structures',
    created_at: now,
    updated_at: now,
    name: 'Data Structures',
    description: null,
    order_index: 2,
    subject_id: 'local-computer-science',
    completed: false,
    progress: 20,
  },
];

export function findLocalSubject(subjectId: string) {
  return localSubjects.find((subject) => subject.id === subjectId);
}

export function findLocalTopic(topicId?: string | null) {
  return topicId ? localTopics.find((topic) => topic.id === topicId) : undefined;
}
