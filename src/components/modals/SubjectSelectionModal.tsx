'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Atom, Calculator, FlaskConical, Dna, Check } from 'lucide-react';
import { useSupabase } from '@/utils/supabase/provider';
import { toast } from 'sonner';

interface SubjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectsAdded: () => void;
}

interface Subject {
  id: string;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  description: string;
}

const availableSubjects: Subject[] = [
  {
    id: 'physics',
    name: 'Physics',
    icon: <Atom className="w-8 h-8 text-white" />,
    gradient: 'from-emerald-400 to-green-500',
    description: 'Mechanics, Thermodynamics, Waves'
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: <Calculator className="w-8 h-8 text-white" />,
    gradient: 'from-blue-400 to-cyan-500',
    description: 'Algebra, Calculus, Statistics'
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: <FlaskConical className="w-8 h-8 text-white" />,
    gradient: 'from-purple-400 to-violet-500',
    description: 'Organic, Inorganic, Physical'
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: <Dna className="w-8 h-8 text-white" />,
    gradient: 'from-orange-400 to-red-500',
    description: 'Cell Biology, Genetics, Ecology'
  }
];

export function SubjectSelectionModal({ isOpen, onClose, onSubjectsAdded }: SubjectSelectionModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { supabase } = useSupabase();

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleAddSubjects = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to add subjects');
        return;
      }

      // Add selected subjects to the database
      const subjectsToAdd = selectedSubjects.map(subjectId => {
        const subject = availableSubjects.find(s => s.id === subjectId);
        return {
          name: subject?.name || '',
          user_id: user.id,
          created_at: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('subjects')
        .insert(subjectsToAdd);

      if (error) {
        console.error('Error adding subjects:', error);
        toast.error('Failed to add subjects. Please try again.');
        return;
      }

      toast.success(`Successfully added ${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''}!`);
      setSelectedSubjects([]);
      onSubjectsAdded();
      onClose();
    } catch (error) {
      console.error('Error adding subjects:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSubjects([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-xl border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            Add New Subjects
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Select the subjects you'd like to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {availableSubjects.map((subject, index) => {
            const isSelected = selectedSubjects.includes(subject.id);
            
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`relative cursor-pointer group`}
                onClick={() => toggleSubject(subject.id)}
              >
                <motion.div
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    isSelected 
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}

                  {/* Subject icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${subject.gradient} flex items-center justify-center mb-4 mx-auto shadow-lg`}>
                    {subject.icon}
                  </div>

                  {/* Subject name */}
                  <h3 className="text-xl font-bold text-center text-foreground mb-2">
                    {subject.name}
                  </h3>

                  {/* Cambridge GCSE label */}
                  <p className="text-sm text-center text-muted-foreground mb-3 font-medium">
                    Cambridge GCSE
                  </p>

                  {/* Subject description */}
                  <p className="text-sm text-center text-muted-foreground">
                    {subject.description}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-sm text-muted-foreground">
            {selectedSubjects.length > 0 
              ? `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`
              : 'Select subjects to add to your dashboard'
            }
          </p>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubjects}
              disabled={selectedSubjects.length === 0 || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? 'Adding...' : `Add ${selectedSubjects.length > 0 ? selectedSubjects.length : ''} Subject${selectedSubjects.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}