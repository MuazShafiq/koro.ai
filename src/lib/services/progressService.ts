import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface ConceptProgress {
  id: string;
  conceptName: string;
  deliveryStatus: 'pending' | 'delivered' | 'understood' | 'needs_review';
  deliveryTimestamp?: string;
  resourceSection?: string;
  equationReferences?: string[];
  studentEngagementScore?: number;
  understandingVerified?: boolean;
  notes?: string;
}
export interface ProgressSummary {
  sessionId: string;
  progressPercentage: number;
  totalConcepts: number;
  deliveredConcepts: number;
  pendingConcepts: number;
  equationsCount: number;
  resourceSectionsCovered: number;
  avgEngagementScore: number;
}

export interface RAGContentAnalysis {
  totalConceptsIdentified: number;
  equationsFound: string[];
  resourceSections: string[];
  keyTopics: string[];
  estimatedLessonDuration: number;
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface LessonPlan {
  sessionId: string;
  plannedConcepts: string[];
  plannedEquations: string[];
  plannedResourceSections: string[];
  estimatedChunks: number;
  coverageGoals: {
    minConceptsCoverage: number;
    minEquationsCoverage: number;
    minResourceSections: number;
  };
}

export interface CompletionReadiness {
  readyForCompletion: boolean;
  completionPercentage: number;
  conceptsThresholdMet: boolean;
  equationsThresholdMet: boolean;
  resourceThresholdMet: boolean;
  missingRequirements: string[];
}

export class ProgressService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  /**
   * Analyze RAG content to extract concepts, equations, and structure
   */
  async analyzeRAGContent(ragContent: string, subject: string): Promise<RAGContentAnalysis> {
    const requestId = crypto.randomUUID();
    logger.info('PROGRESS-SERVICE', 'Analyzing RAG content', { subject }, requestId);

    try {
      // Extract equations using regex patterns
      const equationPatterns = [
        /\$\$([^$]+)\$\$/g, // LaTeX display math
        /\$([^$]+)\$/g,   // LaTeX inline math
        /\\\[([^\]]+)\\\]/g, // LaTeX display brackets
        /\\\(([^\)]+)\\\)/g, // LaTeX inline brackets
        /(?:^|\s)((?:[a-zA-Z]\s*[=<>≤≥≠±∓×÷∑∏∫∂∇]|[=<>≤≥≠±∓×÷∑∏∫∂∇]\s*[a-zA-Z])[^.!?\n]*)/gm // Mathematical expressions
      ];

