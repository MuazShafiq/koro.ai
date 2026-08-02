import { createClient } from './client';
import { Database } from './database.types';
import { isLocalMode } from '@/lib/local-mode';

type StudySession = Database['public']['Tables']['study_sessions']['Row'];
type QuizAttempt = Database['public']['Tables']['quiz_attempts']['Row'];
type DailyProgress = Database['public']['Tables']['daily_progress']['Row'];
type LearningAnalytics = Database['public']['Tables']['learning_analytics']['Row'];

export interface UserAnalytics {
  total_study_time: number;
  total_sessions: number;
  average_session_time: number;
  quiz_accuracy: number;
  subjects_studied: number;
  current_streak: number;
  total_xp: number;
  level: number;
}

export interface WeeklyProgressData {
  date: string;
  study_time: number;
  sessions: number;
  quizzes: number;
  xp: number;
}

export class AnalyticsService {
  private supabase = createClient();

  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_analytics', {
        user_uuid: userId
      });

      if (error) throw error;
      return data as unknown as UserAnalytics;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return {
        total_study_time: 0,
        total_sessions: 0,
        average_session_time: 0,
        quiz_accuracy: 0,
        subjects_studied: 0,
        current_streak: 0,
        total_xp: 0,
        level: 1
      };
    }
  }

  async getWeeklyProgress(userId: string): Promise<WeeklyProgressData[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_weekly_progress', {
        user_uuid: userId
      });

      if (error) throw error;
      return data as unknown as WeeklyProgressData[];
    } catch (error) {
      console.error('Error fetching weekly progress:', error);
      return [];
    }
  }

  async recordStudySession(sessionData: {
    userId: string;
    subjectId?: string;
    topicId?: string;
    durationMinutes: number;
    sessionType: 'study' | 'quiz' | 'practice' | 'review';
    score?: number;
    maxScore?: number;
    completed: boolean;
    notes?: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('study_sessions')
        .insert({
          user_id: sessionData.userId,
          subject_id: sessionData.subjectId,
          topic_id: sessionData.topicId,
          duration_minutes: sessionData.durationMinutes,
          session_type: sessionData.sessionType,
          score: sessionData.score,
          max_score: sessionData.maxScore,
          completed: sessionData.completed,
          notes: sessionData.notes
        });

      if (error) throw error;

      // Update daily progress
      await this.updateDailyProgress(
        sessionData.userId,
        sessionData.durationMinutes,
        sessionData.completed,
        sessionData.sessionType === 'quiz',
        this.calculateXP(sessionData.durationMinutes, sessionData.score, sessionData.maxScore)
      );
    } catch (error) {
      console.error('Error recording study session:', error);
      throw error;
    }
  }

  async recordQuizAttempt(quizData: {
    userId: string;
    subjectId?: string;
    topicId?: string;
    score: number;
    maxScore: number;
    timeTakenSeconds: number;
    questionsCorrect: number;
    questionsTotal: number;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('quiz_attempts')
        .insert({
          user_id: quizData.userId,
          subject_id: quizData.subjectId,
          topic_id: quizData.topicId,
          score: quizData.score,
          max_score: quizData.maxScore,
          time_taken_seconds: quizData.timeTakenSeconds,
          questions_correct: quizData.questionsCorrect,
          questions_total: quizData.questionsTotal
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording quiz attempt:', error);
      throw error;
    }
  }

  async getDailyProgress(userId: string, days: number = 7): Promise<DailyProgress[]> {
    try {
      const { data, error } = await this.supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching daily progress:', error);
      return [];
    }
  }

  async getSubjectProgress(userId: string): Promise<any[]> {
    try {
      if (isLocalMode()) {
        const { data: subjects } = await this.supabase
          .from('subjects')
          .select('*')
          .eq('user_id', userId);
        const subjectIds = (subjects || []).map((subject) => subject.id);
        const { data: topics } = subjectIds.length > 0
          ? await this.supabase.from('topics').select('*').in('subject_id', subjectIds)
          : { data: [] };
        const { data: sessions } = await this.supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', userId);

        return (subjects || []).map((subject) => {
          const subjectTopics = (topics || []).filter(
            (topic) => topic.subject_id === subject.id,
          );
          const subjectSessions = (sessions || []).filter(
            (session) => session.subject_id === subject.id,
          );
          return {
            id: subject.id,
            name: subject.name,
            icon: subject.icon || '📚',
            gradient: subject.gradient || 'from-blue-500 to-purple-600',
            totalTime: subjectSessions.reduce(
              (sum, session) => sum + Number(session.duration_minutes || 0),
              0,
            ),
            completedSessions: subjectSessions.filter((session) => session.completed).length,
            totalSessions: subjectSessions.length,
            completedTopics: subjectTopics.filter((topic) => topic.completed).length,
            totalTopics: subjectTopics.length,
            progress: subjectTopics.length > 0
              ? Math.round(
                  (subjectTopics.filter((topic) => topic.completed).length /
                    subjectTopics.length) * 100,
                )
              : 0,
          };
        });
      }

      const { data, error } = await this.supabase
        .from('study_sessions')
        .select(`
          subject_id,
          subjects(name, icon, gradient),
          duration_minutes,
          completed
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Group by subject and calculate progress
      const subjectMap = new Map();
      data?.forEach(session => {
        const subjectId = session.subject_id;
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            id: subjectId,
            name: (session.subjects as any)?.name || 'Unknown',
            icon: (session.subjects as any)?.icon || '📚',
            gradient: (session.subjects as any)?.gradient || 'from-blue-500 to-purple-600',
            totalTime: 0,
            completedSessions: 0,
            totalSessions: 0
          });
        }
        const subject = subjectMap.get(subjectId);
        subject.totalTime += session.duration_minutes;
        subject.totalSessions += 1;
        if (session.completed) {
          subject.completedSessions += 1;
        }
      });

      return Array.from(subjectMap.values()).map(subject => ({
        ...subject,
        progress: subject.totalSessions > 0 ? Math.round((subject.completedSessions / subject.totalSessions) * 100) : 0
      }));
    } catch (error) {
      console.error('Error fetching subject progress:', error);
      return [];
    }
  }

  private async updateDailyProgress(
    userId: string,
    studyMinutes: number,
    sessionCompleted: boolean,
    quizTaken: boolean,
    xpGained: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('update_daily_progress', {
        user_uuid: userId,
        study_minutes: studyMinutes,
        session_completed: sessionCompleted,
        quiz_taken: quizTaken,
        xp_gained: xpGained
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating daily progress:', error);
    }
  }

  private calculateXP(durationMinutes: number, score?: number, maxScore?: number): number {
    let baseXP = Math.floor(durationMinutes / 5) * 10; // 10 XP per 5 minutes
    
    if (score !== undefined && maxScore !== undefined && maxScore > 0) {
      const accuracy = score / maxScore;
      baseXP += Math.floor(accuracy * 50); // Bonus XP for accuracy
    }
    
    return baseXP;
  }

  async getRecentAchievements(userId: string, limit: number = 5): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('unlocked', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent achievements:', error);
      return [];
    }
  }

  async checkAndUnlockAchievements(userId: string): Promise<void> {
    try {
      const analytics = await this.getUserAnalytics(userId);
      const achievements = [];

      // Check for various achievement conditions
      if (analytics.total_sessions >= 1 && analytics.total_sessions < 5) {
        achievements.push({
          name: 'First Steps',
          description: 'Complete your first study session',
          icon: '🎯',
          user_id: userId,
          unlocked: true
        });
      }

      if (analytics.total_sessions >= 10) {
        achievements.push({
          name: 'Dedicated Learner',
          description: 'Complete 10 study sessions',
          icon: '📚',
          user_id: userId,
          unlocked: true
        });
      }

      if (analytics.current_streak >= 7) {
        achievements.push({
          name: 'Week Warrior',
          description: 'Maintain a 7-day study streak',
          icon: '🔥',
          user_id: userId,
          unlocked: true
        });
      }

      if (analytics.quiz_accuracy >= 90) {
        achievements.push({
          name: 'Quiz Master',
          description: 'Achieve 90% average quiz accuracy',
          icon: '🏆',
          user_id: userId,
          unlocked: true
        });
      }

      // Insert new achievements (ignore conflicts)
      if (achievements.length > 0) {
        const { error } = await this.supabase
          .from('achievements')
          .upsert(achievements, { onConflict: 'name,user_id' });

        if (error) console.error('Error unlocking achievements:', error);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }
}

export const analyticsService = new AnalyticsService();
