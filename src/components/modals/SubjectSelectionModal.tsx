'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Atom, Calculator, FlaskConical, Dna, Check } from 'lucide-react';
import { useSupabase } from '../../utils/supabase/provider';
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
    console.log('Adding subjects:', selectedSubjects);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('User authentication error:', userError);
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      if (!user) {
        console.error('No user found');
        toast.error('Please log in to add subjects');
        return;
      }

      console.log('User authenticated:', user.id);

      // Check for existing subjects to avoid duplicates
      const { data: existingSubjects, error: fetchError } = await supabase
        .from('subjects')
        .select('name')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching existing subjects:', fetchError);
        toast.error('Error checking existing subjects.');
        return;
      }

      const existingSubjectNames = existingSubjects?.map(s => s.name) || [];
      console.log('Existing subjects:', existingSubjectNames);

      // Filter out subjects that already exist
      const newSubjects = selectedSubjects.filter(subjectId => {
        const subject = availableSubjects.find(s => s.id === subjectId);
        return subject && !existingSubjectNames.includes(subject.name);
      });

      if (newSubjects.length === 0) {
        toast.error('All selected subjects are already added to your dashboard.');
        setIsLoading(false);
        return;
      }

      // Add selected subjects to the database
      const subjectsToAdd = newSubjects.map(subjectId => {
        const subject = availableSubjects.find(s => s.id === subjectId);
        return {
          name: subject?.name || '',
          description: subject?.description || '',
          icon: subject?.id || '',
          gradient: subject?.gradient || '',
          user_id: user.id,
          created_at: new Date().toISOString()
        };
      });

      console.log('Subjects to add:', subjectsToAdd);

      const { data: insertedData, error: insertError } = await supabase
        .from('subjects')
        .insert(subjectsToAdd)
        .select();

      if (insertError) {
        console.error('Error adding subjects:', insertError);
        toast.error(`Failed to add subjects: ${insertError.message}`);
        return;
      }

      console.log('Successfully inserted subjects:', insertedData);
      toast.success(`Successfully added ${newSubjects.length} subject${newSubjects.length > 1 ? 's' : ''}!`);
      
      setSelectedSubjects([]);
      
      // Refresh the dashboard data
      await onSubjectsAdded();
      onClose();
    } catch (error) {
      console.error('Unexpected error adding subjects:', error);
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
      <DialogContent className="max-w-4xl max-h-[85vh] w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] overflow-y-auto bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-xl border border-white/10 mx-2 sm:mx-4 my-2 sm:my-4">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            Add New Subjects
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Select the subjects you'd like to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4 sm:py-6 px-2 sm:px-0">
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
                  className={`p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 ${
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
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${subject.gradient} flex items-center justify-center mb-3 sm:mb-4 mx-auto shadow-lg`}>
                    {subject.icon}
                  </div>

                  {/* Subject name */}
                  <h3 className="text-lg sm:text-xl font-bold text-center text-foreground mb-1 sm:mb-2">
                    {subject.name}
                  </h3>

                  {/* Cambridge GCSE label */}
                  <p className="text-xs sm:text-sm text-center text-muted-foreground mb-2 sm:mb-3 font-medium">
                    Cambridge GCSE
                  </p>

                  {/* Subject description */}
                  <p className="text-xs sm:text-sm text-center text-muted-foreground">
                    {subject.description}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/10 gap-3 sm:gap-0 px-2 sm:px-0">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            {selectedSubjects.length > 0 
              ? `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`
              : 'Select subjects to add to your dashboard'
            }
          </p>
          
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubjects}
              disabled={selectedSubjects.length === 0 || isLoading}
              className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
            >
              {isLoading ? 'Adding...' : `Add ${selectedSubjects.length > 0 ? selectedSubjects.length : ''} Subject${selectedSubjects.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}