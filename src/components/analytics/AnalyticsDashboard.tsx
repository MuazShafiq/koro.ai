'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  Brain,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { useSupabase } from '../../utils/supabase/provider';
import { Database } from '../../utils/supabase/database.types';
import { analyticsService, UserAnalytics, WeeklyProgressData } from '../../utils/supabase/analytics';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];
type Achievement = Database['public']['Tables']['achievements']['Row'];

// Mock data for charts (these would be calculated from real data in production)
const monthlyTrends = [
  { month: 'Jan', score: 78, hours: 45 },
  { month: 'Feb', score: 82, hours: 52 },
  { month: 'Mar', score: 85, hours: 48 },
  { month: 'Apr', score: 88, hours: 61 },
  { month: 'May', score: 91, hours: 58 },
  { month: 'Jun', score: 87, hours: 64 },
];

const skillsRadar = [
  { skill: 'Problem Solving', current: 85, target: 90 },
  { skill: 'Critical Thinking', current: 78, target: 85 },
  { skill: 'Communication', current: 92, target: 95 },
  { skill: 'Creativity', current: 74, target: 80 },
  { skill: 'Leadership', current: 81, target: 85 },
];

type FormattedAchievement = {
  id: string | number;
  title: string;
  description: string;
  icon: string;
  date: string;
  rarity: 'gold' | 'silver' | 'bronze';
};

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, trend }) => {
  return (
    <Card className="glass border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium",
                trend === 'up' ? 'text-green-500' : 'text-red-500'
              )}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-electric-blue to-violet flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className }) => {
  const { userProgress } = useStore();
  const { supabase } = useSupabase();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressData[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<any[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);

      // Fetch user subjects
      const { data: userSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id);
      
      setSubjects(userSubjects || []);

      // Fetch user topics
      const { data: userTopics } = await supabase
        .from('topics')
        .select('*')
        .in('subject_id', (userSubjects || []).map(s => s.id));
      
      setTopics(userTopics || []);

      // Fetch user achievements
      const { data: userAchievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('unlocked', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setAchievements(userAchievements || []);

      // Fetch real analytics data
      const analytics = await analyticsService.getUserAnalytics(user.id);
      setUserAnalytics(analytics);

      // Fetch weekly progress data
      const weeklyData = await analyticsService.getWeeklyProgress(user.id);
      setWeeklyProgress(weeklyData);

      // Fetch subject progress
      const subjectProgressData = await analyticsService.getSubjectProgress(user.id);
      setSubjectProgress(subjectProgressData);

      // Calculate subject distribution from real data
      if (subjectProgressData && subjectProgressData.length > 0) {
        const distribution = subjectProgressData.map(subject => ({
          name: subject.name,
          value: subject.totalTime || 0,
          color: getSubjectColor(subject.name)
        }));
        setSubjectDistribution(distribution);
      } else if (userTopics && userTopics.length > 0) {
        // Fallback to topic completion if no study sessions yet
        const distribution = userSubjects?.map(subject => {
          const subjectTopics = userTopics.filter(t => t.subject_id === subject.id);
          const completedTopics = subjectTopics.filter(t => t.completed).length;
          return {
            name: subject.name,
            value: completedTopics,
            color: getSubjectColor(subject.name)
          };
        }) || [];
        setSubjectDistribution(distribution);
      }

      // Check and unlock achievements
      await analyticsService.checkAndUnlockAchievements(user.id);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectColor = (subjectName: string) => {
    const colors: { [key: string]: string } = {
      'Mathematics': '#3B82F6',
      'Science': '#10B981',
      'Computer Science': '#8B5CF6',
      'Physics': '#F59E0B',
      'Chemistry': '#EF4444',
      'Biology': '#06B6D4',
    };
    return colors[subjectName] || '#6B7280';
  };

  const recentAchievements: FormattedAchievement[] = achievements.length > 0 ? achievements.map((achievement: Achievement) => ({
    id: achievement.id,
    title: achievement.name,
    description: achievement.description,
    icon: achievement.icon || '🏆',
    date: new Date(achievement.created_at).toLocaleDateString(),
    rarity: 'bronze' as const,
  })) : [
    {
      id: 1,
      title: 'Welcome!',
      description: 'Start your learning journey',
      icon: '🎯',
      date: new Date().toISOString().split('T')[0],
      rarity: 'bronze' as const,
    },
  ];

  // Calculate stats from real data
  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.completed).length;
  const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const totalStudyHours = userAnalytics?.total_study_time || 0;
  const averageScore = userAnalytics?.quiz_accuracy || 0;
  const currentStreak = userAnalytics?.current_streak || 0;
  const totalXP = userAnalytics?.total_xp || 0;
  const level = userAnalytics?.level || 1;

  // Use real weekly progress data for score trends
  const scoreTrends = weeklyProgress.length > 0 ? weeklyProgress.map(day => ({
    date: day.date,
    score: day.xp || 0,
    average: averageScore
  })) : [
    { date: new Date().toISOString().split('T')[0], score: 0, average: 0 }
  ];

  // Use real subject progress data for skills
  const skillsData = subjectProgress.length > 0 ? subjectProgress.map(subject => ({
    name: subject.name,
    progress: Math.round((subject.completedTopics / Math.max(subject.totalTopics, 1)) * 100),
    color: getSubjectColor(subject.name)
  })) : [
    { name: 'No Data', progress: 0, color: '#8884d8' }
  ];

  const stats = [
    {
      title: 'Study Hours',
      value: `${totalStudyHours}h`,
      change: 12,
      icon: <Clock className="w-6 h-6 text-white" />,
      trend: 'up' as const,
    },
    {
      title: 'Average Score',
      value: `${averageScore}%`,
      change: 5,
      icon: <Target className="w-6 h-6 text-white" />,
      trend: 'up' as const,
    },
    {
      title: 'Topics Completed',
      value: completedTopics.toString(),
      change: 8,
      icon: <Brain className="w-6 h-6 text-white" />,
      trend: 'up' as const,
    },
    {
      title: 'Current Streak',
      value: `${currentStreak} days`,
      change: -2,
      icon: <Award className="w-6 h-6 text-white" />,
      trend: currentStreak > 5 ? 'up' as const : 'down' as const,
    },
  ];

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track your learning progress and insights</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "glass border-white/20",
                selectedPeriod === period && "bg-electric-blue text-white"
              )}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="glass border-white/20">
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Skills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Progress */}
            <Card className="glass border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Weekly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#3B82F6"
                      fill="url(#colorHours)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Score Trends */}
            <Card className="glass border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Score Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Subject Performance Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={subjectProgress.map(subject => ({
                    name: subject.name,
                    completion: Math.round((subject.completedTopics / Math.max(subject.totalTopics, 1)) * 100),
                    totalTime: subject.totalTime || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="completion" fill="#3B82F6" radius={[2, 2, 0, 0]} name="Completion %" />
                    <Bar dataKey="totalTime" fill="#10B981" radius={[2, 2, 0, 0]} name="Study Time (min)" />
                  </BarChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Distribution */}
            <Card className="glass border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Study Time Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="glass border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentAchievements.map((achievement: FormattedAchievement) => (
                   <motion.div
                     key={achievement.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                   >
                     <div className="text-2xl">{achievement.icon}</div>
                     <div className="flex-1">
                       <div className="flex items-center gap-2">
                         <h4 className="font-medium">{achievement.title}</h4>
                         <Badge
                           variant="secondary"
                           className={cn(
                             'text-xs',
                             achievement.rarity === 'gold' && 'bg-yellow-500/20 text-yellow-400',
                             achievement.rarity === 'silver' && 'bg-gray-500/20 text-gray-400',
                             achievement.rarity === 'bronze' && 'bg-orange-500/20 text-orange-400'
                           )}
                         >
                           {achievement.rarity}
                         </Badge>
                       </div>
                       <p className="text-sm text-muted-foreground">{achievement.description}</p>
                       <p className="text-xs text-muted-foreground mt-1">{achievement.date}</p>
                     </div>
                   </motion.div>
                 ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Skills Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={skillsRadar}>
                  <RadialBar
                    label={{ position: 'insideStart', fill: '#fff' }}
                    background
                    dataKey="current"
                    fill="#3B82F6"
                  />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
