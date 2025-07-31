'use client';

import { SubjectCard } from "@/components/cards/SubjectCard";
import { PerformanceCard } from "@/components/cards/PerformanceCard";
import { BentoGrid, BentoGridItem } from "@/components/layouts/BentoGrid";
import { motion } from "framer-motion";
import { BookOpen, Calculator, Atom, Globe, Target, Trophy, Clock, Zap, TrendingUp, Users, FlaskConical, Dna, Code } from "lucide-react";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const subjects = [
    {
      id: 1,
      subject: "Mathematics",
      icon: <Calculator className="w-5 h-5" />,
      progress: 75,
      nextTopic: "Algebra, Calculus, and more",
      href: "/lessons/math",
      gradient: "from-sky-400 to-blue-500",
      completedTopics: 12
    },
    {
      id: 2,
      subject: "Physics",
      icon: <Atom className="w-5 h-5" />,
      progress: 60,
      nextTopic: "Mechanics, Thermodynamics",
      href: "/lessons/physics",
      gradient: "from-emerald-400 to-green-500",
      completedTopics: 8
    },
    {
      id: 3,
      subject: "Chemistry",
      icon: <FlaskConical className="w-5 h-5" />,
      progress: 45,
      nextTopic: "Organic, Inorganic Chemistry",
      href: "/lessons/chemistry",
      gradient: "from-pink-400 to-fuchsia-500",
      completedTopics: 6
    },
    {
      id: 4,
      subject: "Biology",
      icon: <Dna className="w-5 h-5" />,
      progress: 80,
      nextTopic: "Cell Biology, Genetics",
      href: "/lessons/biology",
      gradient: "from-emerald-400 to-green-500",
      completedTopics: 15
    },
    {
      id: 5,
      subject: "Computer Science",
      icon: <Code className="w-5 h-5" />,
      progress: 90,
      nextTopic: "Programming, Algorithms",
      href: "/lessons/computer-science",
      gradient: "from-indigo-400 to-purple-500",
      completedTopics: 18
    },
    {
      id: 6,
      subject: "English",
      icon: <BookOpen className="w-5 h-5" />,
      progress: 55,
      nextTopic: "Literature, Grammar",
      href: "/lessons/english",
      gradient: "from-rose-400 to-red-500",
      completedTopics: 9
    }
  ];

  const performanceData = [
    {
      title: "Learning Streak",
      value: 12,
      change: 12,
      period: "vs last week",
      icon: <Target className="w-5 h-5" />,
      chartData: [3, 5, 4, 6, 5, 7, 5],
      target: 7
    },
    {
      title: "Weekly Score",
      value: "92%",
      change: 8,
      period: "this week",
      icon: <Trophy className="w-5 h-5" />,
      chartData: [85, 88, 90, 87, 92, 89, 92]
    },
    {
      title: "Study Time",
      value: "24.5h",
      change: -5,
      period: "this week",
      icon: <Clock className="w-5 h-5" />,
      chartData: [2, 3, 4, 2, 5, 3, 4],
      target: 30
    },
    {
      title: "Focus Score",
      value: "87%",
      change: 15,
      period: "vs last week",
      icon: <Zap className="w-5 h-5" />,
      chartData: [75, 78, 82, 85, 87, 89, 87]
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
      value: subjects.reduce((acc, subject) => acc + subject.completedTopics, 0),
      icon: <TrendingUp className="w-6 h-6" />,
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Study Sessions",
      value: 24,
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
                  {greeting}! 👋
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

          {/* Subjects Bento Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Your Subjects
            </h2>
            <BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {subjects.map((subject, index) => (
                <BentoGridItem
                  key={subject.id}
                  className="group"
                  size={index === 0 ? "large" : "medium"}
                >
                  <SubjectCard
                     subject={{
                       id: subject.id.toString(),
                       name: subject.subject,
                       icon: subject.icon.props.children || '📚',
                       progress: subject.progress,
                       completedTopics: subject.completedTopics,
                       totalTopics: Math.round(subject.completedTopics / (subject.progress / 100)),
                       nextTopic: subject.nextTopic,
                       lastSession: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                       gradient: subject.gradient
                     }}
                     onClick={() => window.location.href = subject.href}
                     delay={0.5 + index * 0.1}
                     className="h-full border-0 bg-transparent"
                   />
                </BentoGridItem>
              ))}
              
              {/* Add Subject Card */}
              <BentoGridItem className="group" size="medium">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-full glass rounded-xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 hover:from-primary/10 hover:to-secondary/10 transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer group"
                >
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300"
                    whileHover={{ rotate: 5 }}
                  >
                    <BookOpen className="w-6 h-6 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Add Subject</h3>
                  <p className="text-sm text-muted-foreground text-center">Start learning something new</p>
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
    </div>
  );
}