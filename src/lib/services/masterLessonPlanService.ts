import { createClient } from '@/utils/supabase/client';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LearningObjective {
  id: string;
  description: string;
  level: 'basic' | 'intermediate' | 'advanced';
  assessmentCriteria: string[];
}

export interface ConceptNode {
  id: string;
  name: string;
  description: string;
  prerequisites: string[];
  dependents: string[];
  importance: 'core' | 'supporting' | 'enrichment';
}

export interface ContentSection {
  id: string;
  title: string;
  description: string;
  concepts: string[];
  estimatedMinutes: number;
  resourceReferences: string[];
}

export interface ChunkStructure {
  chunkIndex: number;
  title: string;
  objectives: string[];
  concepts: string[];
  contentSections: string[];
  estimatedMinutes: number;
  chunkType: 'introduction' | 'core_content' | 'practice' | 'assessment' | 'synthesis';
  prerequisites: string[];
}

export interface MasterLessonPlan {
  id?: string;
  subjectId: string;
  topicId: string;
  title: string;
  description: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedDurationMinutes: number;
  learningObjectives: LearningObjective[];
  prerequisiteConcepts: string[];
  coreConcepts: ConceptNode[];
  conceptHierarchy: Record<string, string[]>;
  contentSections: ContentSection[];
  keyEquations: Array<{
    id: string;
    equation: string;
    description: string;
    applications: string[];
  }>;
  practicalApplications: Array<{
    id: string;
    title: string;
    description: string;
    realWorldContext: string;
  }>;
  recommendedChunkCount: number;
  chunkStructure: ChunkStructure[];
  assessmentCriteria: string[];
  knowledgeCheckpoints: Array<{
    chunkIndex: number;
    checkpointType: 'understanding' | 'application' | 'synthesis';
    criteria: string[];
  }>;
  resourceReferences: string[];
  contentCoverageMap: Record<string, string[]>;
  version: number;
}

export class MasterLessonPlanService {
  private supabase = createClient();

  /**
   * Get existing master lesson plan or create a new one
   */
  async getOrCreateMasterPlan(
    subjectId: string,
    topicId: string,
    subjectName: string,
    topicName: string,
    resourceContext: string
  ): Promise<MasterLessonPlan> {
    const requestId = crypto.randomUUID();
    logger.info('MASTER-LESSON-PLAN', 'Getting or creating master plan', {
      subjectId,
      topicId,
      subjectName,
      topicName
    }, requestId);

    try {
      // Check if master plan already exists
      const { data: existingPlan } = await this.supabase
        .rpc('get_or_create_master_lesson_plan', {
          subject_uuid: subjectId,
          topic_uuid: topicId
        });

      if (existingPlan) {
        logger.info('MASTER-LESSON-PLAN', 'Found existing master plan', {
          planId: existingPlan
        }, requestId);
        
        const { data: planData } = await this.supabase
          .from('master_lesson_plans')
          .select('*')
          .eq('id', existingPlan)
          .single();

        if (planData) {
          return this.convertDbToMasterPlan(planData);
        }
      }

      // Create new master lesson plan
      logger.info('MASTER-LESSON-PLAN', 'Creating new master plan', {}, requestId);
      return await this.generateMasterPlan(
        subjectId,
        topicId,
        subjectName,
        topicName,
        resourceContext,
        requestId
      );
    } catch (error) {
      logger.error('MASTER-LESSON-PLAN', 'Error getting/creating master plan', { error }, requestId);
      throw error;
    }
  }

