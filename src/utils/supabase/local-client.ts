/* eslint-disable @typescript-eslint/no-explicit-any */
import { LOCAL_USER_ID, localProfile, localSubjects, localTopics } from '@/lib/local-demo-data';

type Row = Record<string, any>;
type Operation = 'select' | 'insert' | 'upsert' | 'update' | 'delete';

interface LocalState {
  profiles: Row[];
  subjects: Row[];
  topics: Row[];
  achievements: Row[];
  study_sessions: Row[];
  daily_progress: Row[];
  quiz_attempts: Row[];
}

const storageKey = 'koro-local-database-v1';

function createInitialState(): LocalState {
  return {
    profiles: [{ ...localProfile }],
    subjects: localSubjects.map((item) => ({ ...item })),
    topics: localTopics.map((item) => ({ ...item })),
    achievements: [
      {
        id: 'local-achievement-1',
        created_at: new Date().toISOString(),
        name: 'Local Pioneer',
        description: 'Started learning without a paid cloud service.',
        user_id: LOCAL_USER_ID,
        icon: '🚀',
        xp_reward: 100,
        unlocked: true,
        rarity: 'rare',
      },
    ],
    study_sessions: [],
    daily_progress: [],
    quiz_attempts: [],
  };
}

function loadState(): LocalState {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // A private browser context can deny localStorage. Memory fallback still works.
    }
  }
  return createInitialState();
}

const state = loadState();

function saveState() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Persistence is optional in local demo mode.
    }
  }
}

class LocalQuery implements PromiseLike<{ data: any; error: any }> {
  private operation: Operation = 'select';
  private values: Row | Row[] | null = null;
  private filters: Array<[string, any]> = [];
  private inFilters: Array<[string, any[]]> = [];
  private selectedColumns = '*';
  private singleRow = false;
  private ordering: { column: string; ascending: boolean } | null = null;
  private minimums: Array<[string, any]> = [];
  private maximums: Array<[string, any]> = [];
  private limitCount: number | null = null;

  constructor(private table: keyof LocalState) {}

  select(columns = '*') {
    this.selectedColumns = columns;
    return this;
  }

  insert(values: Row | Row[]) {
    this.operation = 'insert';
    this.values = values;
    return this;
  }

  upsert(values: Row | Row[], _options?: { onConflict?: string }) {
    this.operation = 'upsert';
    this.values = values;
    return this;
  }

  update(values: Row) {
    this.operation = 'update';
    this.values = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push([column, value]);
    return this;
  }

  in(column: string, values: any[]) {
    this.inFilters.push([column, values]);
    return this;
  }

  gte(column: string, value: any) {
    this.minimums.push([column, value]);
    return this;
  }

