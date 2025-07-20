import { SubjectCard } from "@/components/cards/SubjectCard";
import { PerformanceCard } from "@/components/cards/PerformanceCard";
import { Calculator, Atom, FlaskConical, Dna, Code, BookOpen } from "lucide-react";

// import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardPage() {
  return (
    <div className="p-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Welcome back! 👋
        </h1>
      </div>
        
      {/* Subject Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 auto-cols-fr">
        <SubjectCard 
           subject="Mathematics"
           icon={<Calculator className="w-5 h-5" />}
           progress={75}
           nextTopic="Algebra, Calculus, and more"
           href="/lessons/math"
           gradient="from-sky-400 to-blue-500"
         />
         <SubjectCard 
           subject="Physics"
           icon={<Atom className="w-5 h-5" />}
           progress={60}
           nextTopic="Mechanics, Thermodynamics"
           href="/lessons/physics"
           gradient="from-emerald-400 to-green-500"
         />
         <SubjectCard 
           subject="Chemistry"
           icon={<FlaskConical className="w-5 h-5" />}
           progress={45}
           nextTopic="Organic, Inorganic Chemistry"
           href="/lessons/chemistry"
           gradient="from-pink-400 to-fuchsia-500"
         />
         <SubjectCard 
           subject="Biology"
           icon={<Dna className="w-5 h-5" />}
           progress={80}
           nextTopic="Cell Biology, Genetics"
           href="/lessons/biology"
           gradient="from-emerald-400 to-green-500"
         />
         <SubjectCard 
           subject="Computer Science"
           icon={<Code className="w-5 h-5" />}
           progress={90}
           nextTopic="Programming, Algorithms"
           href="/lessons/computer-science"
           gradient="from-indigo-400 to-purple-500"
         />
         <SubjectCard 
           subject="English"
           icon={<BookOpen className="w-5 h-5" />}
           progress={55}
           nextTopic="Literature, Grammar"
           href="/lessons/english"
           gradient="from-rose-400 to-red-500"
         />
        </div>
      </div>

      {/* Performance Overview */}
      <div className="space-y-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Performance Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformanceCard 
            streak={12}
            learningTime="24.5h this week"
            strength="Mathematics"
            href="/progress"
          />
        </div>
      </div>
    </div>
  );
}