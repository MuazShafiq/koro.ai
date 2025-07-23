'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

// Mock data for analytics
const weeklyProgress = [
  { day: 'Mon', hours: 2.5, score: 85, topics: 3 },
  { day: 'Tue', hours: 3.2, score: 92, topics: 4 },
  { day: 'Wed', hours: 1.8, score: 78, topics: 2 },
  { day: 'Thu', hours: 4.1, score: 95, topics: 5 },
  { day: 'Fri', hours: 2.9, score: 88, topics: 3 },
  { day: 'Sat', hours: 3.5, score: 91, topics: 4 },
  { day: 'Sun', hours: 2.2, score: 83, topics: 2 },
];

const monthlyTrends = [
  { month: 'Jan', mathematics: 75, science: 82, english: 78, history: 85 },
  { month: 'Feb', mathematics: 78, science: 85, english: 81, history: 87 },
  { month: 'Mar', mathematics: 82, science: 88, english: 84, history: 89 },
  { month: 'Apr', mathematics: 85, science: 91, english: 87, history: 92 },
  { month: 'May', mathematics: 88, science: 93, english: 89, history: 94 },
  { month: 'Jun', mathematics: 91, science: 95, english: 92, history: 96 },
];

const subjectDistribution = [
  { name: 'Mathematics', value: 35, color: '#3B82F6' },
  { name: 'Science', value: 28, color: '#10B981' },
  { name: 'English', value: 22, color: '#F59E0B' },
  { name: 'History', value: 15, color: '#8B5CF6' },
];

const skillsRadar = [
  { skill: 'Problem Solving', current: 85, target: 90 },
  { skill: 'Critical Thinking', current: 78, target: 85 },
  { skill: 'Communication', current: 92, target: 95 },
  { skill: 'Creativity', current: 76, target: 80 },
  { skill: 'Collaboration', current: 88, target: 90 },
];

const achievements = [
  {
    id: 1,
    title: 'Math Master',
    description: 'Completed 50 math problems',
    icon: '🧮',
    date: '2024-01-15',
    rarity: 'gold',
  },
  {
    id: 2,
    title: 'Science Explorer',
    description: 'Discovered 10 new concepts',
    icon: '🔬',
    date: '2024-01-12',
    rarity: 'silver',
  },
  {
    id: 3,
    title: 'Streak Champion',
    description: '7-day learning streak',
    icon: '🔥',
    date: '2024-01-10',
    rarity: 'bronze',
  },
];

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
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const stats = [
    {
      title: 'Study Hours',
      value: '24.2h',
      change: 12,
      icon: <Clock className="w-6 h-6 text-white" />,
      trend: 'up' as const,
    },
    {
      title: 'Average Score',
      value: '87%',
      change: 5,
      icon: <Target className="w-6 h-6 text-white" />,
      trend: 'up' as const,
    },
    {
      title: 'Topics Completed',
      value: '23',
      change: 8,
      icon: <Brain className="w-6 h-6 text-white" />,
      trend: 'up' as const,
    },
    {
      title: 'Current Streak',
      value: '7 days',
      change: -2,
      icon: <Award className="w-6 h-6 text-white" />,
      trend: 'down' as const,
    },
  ];

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
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
                  <YAxis stroke="rgba(255,255,255,0.7)" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="mathematics" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="science" fill="#10B981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="english" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="history" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
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
                {achievements.map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{achievement.title}</h4>
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            achievement.rarity === 'gold' && "bg-yellow-500/20 text-yellow-400",
                            achievement.rarity === 'silver' && "bg-gray-500/20 text-gray-400",
                            achievement.rarity === 'bronze' && "bg-orange-500/20 text-orange-400"
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
                    minAngle={15}
                    label={{ position: 'insideStart', fill: '#fff' }}
                    background
                    clockWise
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