import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface LessonData {
  id: string;
  title: string;
  content: string;
  objectives: string[];
  keyPoints: string[];
  audioUrl?: string;
  estimatedDuration: number;
}

export interface LessonGenerationRequest {
  subjectId: string;
  topicId: string;
  subjectName: string;
  topicName: string;
  userLevel?: string;
  duration?: number;
  generateAudio?: boolean;
}

export interface UseLessonReturn {
  lesson: LessonData | null;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  generateLesson: (request: LessonGenerationRequest) => Promise<void>;
  getLesson: (lessonId: string) => Promise<void>;
  clearLesson: () => void;
  clearError: () => void;
}

export function useLesson(): UseLessonReturn {
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLesson = useCallback(async (request: LessonGenerationRequest) => {
    try {
      setIsGenerating(true);
      setError(null);
      setLesson(null);

      toast.loading('Generating your personalized lesson...', {
        id: 'lesson-generation'
      });

      const response = await fetch('/api/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate lesson');
      }

      if (!data.success) {
        throw new Error(data.error || 'Lesson generation failed');
      }

      setLesson(data.lesson);
      
      toast.success('Lesson generated successfully!', {
        id: 'lesson-generation',
        description: data.lesson.audioUrl 
          ? 'Audio narration is ready to play'
          : 'Text content is ready to read'
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      toast.error('Failed to generate lesson', {
        id: 'lesson-generation',
        description: errorMessage
      });
      
      console.error('Error generating lesson:', err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const getLesson = useCallback(async (lessonId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/lesson?lessonId=${encodeURIComponent(lessonId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lesson');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to load lesson');
      }

      setLesson(data.lesson);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lesson';
      setError(errorMessage);
      
      toast.error('Failed to load lesson', {
        description: errorMessage
      });
      
      console.error('Error fetching lesson:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearLesson = useCallback(() => {
    setLesson(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    lesson,
    isGenerating,
    isLoading,
    error,
    generateLesson,
    getLesson,
    clearLesson,
    clearError
  };
}

/**
 * Hook for managing resources
 */
export interface ResourceData {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  contentType: string;
  createdAt: string;
  subjects?: { name: string };
  topics?: { name: string };
}

export interface UseResourcesReturn {
  resources: ResourceData[];
  isLoading: boolean;
  error: string | null;
  fetchResources: (subjectId?: string, topicId?: string) => Promise<void>;
  createResource: (resource: Omit<ResourceData, 'id' | 'createdAt'>) => Promise<void>;
  deleteResource: (resourceId: string) => Promise<void>;
  clearError: () => void;
}

export function useResources(): UseResourcesReturn {
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async (subjectId?: string, topicId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (subjectId) params.append('subjectId', subjectId);
      if (topicId) params.append('topicId', topicId);

      const response = await fetch(`/api/resources?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch resources');
      }

      setResources(data.resources || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load resources';
      setError(errorMessage);
      console.error('Error fetching resources:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createResource = useCallback(async (resource: Omit<ResourceData, 'id' | 'createdAt'>) => {
    try {
      setError(null);

      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resource),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create resource');
      }

      toast.success('Resource created successfully!');
      
      // Refresh resources list
      await fetchResources();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create resource';
      setError(errorMessage);
      
      toast.error('Failed to create resource', {
        description: errorMessage
      });
      
      console.error('Error creating resource:', err);
    }
  }, [fetchResources]);

  const deleteResource = useCallback(async (resourceId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/resources?resourceId=${encodeURIComponent(resourceId)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete resource');
      }

      toast.success('Resource deleted successfully!');
      
      // Remove from local state
      setResources(prev => prev.filter(r => r.id !== resourceId));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete resource';
      setError(errorMessage);
      
      toast.error('Failed to delete resource', {
        description: errorMessage
      });
      
      console.error('Error deleting resource:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    resources,
    isLoading,
    error,
    fetchResources,
    createResource,
    deleteResource,
    clearError
  };
}