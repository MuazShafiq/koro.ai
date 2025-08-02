'use client';

import { SubjectCard } from "@/components/cards/SubjectCard";
import { PerformanceCard } from "@/components/cards/PerformanceCard";
import { BentoGrid, BentoGridItem } from "@/components/layouts/BentoGrid";
import { SubjectSelectionModal } from "@/components/modals/SubjectSelectionModal";
import { motion } from "framer-motion";
import { BookOpen, Calculator, Atom, Globe, Target, Trophy, Clock, Zap, TrendingUp, Users, FlaskConical, Dna, Code, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useSupabase } from "@/utils/supabase/provider";
import { Database } from "@/utils/supabase/database.types";
import React, { useState, useEffect, useCallback } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];

type FormattedSubject = {
  id: string;
  subject: string;
  icon: React.JSX.Element;
  progress: number;
  nextTopic: string;
  href: string;
  gradient: string;
  completedTopics: number;
};

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<FormattedSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const fetchUserData = useCallback(async () => {
     try {
       setLoading(true);
       
       // Get current user
       const { data: { user } } = await supabase.auth.getUser();
       
       if (!user) {
         setLoading(false);
         return;
       }
       
       // Fetch user profile
       const { data: profileData } = await supabase
         .from('profiles')
         .select('*')
         .eq('id', user.id)
         .single();
      
      setProfile(profileData);
      
      // Fetch user subjects with progress
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select(`
          *,
          topics(
            id,
            title,
            completed
          )
        `)
        .eq('user_id', user.id);
      
      if (subjectsData) {
        const formattedSubjects = subjectsData.map((subject: Subject & { topics?: Topic[] }) => {
          const totalTopics = subject.topics?.length || 0;
          const completedTopics = subject.topics?.filter((topic: Topic) => topic.completed).length || 0;
          const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
          
          return {
            id: subject.id,
            subject: subject.name,
            icon: getSubjectIcon(subject.name),
            progress,
            nextTopic: getNextTopic(subject.name),
            href: `/lessons/${subject.name.toLowerCase().replace(/\s+/g, '-')}`,
            gradient: getSubjectGradient(subject.name),
            completedTopics
          };
        });
        
        setSubjects(formattedSubjects);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
     fetchUserData();
   }, [fetchUserData]);

  const getSubjectIcon = (subjectName: string) => {
     const iconMap: { [key: string]: React.JSX.Element } = {
      'Mathematics': <Calculator className="w-5 h-5" />,
      'Physics': <Atom className="w-5 h-5" />,
      'Chemistry': <FlaskConical className="w-5 h-5" />,
      'Biology': <Dna className="w-5 h-5" />,
      'Computer Science': <Code className="w-5 h-5" />,
      'English': <BookOpen className="w-5 h-5" />
    };
    return iconMap[subjectName] || <BookOpen className="w-5 h-5" />;
  };

  const getSubjectGradient = (subjectName: string) => {
    const gradientMap: { [key: string]: string } = {
      'Mathematics': 'from-sky-400 to-blue-500',
      'Physics': 'from-emerald-400 to-green-500',
      'Chemistry': 'from-pink-400 to-fuchsia-500',
      'Biology': 'from-emerald-400 to-green-500',
      'Computer Science': 'from-indigo-400 to-purple-500',
      'English': 'from-rose-400 to-red-500'
    };
    return gradientMap[subjectName] || 'from-gray-400 to-gray-500';
  };

  const getNextTopic = (subjectName: string) => {
    const topicMap: { [key: string]: string } = {
      'Mathematics': 'Algebra, Calculus, and more',
      'Physics': 'Mechanics, Thermodynamics',
      'Chemistry': 'Organic, Inorganic Chemistry',
      'Biology': 'Cell Biology, Genetics',
      'Computer Science': 'Programming, Algorithms',
      'English': 'Literature, Grammar'
    };
    return topicMap[subjectName] || 'Continue learning';
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  const totalCompletedTopics = subjects.reduce((acc, subject) => acc + subject.completedTopics, 0);
  const totalStudyHours = profile?.total_sessions ? (profile.total_sessions * 0.5).toFixed(1) : '0';
  const averageProgress = subjects.length > 0 ? Math.round(subjects.reduce((acc, subject) => acc + subject.progress, 0) / subjects.length) : 0;

  const performanceData = [
    {
      title: "Learning Streak",
      value: profile?.streak || 0,
      change: profile?.streak || 0,
      period: "days",
      icon: <Target className="w-5 h-5" />,
      chartData: [3, 5, 4, 6, 5, 7, profile?.streak || 0],
      target: 7
    },
    {
      title: "Average Progress",
      value: `${averageProgress}%`,
      change: averageProgress > 75 ? 8 : averageProgress > 50 ? 5 : 2,
      period: "overall",
      icon: <Trophy className="w-5 h-5" />,
      chartData: [65, 70, 75, 80, 85, 88, averageProgress]
    },
    {
      title: "Study Time",
      value: `${totalStudyHours}h`,
      change: -5,
      period: "this week",
      icon: <Clock className="w-5 h-5" />,
      chartData: [2, 3, 4, 2, 5, 3, parseFloat(totalStudyHours) % 10],
      target: 30
    },
    {
      title: "Focus Score",
      value: `${Math.min(100, Math.max(0, averageProgress + 5))}%`,
      change: 15,
      period: "vs last week",
      icon: <Zap className="w-5 h-5" />,
      chartData: [75, 78, 82, 85, 87, 89, Math.min(100, Math.max(0, averageProgress + 5))]
    }
  ];

  const quickStats = [
    {
      title: "Active Subjects",
      value: subjects.length,
      icon: <BookOpen className="w-6 h-6" />,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Completed Topics",
      value: totalCompletedTopics,
      icon: <TrendingUp className="w-6 h-6" />,
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Study Sessions",
      value: profile?.total_sessions || 0,
      icon: <Users className="w-6 h-6" />,
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div className="w-full h-full overflow-auto bg-gradient-to-br from-background via-background to-background/95">
      <main className="w-full">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Zap className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {greeting}, {profile?.full_name || 'there'}! 👋
                </h1>
                <p className="text-muted-foreground text-lg">
                  Ready to continue your learning journey?
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {quickStats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                className="glass rounded-xl p-4 border border-white/10 bg-gradient-to-br from-card/50 to-card/30 hover:from-card/70 hover:to-card/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Performance Cards Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Performance Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {performanceData.map((data, index) => (
                <PerformanceCard
                  key={data.title}
                  {...data}
                  delay={0.3 + index * 0.1}
                />
              ))}
            </div>
          </motion.div>

          {/* AI Tutor Subjects Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              AI Tutor - Your Subjects
            </h2>
            <BentoGrid className="max-w-4xl mx-auto">
              {/* Render user's selected subjects */}
              {subjects.map((subject, index) => (
                <BentoGridItem
                  key={subject.id}
                  className="md:col-span-2 group cursor-pointer hover:shadow-xl transition-all duration-300"
                  size="large"
                >
                  <motion.div
                    className="relative h-full p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.location.href = subject.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {/* Animated background particles */}
                    <div className="absolute inset-0 overflow-hidden">
                      {[...Array(5)].map((_, i) => (
                         <motion.div
                           key={i}
                           className="absolute w-2 h-2 bg-primary/30 rounded-full"
                           animate={{
                             x: [0, 100, 0],
                             y: [0, -50, 0],
                             opacity: [0, 1, 0]
                           }}
                           transition={{
                             duration: 3 + i,
                             repeat: Infinity,
                             delay: i * 0.5
                           }}
                           style={{
                             left: `${20 + i * 15}%`,
                             top: `${30 + i * 10}%`
                           }}
                         />
                       ))}
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${subject.gradient} flex items-center justify-center shadow-lg`}
                            whileHover={{ rotate: 5, scale: 1.1 }}
                          >
                            {subject.icon}
                          </motion.div>
                          <div>
                             <h3 className="text-2xl font-bold text-foreground">{subject.subject}</h3>
                             <p className="text-primary font-medium">AI Tutor Ready</p>
                           </div>
                         </div>
                         
                         {/* AI Status Indicator */}
                         <motion.div
                           className="flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full border border-primary/30"
                           animate={{ opacity: [0.7, 1, 0.7] }}
                           transition={{ duration: 2, repeat: Infinity }}
                         >
                           <div className="w-2 h-2 bg-primary rounded-full" />
                           <span className="text-sm text-primary font-medium">AI Active</span>
                         </motion.div>
                      </div>
                      
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Learning Streak */}
                        <motion.div
                          className="p-4 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                🔥
                              </motion.div>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Learning Streak</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{profile?.streak || 7} days</p>
                        </motion.div>
                        
                        {/* Study Time */}
                        <motion.div
                          className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Study Time</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{totalStudyHours}h</p>
                        </motion.div>
                        
                        {/* Progress */}
                        <motion.div
                          className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Progress</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{subject.progress}%</p>
                        </motion.div>
                        
                        {/* Focus Score */}
                        <motion.div
                          className="p-4 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Focus Score</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{Math.min(100, Math.max(0, subject.progress + 5))}%</p>
                        </motion.div>
                      </div>
                      
                      {/* Next Topic */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div>
                            <p className="text-sm text-muted-foreground">Next Topic</p>
                            <p className="font-medium text-foreground">{subject.nextTopic}</p>
                          </div>
                          <motion.div
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${subject.gradient} flex items-center justify-center`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <BookOpen className="w-5 h-5 text-white" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </BentoGridItem>
              ))}
              
              {/* Add Subject Card */}
              <BentoGridItem className="group cursor-pointer hover:shadow-xl transition-all duration-300">
                <motion.div
                  className="flex flex-col items-center justify-center h-full p-6 text-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSubjectModalOpen(true)}
                >
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300"
                    whileHover={{ rotate: 5 }}
                  >
                    <BookOpen className="w-6 h-6 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Add Subject</h3>
                  <p className="text-sm text-muted-foreground text-center">Mathematics, Chemistry & more coming soon</p>
                </motion.div>
              </BentoGridItem>
            </BentoGrid>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass rounded-xl p-6 border border-white/10 bg-gradient-to-br from-card/50 to-card/30"
          >
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { action: "Completed", subject: "Mathematics", topic: "Calculus Integration", time: "2 hours ago" },
                { action: "Started", subject: "Physics", topic: "Quantum Mechanics", time: "Yesterday" },
                { action: "Reviewed", subject: "Chemistry", topic: "Organic Reactions", time: "2 days ago" }
              ].map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors duration-200"
                >
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{activity.action}</span> {activity.topic} in {activity.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      
      {/* Subject Selection Modal */}
      <SubjectSelectionModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSubjectsAdded={fetchUserData}
      />
    </div>
  );
}