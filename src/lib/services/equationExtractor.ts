import { logger } from '@/lib/logger';

export interface ExtractedEquation {
  id: string;
  content: string;
  type: 'latex_display' | 'latex_inline' | 'mathematical_expression' | 'formula' | 'theorem';
  context: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  variables: string[];
  operators: string[];
  sourceSection?: string;
  lineNumber?: number;
  confidence: number;
}

export interface EquationExtractionResult {
  equations: ExtractedEquation[];
  totalFound: number;
  byType: Record<string, number>;
  byComplexity: Record<string, number>;
  processingTime: number;
  confidence: number;
}

export interface MathematicalConcept {
  name: string;
  equations: string[];
  description?: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  prerequisites: string[];
}

class EquationExtractor {
  private readonly latexDisplayPattern = /\$\$([^$]+)\$\$/g;
  private readonly latexInlinePattern = /\$([^$]+)\$/g;
  private readonly latexBracketDisplayPattern = /\\\[([^\]]+)\\\]/g;
  private readonly latexBracketInlinePattern = /\\\(([^\)]+)\\\)/g;
  
  // Enhanced mathematical expression patterns
  private readonly mathExpressionPatterns = [
    // Equations with equals sign
    /(?:^|\s)([a-zA-Z][a-zA-Z0-9_]*\s*[=]\s*[^.!?\n]{3,100})/gm,
    // Inequalities
    /(?:^|\s)([a-zA-Z][a-zA-Z0-9_]*\s*[<>≤≥≠]\s*[^.!?\n]{3,100})/gm,
    // Functions
    /(?:^|\s)([a-zA-Z][a-zA-Z0-9_]*\s*\([^\)]+\)\s*[=<>≤≥]\s*[^.!?\n]{3,100})/gm,
    // Mathematical operations with variables
    /(?:^|\s)((?:[a-zA-Z][a-zA-Z0-9_]*\s*[+\-×÷∗/]\s*)+[a-zA-Z][a-zA-Z0-9_]*[^.!?\n]{0,50})/gm,
    // Summations, integrals, products
    /(?:^|\s)([∑∏∫∂∇][^.!?\n]{3,100})/gm,
    // Fractions and ratios
    /(?:^|\s)([a-zA-Z][a-zA-Z0-9_]*\/[a-zA-Z][a-zA-Z0-9_]*[^.!?\n]{0,50})/gm,
    // Powers and exponents
    /(?:^|\s)([a-zA-Z][a-zA-Z0-9_]*\^[a-zA-Z0-9_]+[^.!?\n]{0,50})/gm
  ];
  
  // Common mathematical operators and symbols
  private readonly operators = [
    '+', '-', '×', '÷', '*', '/', '=', '<', '>', '≤', '≥', '≠', '±', '∓',
    '∑', '∏', '∫', '∂', '∇', '^', '√', '∞', 'π', 'θ', 'α', 'β', 'γ', 'δ',
    'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'min'
  ];
  
  // Complexity indicators
  private readonly complexityIndicators = {
    basic: ['addition', 'subtraction', 'multiplication', 'division', 'basic', 'simple', 'elementary'],
    intermediate: ['derivative', 'integral', 'function', 'equation', 'solve', 'calculate', 'formula'],
    advanced: ['differential', 'partial', 'complex', 'theorem', 'proof', 'advanced', 'matrix', 'vector']
  };

  /**
   * Extract equations from text content with comprehensive analysis
   */
  async extractEquations(content: string, sourceSection?: string): Promise<EquationExtractionResult> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    logger.info('EQUATION-EXTRACTOR', 'Starting equation extraction', {
      contentLength: content.length,
      sourceSection
    }, requestId);

    try {
      const equations: ExtractedEquation[] = [];
      const lines = content.split('\n');
      
      // Extract LaTeX display equations
      await this.extractLatexEquations(content, equations, 'latex_display', this.latexDisplayPattern, lines, sourceSection);
      
      // Extract LaTeX inline equations
      await this.extractLatexEquations(content, equations, 'latex_inline', this.latexInlinePattern, lines, sourceSection);
      
      // Extract LaTeX bracket equations
      await this.extractLatexEquations(content, equations, 'latex_display', this.latexBracketDisplayPattern, lines, sourceSection);
      await this.extractLatexEquations(content, equations, 'latex_inline', this.latexBracketInlinePattern, lines, sourceSection);
      
      // Extract mathematical expressions
      for (const pattern of this.mathExpressionPatterns) {
        await this.extractMathExpressions(content, equations, pattern, lines, sourceSection);
      }
      
      // Extract formulas and theorems from context
      await this.extractFormulasAndTheorems(content, equations, lines, sourceSection);
      
      // Remove duplicates and enhance equations
      const uniqueEquations = this.removeDuplicatesAndEnhance(equations);
      
      // Calculate statistics
      const byType = this.calculateTypeDistribution(uniqueEquations);
      const byComplexity = this.calculateComplexityDistribution(uniqueEquations);
      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(uniqueEquations);
      
      const result: EquationExtractionResult = {
        equations: uniqueEquations,
        totalFound: uniqueEquations.length,
        byType,
        byComplexity,
        processingTime,
        confidence
      };
      
      logger.info('EQUATION-EXTRACTOR', 'Equation extraction completed', {
        totalFound: result.totalFound,
        byType: result.byType,
        byComplexity: result.byComplexity,
        processingTime: result.processingTime,
        confidence: result.confidence
      }, requestId);
      
      return result;
    } catch (error) {
      logger.error('EQUATION-EXTRACTOR', 'Failed to extract equations', { error }, requestId);
      throw error;
    }
  }

  /**
   * Extract LaTeX equations
   */
  private async extractLatexEquations(
    content: string,
    equations: ExtractedEquation[],
    type: 'latex_display' | 'latex_inline',
    pattern: RegExp,
    lines: string[],
    sourceSection?: string
  ): Promise<void> {
    let match;
    pattern.lastIndex = 0; // Reset regex state
    
    while ((match = pattern.exec(content)) !== null) {
      const equationContent = match[1].trim();
      if (equationContent.length < 2 || equationContent.length > 500) continue;
      
      const lineNumber = this.findLineNumber(content, match.index, lines);
      const context = this.extractContext(lines, lineNumber, 2);
      
      const equation: ExtractedEquation = {
        id: crypto.randomUUID(),
        content: equationContent,
        type,
        context,
        complexity: this.determineComplexity(equationContent, context),
        variables: this.extractVariables(equationContent),
        operators: this.extractOperators(equationContent),
        sourceSection,
        lineNumber,
        confidence: this.calculateConfidence(equationContent, type, context)
      };
      
      equations.push(equation);
    }
  }

  /**
   * Extract mathematical expressions
   */
  private async extractMathExpressions(
    content: string,
    equations: ExtractedEquation[],
    pattern: RegExp,
    lines: string[],
    sourceSection?: string
  ): Promise<void> {
    let match;
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      const expressionContent = match[1].trim();
      if (expressionContent.length < 3 || expressionContent.length > 200) continue;
      
      // Filter out common false positives
      if (this.isFalsePositive(expressionContent)) continue;
      
      const lineNumber = this.findLineNumber(content, match.index, lines);
      const context = this.extractContext(lines, lineNumber, 2);
      
      const equation: ExtractedEquation = {
        id: crypto.randomUUID(),
        content: expressionContent,
        type: 'mathematical_expression',
        context,
        complexity: this.determineComplexity(expressionContent, context),
        variables: this.extractVariables(expressionContent),
        operators: this.extractOperators(expressionContent),
        sourceSection,
        lineNumber,
        confidence: this.calculateConfidence(expressionContent, 'mathematical_expression', context)
      };
      
      equations.push(equation);
    }
  }

  /**
   * Extract formulas and theorems from context
   */
  private async extractFormulasAndTheorems(
    content: string,
    equations: ExtractedEquation[],
    lines: string[],
    sourceSection?: string
  ): Promise<void> {
    const formulaPatterns = [
      /(?:formula|theorem|lemma|corollary|proposition)[:\s]+([^.!?\n]{10,200})/gi,
      /(?:equation|expression)[:\s]+([^.!?\n]{10,200})/gi
    ];
    
    for (const pattern of formulaPatterns) {
      let match;
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        const formulaContent = match[1].trim();
        if (!this.containsMathematicalContent(formulaContent)) continue;
        
        const lineNumber = this.findLineNumber(content, match.index, lines);
        const context = this.extractContext(lines, lineNumber, 3);
        
        const type = match[0].toLowerCase().includes('theorem') ? 'theorem' : 'formula';
        
        const equation: ExtractedEquation = {
          id: crypto.randomUUID(),
          content: formulaContent,
          type: type as 'formula' | 'theorem',
          context,
          complexity: this.determineComplexity(formulaContent, context),
          variables: this.extractVariables(formulaContent),
          operators: this.extractOperators(formulaContent),
          sourceSection,
          lineNumber,
          confidence: this.calculateConfidence(formulaContent, type as any, context)
        };
        
        equations.push(equation);
      }
    }
  }

  /**
   * Remove duplicates and enhance equations
   */
  private removeDuplicatesAndEnhance(equations: ExtractedEquation[]): ExtractedEquation[] {
    const seen = new Set<string>();
    const unique: ExtractedEquation[] = [];
    
    for (const equation of equations) {
      const normalized = this.normalizeEquation(equation.content);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(equation);
      }
    }
    
    return unique.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Determine equation complexity
   */
  private determineComplexity(content: string, context: string): 'basic' | 'intermediate' | 'advanced' {
    const combined = (content + ' ' + context).toLowerCase();
    
    let scores = { basic: 0, intermediate: 0, advanced: 0 };
    
    Object.entries(this.complexityIndicators).forEach(([level, indicators]) => {
      indicators.forEach(indicator => {
        const matches = (combined.match(new RegExp(indicator, 'g')) || []).length;
        scores[level as keyof typeof scores] += matches;
      });
    });
    
    // Additional complexity scoring based on mathematical symbols
    if (/[∑∏∫∂∇]/.test(content)) scores.advanced += 3;
    if (/[√^]/.test(content)) scores.intermediate += 2;
    if (/[+\-*/=]/.test(content)) scores.basic += 1;
    
    const maxScore = Math.max(scores.basic, scores.intermediate, scores.advanced);
    if (maxScore === scores.advanced) return 'advanced';
    if (maxScore === scores.intermediate) return 'intermediate';
    return 'basic';
  }

  /**
   * Extract variables from equation
   */
  private extractVariables(content: string): string[] {
    const variables = new Set<string>();
    
    // Single letter variables
    const singleLetters = content.match(/\b[a-zA-Z]\b/g) || [];
    singleLetters.forEach(v => variables.add(v));
    
    // Multi-character variables
    const multiChar = content.match(/\b[a-zA-Z][a-zA-Z0-9_]+\b/g) || [];
    multiChar.forEach(v => {
      if (!this.operators.includes(v.toLowerCase())) {
        variables.add(v);
      }
    });
    
    return Array.from(variables);
  }

  /**
   * Extract operators from equation
   */
  private extractOperators(content: string): string[] {
    const foundOperators = new Set<string>();
    
    this.operators.forEach(op => {
      if (content.includes(op)) {
        foundOperators.add(op);
      }
    });
    
    return Array.from(foundOperators);
  }

  /**
   * Calculate confidence score for equation
   */
  private calculateConfidence(
    content: string,
    type: string,
    context: string
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Type-based confidence
    if (type.includes('latex')) confidence += 0.3;
    if (type === 'theorem' || type === 'formula') confidence += 0.2;
    
    // Content-based confidence
    if (/[=<>≤≥≠]/.test(content)) confidence += 0.2;
    if (/[∑∏∫∂∇]/.test(content)) confidence += 0.3;
    if (/\b[a-zA-Z]\b/.test(content)) confidence += 0.1;
    
    // Context-based confidence
    if (/(?:equation|formula|theorem|proof)/i.test(context)) confidence += 0.2;
    if (/(?:where|let|given)/i.test(context)) confidence += 0.1;
    
    // Penalize very short or very long content
    if (content.length < 5) confidence -= 0.2;
    if (content.length > 100) confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Check if content contains mathematical elements
   */
  private containsMathematicalContent(content: string): boolean {
    return /[=<>≤≥≠+\-*/^√∑∏∫∂∇]/.test(content) || 
           /\b[a-zA-Z]\s*[=<>≤≥≠]/.test(content) ||
           this.operators.some(op => content.includes(op));
  }

  /**
   * Check for false positives
   */
  private isFalsePositive(content: string): boolean {
    const falsePositives = [
      /^\d+[\s\-\.]*\d*$/, // Just numbers
      /^[a-zA-Z]+\s*=\s*[a-zA-Z]+$/, // Simple word assignments
      /^(and|or|if|then|else|when|where)\b/i, // Common words
      /^(page|chapter|section|figure)\s*\d+/i // References
    ];
    
    return falsePositives.some(pattern => pattern.test(content.trim()));
  }

  /**
   * Normalize equation for duplicate detection
   */
  private normalizeEquation(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[{}\[\]()]/g, '')
      .trim();
  }

  /**
   * Find line number for given position
   */
  private findLineNumber(content: string, position: number, lines: string[]): number {
    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length + 1; // +1 for newline
      if (currentPos > position) {
        return i + 1; // 1-based line numbers
      }
    }
    return lines.length;
  }

  /**
   * Extract context around line
   */
  private extractContext(lines: string[], lineNumber: number, radius: number): string {
    const start = Math.max(0, lineNumber - radius - 1);
    const end = Math.min(lines.length, lineNumber + radius);
    return lines.slice(start, end).join(' ').trim();
  }

  /**
   * Calculate type distribution
   */
  private calculateTypeDistribution(equations: ExtractedEquation[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    equations.forEach(eq => {
      distribution[eq.type] = (distribution[eq.type] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Calculate complexity distribution
   */
  private calculateComplexityDistribution(equations: ExtractedEquation[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    equations.forEach(eq => {
      distribution[eq.complexity] = (distribution[eq.complexity] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(equations: ExtractedEquation[]): number {
    if (equations.length === 0) return 0;
    const totalConfidence = equations.reduce((sum, eq) => sum + eq.confidence, 0);
    return totalConfidence / equations.length;
  }

  /**
   * Extract mathematical concepts from content
   */
  async extractMathematicalConcepts(content: string): Promise<MathematicalConcept[]> {
    const requestId = crypto.randomUUID();
    logger.info('EQUATION-EXTRACTOR', 'Extracting mathematical concepts', {}, requestId);

    try {
      const concepts: MathematicalConcept[] = [];
      const equationResult = await this.extractEquations(content);
      
      // Group equations by related concepts
      const conceptPatterns = [
        { name: 'Derivatives', keywords: ['derivative', 'differentiation', 'dx', 'dy'], difficulty: 'intermediate' as const },
        { name: 'Integrals', keywords: ['integral', 'integration', '∫'], difficulty: 'intermediate' as const },
        { name: 'Linear Algebra', keywords: ['matrix', 'vector', 'determinant'], difficulty: 'advanced' as const },
        { name: 'Trigonometry', keywords: ['sin', 'cos', 'tan', 'trigonometric'], difficulty: 'basic' as const },
        { name: 'Algebra', keywords: ['equation', 'solve', 'variable'], difficulty: 'basic' as const }
      ];
      
      conceptPatterns.forEach(pattern => {
        const relatedEquations = equationResult.equations.filter(eq => 
          pattern.keywords.some(keyword => 
            eq.content.toLowerCase().includes(keyword) || 
            eq.context.toLowerCase().includes(keyword)
          )
        );
        
        if (relatedEquations.length > 0) {
          concepts.push({
            name: pattern.name,
            equations: relatedEquations.map(eq => eq.content),
            difficulty: pattern.difficulty,
            prerequisites: this.getPrerequisites(pattern.name)
          });
        }
      });
      
      logger.info('EQUATION-EXTRACTOR', 'Mathematical concepts extracted', {
        conceptsFound: concepts.length,
        totalEquations: equationResult.totalFound
      }, requestId);
      
      return concepts;
    } catch (error) {
      logger.error('EQUATION-EXTRACTOR', 'Failed to extract mathematical concepts', { error }, requestId);
      throw error;
    }
  }

  /**
   * Get prerequisites for mathematical concepts
   */
  private getPrerequisites(conceptName: string): string[] {
    const prerequisites: Record<string, string[]> = {
      'Derivatives': ['Algebra', 'Functions', 'Limits'],
      'Integrals': ['Derivatives', 'Functions'],
      'Linear Algebra': ['Algebra', 'Matrices'],
      'Trigonometry': ['Algebra', 'Geometry'],
      'Algebra': ['Basic Mathematics']
    };
    
    return prerequisites[conceptName] || [];
  }
}

export const equationExtractor = new EquationExtractor();
export default equationExtractor;