  lte(column: string, value: any) {
    this.maximums.push([column, value]);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.ordering = { column, ascending: options?.ascending !== false };
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  maybeSingle() {
    this.singleRow = true;
    return this;
  }

  private matches(row: Row) {
    return (
      this.filters.every(([column, value]) => row[column] === value) &&
      this.inFilters.every(([column, values]) => values.includes(row[column])) &&
      this.minimums.every(([column, value]) => row[column] >= value) &&
      this.maximums.every(([column, value]) => row[column] <= value)
    );
  }

  private execute() {
    const rows = state[this.table] as Row[];

    if (this.operation === 'insert' || this.operation === 'upsert') {
      const additions = (Array.isArray(this.values) ? this.values : [this.values]).filter(Boolean) as Row[];
      const inserted = additions.map((item) => {
        if (this.operation === 'upsert') {
          const existing = rows.find((row) =>
            (item.id && row.id === item.id) ||
            (item.name && item.user_id && row.name === item.name && row.user_id === item.user_id));
          if (existing) {
            Object.assign(existing, item, { updated_at: new Date().toISOString() });
            return existing;
          }
        }
        const created = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || null,
          ...item,
        };
        rows.push(created);
        return created;
      });
      saveState();
      return { data: this.singleRow ? inserted[0] : inserted, error: null };
    }

    if (this.operation === 'update') {
      const updated: Row[] = [];
      rows.forEach((row) => {
        if (this.matches(row)) {
          Object.assign(row, this.values, { updated_at: new Date().toISOString() });
          updated.push(row);
        }
      });
      saveState();
      return { data: this.singleRow ? updated[0] || null : updated, error: null };
    }

    if (this.operation === 'delete') {
      const removed = rows.filter((row) => this.matches(row));
      state[this.table] = rows.filter((row) => !this.matches(row)) as any;
      saveState();
      return { data: removed, error: null };
    }

    let result = rows.filter((row) => this.matches(row)).map((row) => ({ ...row }));
    if (this.ordering) {
      const { column, ascending } = this.ordering;
      result.sort((a, b) => {
        const comparison = String(a[column] ?? '').localeCompare(String(b[column] ?? ''));
        return ascending ? comparison : -comparison;
      });
    }

    if (this.table === 'subjects' && this.selectedColumns.includes('topics(')) {
      result = result.map((subject) => ({
        ...subject,
        topics: state.topics.filter((topic) => topic.subject_id === subject.id),
      }));
    }

    if (this.table === 'study_sessions' && this.selectedColumns.includes('subjects(')) {
      result = result.map((session) => ({
        ...session,
        subjects: state.subjects.find((subject) => subject.id === session.subject_id) || null,
      }));
    }

    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    return {
      data: this.singleRow ? result[0] || null : result,
      error: this.singleRow && result.length === 0 ? { message: 'Row not found' } : null,
    };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

const localUser = {
  id: LOCAL_USER_ID,
  email: 'learner@local.koro',
  user_metadata: { full_name: localProfile.full_name },
};

export function createLocalSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: { user: localUser, access_token: 'local-demo-token' } },
        error: null,
      }),
      getUser: async () => ({ data: { user: localUser }, error: null }),
      signInWithPassword: async () => ({
        data: { user: localUser, session: { user: localUser, access_token: 'local-demo-token' } },
        error: null,
      }),
      signUp: async () => ({
        data: { user: localUser, session: { user: localUser, access_token: 'local-demo-token' } },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      exchangeCodeForSession: async () => ({
        data: { user: localUser, session: { user: localUser, access_token: 'local-demo-token' } },
        error: null,
      }),
    },
    from(table: keyof LocalState) {
      if (!(table in state)) {
        (state as any)[table] = [];
      }
      return new LocalQuery(table);
    },
    rpc: async (name: string, args?: Row) => {
      if (name === 'get_resources_by_topic') {
        return {
          data: [
            {
              id: `local-resource-${args?.topic_uuid || 'general'}`,
              title: 'Local lesson notes',
              content_text: 'Seeded local content for a zero-cost tutoring session.',
              subject_id: args?.subject_uuid,
              topic_id: args?.topic_uuid,
            },
          ],
          error: null,
        };
      }
      if (name === 'get_user_analytics') {
        const profile = state.profiles.find((item) => item.id === args?.user_uuid) || state.profiles[0];
        const userSessions = state.study_sessions.filter(
          (session) => session.user_id === args?.user_uuid,
        );
        const quizzes = state.quiz_attempts.filter(
          (quiz) => quiz.user_id === args?.user_uuid,
        );
        const totalMinutes = userSessions.reduce(
          (sum, session) => sum + Number(session.duration_minutes || 0),
          0,
        );
        const quizAccuracy = quizzes.length > 0
          ? Math.round(quizzes.reduce(
              (sum, quiz) => sum + (Number(quiz.score || 0) / Math.max(1, Number(quiz.max_score || 1))) * 100,
              0,
            ) / quizzes.length)
          : 0;
        const activeDates = new Set(
          state.daily_progress
            .filter((day) => day.user_id === args?.user_uuid && Number(day.study_time || 0) > 0)
            .map((day) => day.date),
        );
        let currentStreak = 0;
        for (let daysAgo = 0; daysAgo < 365; daysAgo += 1) {
          const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
          if (!activeDates.has(date)) break;
          currentStreak += 1;
        }
        return {
          data: {
            total_study_time: Math.round((totalMinutes / 60) * 10) / 10,
            total_sessions: userSessions.length,
            average_session_time: userSessions.length
              ? Math.round(totalMinutes / userSessions.length)
              : 0,
            quiz_accuracy: quizAccuracy,
            subjects_studied: new Set(userSessions.map((session) => session.subject_id)).size,
            current_streak: currentStreak,
            total_xp: Number(profile?.xp || 0),
            level: Number(profile?.level || 1),
          },
          error: null,
        };
      }
      if (name === 'get_weekly_progress') {
        return {
          data: Array.from({ length: 7 }, (_, index) => {
            const date = new Date(Date.now() - (6 - index) * 86400000).toISOString().slice(0, 10);
            const day = state.daily_progress.find(
              (item) => item.user_id === args?.user_uuid && item.date === date,
            );
            return {
              date,
              study_time: Number(day?.study_time || 0),
              sessions: Number(day?.sessions || 0),
              quizzes: Number(day?.quizzes || 0),
              xp: Number(day?.xp || 0),
            };
          }),
          error: null,
        };
      }
      if (name === 'update_daily_progress') {
        const date = new Date().toISOString().slice(0, 10);
        let day = state.daily_progress.find(
          (item) => item.user_id === args?.user_uuid && item.date === date,
        );
        if (!day) {
          day = {
            id: crypto.randomUUID(),
            user_id: args?.user_uuid,
            date,
            study_time: 0,
            sessions: 0,
            quizzes: 0,
            xp: 0,
            created_at: new Date().toISOString(),
          };
          state.daily_progress.push(day);
        }
        day.study_time += Number(args?.study_minutes || 0);
        day.sessions += args?.session_completed ? 1 : 0;
        day.quizzes += args?.quiz_taken ? 1 : 0;
        day.xp += Number(args?.xp_gained || 0);
        saveState();
        return { data: day, error: null };
      }
      return { data: null, error: null };
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'local-only' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
}