      const equations = new Set<string>();
      equationPatterns.forEach(pattern => {
        const matches = ragContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.replace(/[\$\\\[\]\(\)]/g, '').trim();
            if (cleaned.length > 2 && cleaned.length < 200) {
              equations.add(cleaned);
            }
          });
        }
      });

      // Extract resource sections (headers, chapters, etc.)
      const sectionPatterns = [
        /^#{1,6}\s+(.+)$/gm, // Markdown headers
        /^\d+\.\d*\s+(.+)$/gm, // Numbered sections
        /^Chapter\s+\d+[:\s]+(.+)$/gmi, // Chapter titles
        /^Section\s+\d+[:\s]+(.+)$/gmi, // Section titles
        /^Part\s+[IVX\d]+[:\s]+(.+)$/gmi // Part titles
      ];

      const resourceSections = new Set<string>();
      sectionPatterns.forEach(pattern => {
        const matches = ragContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.replace(/^#{1,6}\s*|^\d+\.\d*\s*|^(Chapter|Section|Part)\s+[IVX\d]+[:\s]*/i, '').trim();
            if (cleaned.length > 3 && cleaned.length < 100) {
              resourceSections.add(cleaned);
            }
          });
        }
      });

      // Extract key concepts and topics
      const conceptPatterns = [
        /(?:definition|theorem|lemma|corollary|proposition)[:\s]+([^.!?\n]+)/gi,
        /(?:key concept|important)[:\s]+([^.!?\n]+)/gi,
        /(?:remember that|note that|observe that)[:\s]+([^.!?\n]+)/gi
      ];

      const keyTopics = new Set<string>();
      conceptPatterns.forEach(pattern => {
        const matches = ragContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.replace(/^(?:definition|theorem|lemma|corollary|proposition|key concept|important|remember that|note that|observe that)[:\s]+/i, '').trim();
            if (cleaned.length > 5 && cleaned.length < 150) {
              keyTopics.add(cleaned);
            }
          });
        }
      });

      // Estimate complexity based on content analysis
      const complexityIndicators = {
        beginner: ['basic', 'introduction', 'simple', 'elementary', 'fundamental'],
        intermediate: ['apply', 'analyze', 'compare', 'demonstrate', 'explain'],
        advanced: ['derive', 'prove', 'synthesize', 'evaluate', 'complex', 'advanced']
      };

      let complexityScore = { beginner: 0, intermediate: 0, advanced: 0 };
      const lowerContent = ragContent.toLowerCase();
      
      Object.entries(complexityIndicators).forEach(([level, indicators]) => {
        indicators.forEach(indicator => {
          const matches = (lowerContent.match(new RegExp(indicator, 'g')) || []).length;
          complexityScore[level as keyof typeof complexityScore] += matches;
        });
      });

      const complexityLevel = Object.entries(complexityScore)
        .reduce((a, b) => complexityScore[a[0] as keyof typeof complexityScore] > complexityScore[b[0] as keyof typeof complexityScore] ? a : b)[0] as 'beginner' | 'intermediate' | 'advanced';

      // Estimate lesson duration based on content length and complexity
      const wordCount = ragContent.split(/\s+/).length;
      const baseMinutes = Math.ceil(wordCount / 200); // ~200 words per minute reading
      const complexityMultiplier = { beginner: 1.2, intermediate: 1.5, advanced: 2.0 };
      const estimatedDuration = Math.ceil(baseMinutes * complexityMultiplier[complexityLevel]);

      const analysis: RAGContentAnalysis = {
        totalConceptsIdentified: keyTopics.size + Math.floor(wordCount / 100), // Rough concept estimation
        equationsFound: Array.from(equations),
        resourceSections: Array.from(resourceSections),
        keyTopics: Array.from(keyTopics),
        estimatedLessonDuration: estimatedDuration,
        complexityLevel
      };

      logger.info('PROGRESS-SERVICE', 'RAG content analysis completed', {
        conceptsFound: analysis.totalConceptsIdentified,
        equationsFound: analysis.equationsFound.length,
        sectionsFound: analysis.resourceSections.length,
        complexity: analysis.complexityLevel,
        duration: analysis.estimatedLessonDuration
      }, requestId);

      return analysis;
    } catch (error) {
      logger.error('PROGRESS-SERVICE', 'Failed to analyze RAG content', { error }, requestId);
      throw error;
    }
  }

  /**
   * Create a comprehensive lesson plan based on RAG analysis
   */
  async createLessonPlan(sessionId: string, ragAnalysis: RAGContentAnalysis): Promise<LessonPlan> {
    const requestId = crypto.randomUUID();
    logger.info('PROGRESS-SERVICE', 'Creating lesson plan', { sessionId }, requestId);

    try {
      // Generate planned concepts based on analysis
      const plannedConcepts = [
        ...ragAnalysis.keyTopics,
        ...ragAnalysis.resourceSections.map(section => `Understanding: ${section}`)
      ].slice(0, Math.min(ragAnalysis.totalConceptsIdentified, 20)); // Limit to manageable number

      // Set coverage goals based on complexity
      const coverageGoals = {
        minConceptsCoverage: ragAnalysis.complexityLevel === 'beginner' ? 0.8 : 
                           ragAnalysis.complexityLevel === 'intermediate' ? 0.7 : 0.6,
        minEquationsCoverage: Math.min(ragAnalysis.equationsFound.length, 5),
        minResourceSections: Math.min(ragAnalysis.resourceSections.length, 3)
      };

      const lessonPlan: LessonPlan = {
        sessionId,
        plannedConcepts,
        plannedEquations: ragAnalysis.equationsFound.slice(0, 10), // Limit equations
        plannedResourceSections: ragAnalysis.resourceSections,
        estimatedChunks: Math.ceil(ragAnalysis.estimatedLessonDuration / 5), // ~5 minutes per chunk
        coverageGoals
      };

      // Store lesson plan in session metadata
      await this.supabase
        .from('lesson_sessions')
        .update({
          lesson_plan: lessonPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      logger.info('PROGRESS-SERVICE', 'Lesson plan created', {
        plannedConcepts: plannedConcepts.length,
        plannedEquations: ragAnalysis.equationsFound.length,
        estimatedChunks: lessonPlan.estimatedChunks
      }, requestId);

      return lessonPlan;
    } catch (error) {
      logger.error('PROGRESS-SERVICE', 'Failed to create lesson plan', { error }, requestId);
      throw error;
    }
  }

  /**
   * Get current progress summary for a session
   */
  async getProgressSummary(sessionId: string): Promise<ProgressSummary> {
    const requestId = crypto.randomUUID();
    logger.info('PROGRESS-SERVICE', 'Getting progress summary', { sessionId }, requestId);

    try {
      const { data, error } = await this.supabase
        .rpc('get_session_progress_summary', {
          session_uuid: sessionId
        });

      if (error) {
        logger.error('PROGRESS-SERVICE', 'Failed to get progress summary', { error }, requestId);
        throw error;
      }

      const summary = data?.[0] || {
        progress_percentage: 0,
        total_concepts: 0,
        delivered_concepts: 0,
        pending_concepts: 0,
        equations_count: 0,
        resource_sections_covered: 0,
        avg_engagement_score: 0
      };

      return {
        sessionId,
        progressPercentage: summary.progress_percentage,
        totalConcepts: summary.total_concepts,
        deliveredConcepts: summary.delivered_concepts,
        pendingConcepts: summary.pending_concepts,
        equationsCount: summary.equations_count,
        resourceSectionsCovered: summary.resource_sections_covered,
        avgEngagementScore: summary.avg_engagement_score
      };
    } catch (error) {
      logger.error('PROGRESS-SERVICE', 'Failed to get progress summary', { error }, requestId);
      throw error;
    }
  }

  /**
   * Add concept progress tracking
   */
  async addConceptProgress(
    sessionId: string,
    conceptName: string,
    resourceSection?: string,
    equationReferences?: string[]
  ): Promise<string> {
    const requestId = crypto.randomUUID();
    logger.info('PROGRESS-SERVICE', 'Adding concept progress', {
      sessionId,
      conceptName,
      hasResourceSection: !!resourceSection,
      equationCount: equationReferences?.length || 0
    }, requestId);

    try {
      const { data: progressId, error } = await this.supabase
        .rpc('add_concept_progress', {
          session_uuid: sessionId,
          concept_text: conceptName,
          resource_section_text: resourceSection || null,
          equation_refs: equationReferences || []
        });

      if (error) {
        logger.error('PROGRESS-SERVICE', 'Failed to add concept progress', { error }, requestId);
        throw error;
      }

      return progressId;
    } catch (error) {
      logger.error('PROGRESS-SERVICE', 'Failed to add concept progress', { error }, requestId);
      throw error;
    }
  }

  /**
   * Mark concept as delivered with engagement tracking
   */
  async markConceptDelivered(progressId: string, engagementScore?: number): Promise<void> {
    const requestId = crypto.randomUUID();
    logger.info('PROGRESS-SERVICE', 'Marking concept as delivered', {
      progressId,
      engagementScore
    }, requestId);

    try {
      const { error } = await this.supabase
        .rpc('mark_concept_delivered', {
          progress_uuid: progressId,
          engagement_score: engagementScore || null
        });

      if (error) {
        logger.error('PROGRESS-SERVICE', 'Failed to mark concept as delivered', { error }, requestId);
        throw error;
      }
    } catch (error) {
      logger.error('PROGRESS-SERVICE', 'Failed to mark concept as delivered', { error }, requestId);
      throw error;
    }
  }

  /**
   * Check if session is ready for completion
   */
  async checkCompletionReadiness(
    sessionId: string,
    customThresholds?: {
      minConceptsThreshold?: number;
      minEquationsThreshold?: number;
      minResourceSections?: number;
    }
  ): Promise<CompletionReadiness> {
    const requestId = crypto.randomUUID();
    logger.info('PROGRESS-SERVICE', 'Checking completion readiness', { sessionId }, requestId);

    try {
      const { data, error } = await this.supabase
        .rpc('check_session_completion_readiness', {
          session_uuid: sessionId,
          min_concepts_threshold: customThresholds?.minConceptsThreshold || 0.8,
          min_equations_threshold: customThresholds?.minEquationsThreshold || 1,
          min_resource_sections: customThresholds?.minResourceSections || 1
        });

      if (error) {
        logger.error('PROGRESS-SERVICE', 'Failed to check completion readiness', { error }, requestId);
        throw error;
      }

      const readiness = data?.[0] || {
        ready_for_completion: false,
        completion_percentage: 0,
        concepts_threshold_met: false,
        equations_threshold_met: false,
        resource_threshold_met: false,
        missing_requirements: ['No progress data found']
      };

      return {
        readyForCompletion: readiness.ready_for_completion,
        completionPercentage: readiness.completion_percentage,
        conceptsThresholdMet: readiness.concepts_threshold_met,
        equationsThresholdMet: readiness.equations_threshold_met,
        resourceThresholdMet: readiness.resource_threshold_met,
        missingRequirements: readiness.missing_requirements || []
      };
    } catch (error) {
      logger.error('PROGRESS-SERVICE', 'Failed to check completion readiness', { error }, requestId);
      throw error;
    }
  }

  /**
   * Get detailed progress timeline for a session
   */
  async getProgressTimeline(sessionId: string): Promise<ConceptProgress[]> {
    const requestId = crypto.randomUUID();
    logger.info('PROGRESS-SERVICE', 'Getting progress timeline', { sessionId }, requestId);

    try {
      const { data, error } = await this.supabase
        .from('lesson_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('PROGRESS-SERVICE', 'Failed to get progress timeline', { error }, requestId);
        throw error;
      }

      return (data || []).map(progress => ({
        id: progress.id,
        conceptName: progress.concept_name,
        deliveryStatus: progress.delivery_status,
        deliveryTimestamp: progress.delivery_timestamp,
        resourceSection: progress.resource_section,
        equationReferences: progress.equation_references || [],
        studentEngagementScore: progress.student_engagement_score,
        understandingVerified: progress.understanding_verified,
        notes: progress.notes
      }));
    } catch (error) {
      logger.error('PROGRESS-SERVICE', 'Failed to get progress timeline', { error }, requestId);
      throw error;
    }
  }
}
