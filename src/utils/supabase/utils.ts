import { createClient } from './server';
import { Database } from './database.types';

/**
 * Initialize default subjects and topics for a new user
 * @param userId The user's ID
 */
export async function initializeUserData(userId: string) {
  const supabase = await createClient();
  
  // Default subjects with their topics
  const defaultSubjects = [
    {
      name: 'Mathematics',
      icon: '📐',
      gradient: 'from-blue-500 to-cyan-500',
      topics: [
        'Algebra',
        'Geometry',
        'Calculus',
        'Statistics',
        'Trigonometry'
      ]
    },
    {
      name: 'Science',
      icon: '🔬',
      gradient: 'from-green-500 to-emerald-500',
      topics: [
        'Physics',
        'Chemistry',
        'Biology',
        'Astronomy',
        'Earth Science'
      ]
    },
    {
      name: 'Computer Science',
      icon: '💻',
      gradient: 'from-purple-500 to-violet-500',
      topics: [
        'Programming',
        'Data Structures',
        'Algorithms',
        'Web Development',
        'Machine Learning'
      ]
    }
  ];
  
  try {
    // Create each subject and its topics
    for (const subject of defaultSubjects) {
      // Insert subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          name: subject.name,
          icon: subject.icon,
          gradient: subject.gradient,
          total_topics: subject.topics.length,
          user_id: userId
        })
        .select()
        .single();
      
      if (subjectError) {
        console.error('Error creating subject:', subjectError);
        continue;
      }
      
      // Insert topics for this subject
      const topicsToInsert = subject.topics.map(topicName => ({
        name: topicName,
        subject_id: subjectData.id,
        completed: false,
        progress: 0
      }));
      
      const { error: topicsError } = await supabase
        .from('topics')
        .insert(topicsToInsert);
      
      if (topicsError) {
        console.error('Error creating topics:', topicsError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing user data:', error);
    return { success: false, error };
  }
}