  /**
   * Generate a comprehensive master lesson plan using AI
   */
  private async generateMasterPlan(
    subjectId: string,
    topicId: string,
    subjectName: string,
    topicName: string,
    resourceContext: string,
    requestId: string
  ): Promise<MasterLessonPlan> {
    logger.openai('Generating master lesson plan', {}, requestId);

    const prompt = `You are an expert educational designer creating a comprehensive MASTER LESSON PLAN for "${topicName}" in ${subjectName}.

**Available Educational Resources:**
${resourceContext || 'No specific resources provided - use your general knowledge.'}

**CRITICAL REQUIREMENTS:**
- Use ONLY the provided educational resources above as your knowledge base
- Create a detailed, reusable master plan that can be stored and referenced
- Design for variable chunk delivery (2-8 chunks based on complexity):
  * Simple topics: 2-3 chunks (8-12 minutes each)
  * Moderate topics: 4-5 chunks (6-10 minutes each)
  * Complex topics: 6-8 chunks (4-8 minutes each)
- Determine chunk count based on:
  * Number of core concepts to cover
  * Complexity of mathematical formulas/equations
  * Amount of practice needed
  * Prerequisite knowledge requirements

**ENHANCED CORE FUNDAMENTALS FOCUS:**
- ALWAYS identify and prioritize the 3-5 most fundamental concepts that students MUST understand
- Build concept hierarchy from basic principles to advanced applications
- Ensure each core concept has clear prerequisites and learning progression
- Include specific examples and analogies that make abstract concepts concrete
- Map mathematical formulas to their conceptual meaning and real-world significance
- Design assessment criteria that test deep understanding, not just memorization
- Create knowledge checkpoints that verify mastery before advancing
- Include comprehensive learning objectives and concept hierarchies
- Map content to specific resource sections

**Response Format (JSON only):**
{
  "title": "Comprehensive lesson title",
  "description": "Detailed description of what this lesson covers",
  "difficultyLevel": "beginner|intermediate|advanced",
  "estimatedDurationMinutes": 45,
  "learningObjectives": [
    {
      "id": "obj1",
      "description": "Specific, measurable learning goal",
      "level": "basic|intermediate|advanced",
      "assessmentCriteria": ["How to measure this objective"]
    }
  ],
  "prerequisiteConcepts": ["Required prior knowledge"],
  "coreConcepts": [
    {
      "id": "concept1",
      "name": "Concept name",
      "description": "Detailed concept description",
      "prerequisites": ["concept_ids"],
      "dependents": ["concept_ids"],
      "importance": "core|supporting|enrichment"
    }
  ],
  "conceptHierarchy": {
    "concept1": ["dependent_concepts"],
    "concept2": ["dependent_concepts"]
  },
  "contentSections": [
    {
      "id": "section1",
      "title": "Section title",
      "description": "What this section covers",
      "concepts": ["concept_ids"],
      "estimatedMinutes": 10,
      "resourceReferences": ["resource_sections"]
    }
  ],
  "keyEquations": [
    {
      "id": "eq1",
      "equation": "Mathematical formula",
      "description": "What this equation represents",
      "applications": ["Where this is used"]
    }
  ],
  "practicalApplications": [
    {
      "id": "app1",
      "title": "Application title",
      "description": "How concept applies in practice",
      "realWorldContext": "Real-world scenario"
    }
  ],
  "recommendedChunkCount": "2-8 based on complexity",
  "chunkStructure": [
    {
      "chunkIndex": 0,
      "title": "Introduction and Foundation",
      "objectives": ["obj_ids"],
      "concepts": ["concept_ids"],
      "contentSections": ["section_ids"],
      "estimatedMinutes": 8,
      "chunkType": "introduction|core_content|practice|assessment|synthesis",
      "prerequisites": []
    }
    // Add 1-7 more chunks based on topic complexity and content depth
  ],
  "assessmentCriteria": ["How to measure overall understanding"],
  "knowledgeCheckpoints": [
    {
      "chunkIndex": 2,
      "checkpointType": "understanding|application|synthesis",
      "criteria": ["What to check at this point"]
    }
  ],
  "resourceReferences": ["List of all referenced resources"],
  "contentCoverageMap": {
    "resource1": ["sections_covered"],
    "resource2": ["sections_covered"]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational designer. Always respond with valid JSON only. Create comprehensive, detailed master lesson plans that focus on core fundamentals and can be reused across multiple sessions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent, structured output
      max_tokens: 4000
    });

    logger.openai('Master plan generation completed', {
      model: completion.model,
      usage: completion.usage
    }, requestId);

    let masterPlan: Partial<MasterLessonPlan>;
    try {
      const rawContent = completion.choices[0].message.content || '{}';
      const cleanedContent = this.extractJsonFromMarkdown(rawContent);
      masterPlan = JSON.parse(cleanedContent);
    } catch (parseError) {
      logger.error('MASTER-LESSON-PLAN', 'Failed to parse master plan JSON', {
        error: parseError,
        rawContent: completion.choices[0].message.content
      }, requestId);
      throw new Error('Failed to generate master lesson plan');
    }

    // Add metadata
    const completeMasterPlan: MasterLessonPlan = {
      ...masterPlan,
      subjectId,
      topicId,
      version: 1
    } as MasterLessonPlan;

    // Save to database - match actual schema structure
    const { data: savedPlan, error } = await this.supabase
      .from('master_lesson_plans')
      .insert({
        subject_id: subjectId,
        topic_id: topicId,
        chapter_title: completeMasterPlan.title, // Use title as chapter_title
        title: completeMasterPlan.title,
        description: completeMasterPlan.description,
        difficulty_level: completeMasterPlan.difficultyLevel,
        estimated_duration_minutes: completeMasterPlan.estimatedDurationMinutes,
        learning_objectives: completeMasterPlan.learningObjectives?.map(obj => obj.description) || [],
        prerequisite_concepts: completeMasterPlan.prerequisiteConcepts,
        core_concepts: completeMasterPlan.coreConcepts,
        concept_hierarchy: completeMasterPlan.conceptHierarchy,
        content_sections: completeMasterPlan.contentSections,
        key_equations: completeMasterPlan.keyEquations,
        practical_applications: completeMasterPlan.practicalApplications,
        recommended_chunk_count: completeMasterPlan.recommendedChunkCount,
        chunk_structure: completeMasterPlan.chunkStructure,
        assessment_criteria: completeMasterPlan.assessmentCriteria,
        knowledge_checkpoints: completeMasterPlan.knowledgeCheckpoints,
        resource_references: completeMasterPlan.resourceReferences,
        content_coverage_map: completeMasterPlan.contentCoverageMap,
        // Required fields based on actual schema
        comprehensive_plan: {
          title: completeMasterPlan.title,
          description: completeMasterPlan.description,
          learningObjectives: completeMasterPlan.learningObjectives,
          coreConcepts: completeMasterPlan.coreConcepts
        },
        chunks: completeMasterPlan.chunkStructure || [],
        key_concepts: completeMasterPlan.coreConcepts?.map(concept => concept.name) || [],
        version: 1
      })
      .select()
      .single();

    if (error) {
      logger.error('MASTER-LESSON-PLAN', 'Failed to save master plan', { error }, requestId);
      throw error;
    }

    logger.info('MASTER-LESSON-PLAN', 'Master plan created and saved', {
      planId: savedPlan.id,
      chunkCount: completeMasterPlan.recommendedChunkCount
    }, requestId);

    return { ...completeMasterPlan, id: savedPlan.id };
  }

  /**
   * Convert database record to MasterLessonPlan interface
   */
  private convertDbToMasterPlan(dbRecord: any): MasterLessonPlan {
    return {
      id: dbRecord.id,
      subjectId: dbRecord.subject_id,
      topicId: dbRecord.topic_id,
      title: dbRecord.title,
      description: dbRecord.description,
      difficultyLevel: dbRecord.difficulty_level,
      estimatedDurationMinutes: dbRecord.estimated_duration_minutes,
      learningObjectives: dbRecord.learning_objectives || [],
      prerequisiteConcepts: dbRecord.prerequisite_concepts || [],
      coreConcepts: dbRecord.core_concepts || [],
      conceptHierarchy: dbRecord.concept_hierarchy || {},
      contentSections: dbRecord.content_sections || [],
      keyEquations: dbRecord.key_equations || [],
      practicalApplications: dbRecord.practical_applications || [],
      recommendedChunkCount: dbRecord.recommended_chunk_count || 3,
      chunkStructure: dbRecord.chunk_structure || [],
      assessmentCriteria: dbRecord.assessment_criteria || [],
      knowledgeCheckpoints: dbRecord.knowledge_checkpoints || [],
      resourceReferences: dbRecord.resource_references || [],
      contentCoverageMap: dbRecord.content_coverage_map || {},
      version: dbRecord.version || 1
    };
  }

  /**
   * Extract JSON from markdown code blocks
   */
  private extractJsonFromMarkdown(content: string): string {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    return content.trim();
  }
}

export const masterLessonPlanService = new MasterLessonPlanService();