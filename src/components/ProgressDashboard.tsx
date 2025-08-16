import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  Calculator, 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export interface ProgressSummary {
  progressPercentage: number;
  deliveredConcepts: number;
  totalConcepts: number;
  equationsCount: number;
  resourceSectionsCovered: number;
  avgEngagementScore: number;
  sessionDuration: number;
  lastActivity: string;
}

export interface CompletionValidation {
  canComplete: boolean;
  validationPassed: boolean;
  progressSummary: ProgressSummary;
  thresholds: {
    minConceptsCoverage: number;
    minEquationsCoverage: number;
    minResourceSections: number;
    minEngagementScore: number;
  };
  validationResults: {
    conceptsThresholdMet: boolean;
    equationsThresholdMet: boolean;
    resourceThresholdMet: boolean;
    engagementThresholdMet: boolean;
  };
  missingRequirements: string[];
  recommendations: string[];
  estimatedTimeToCompletion?: number;
}

export interface ProgressDashboardProps {
  sessionId: string;
  onSessionComplete?: () => void;
  onContinueLesson?: () => void;
  className?: string;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  sessionId,
  onSessionComplete,
  onContinueLesson,
  className = ''
}) => {
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [completionValidation, setCompletionValidation] = useState<CompletionValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch progress summary
  const fetchProgressSummary = async () => {
    try {
      const response = await fetch(`/api/tutor/progress?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress summary');
      }
      const data = await response.json();
      setProgressSummary(data.progressSummary);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to load progress data');
    }
  };

  // Validate session completion
  const validateCompletion = async () => {
    setValidating(true);
    try {
      const response = await fetch('/api/tutor/validate-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate completion');
      }
      
      const validation = await response.json();
      setCompletionValidation(validation);
      
      if (validation.canComplete) {
        toast.success('Session is ready for completion!');
      } else {
        toast.info(`${validation.missingRequirements.length} requirements remaining`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Validation failed: ${errorMessage}`);
    } finally {
      setValidating(false);
    }
  };

  // Auto-refresh progress data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchProgressSummary();
      setLoading(false);
    };

    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [sessionId, autoRefresh]);

  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  // Get engagement color
  const getEngagementColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get progress color
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!progressSummary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Progress Dashboard</CardTitle>
          <CardDescription>No progress data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lesson Progress Dashboard
              </CardTitle>
              <CardDescription>
                Real-time tracking of your learning progress
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? (
                  <PauseCircle className="h-4 w-4 mr-2" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProgressSummary}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {Math.round(progressSummary.progressPercentage)}%
              </div>
              <Progress 
                value={progressSummary.progressPercentage} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {progressSummary.deliveredConcepts} of {progressSummary.totalConcepts} concepts
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Concepts Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {progressSummary.deliveredConcepts}
              </div>
              <div className="text-xs text-muted-foreground">
                Total: {progressSummary.totalConcepts}
              </div>
              <Badge variant={progressSummary.deliveredConcepts >= progressSummary.totalConcepts * 0.8 ? 'default' : 'secondary'}>
                {progressSummary.deliveredConcepts >= progressSummary.totalConcepts * 0.8 ? 'On Track' : 'In Progress'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Equations & Formulas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {progressSummary.equationsCount}
              </div>
              <div className="text-xs text-muted-foreground">
                Mathematical content
              </div>
              <Badge variant={progressSummary.equationsCount >= 3 ? 'default' : 'secondary'}>
                {progressSummary.equationsCount >= 3 ? 'Good Coverage' : 'Building Up'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatDuration(progressSummary.sessionDuration || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                Active learning time
              </div>
              <Badge variant="outline">
                {progressSummary.sessionDuration >= 10 ? 'Sufficient' : 'Continue Learning'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Progress Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="completion">Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress Breakdown</CardTitle>
              <CardDescription>
                Detailed view of your progress across different areas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Concepts Mastery</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((progressSummary.deliveredConcepts / progressSummary.totalConcepts) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(progressSummary.deliveredConcepts / progressSummary.totalConcepts) * 100} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resource Coverage</span>
                  <span className="text-sm text-muted-foreground">
                    {progressSummary.resourceSectionsCovered} sections
                  </span>
                </div>
                <Progress 
                  value={Math.min((progressSummary.resourceSectionsCovered / 4) * 100, 100)} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mathematical Content</span>
                  <span className="text-sm text-muted-foreground">
                    {progressSummary.equationsCount} equations
                  </span>
                </div>
                <Progress 
                  value={Math.min((progressSummary.equationsCount / 5) * 100, 100)} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>
                How well you're understanding and engaging with the content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Engagement Score</span>
                  <span className={`text-lg font-bold ${getEngagementColor(progressSummary.avgEngagementScore)}`}>
                    {Math.round(progressSummary.avgEngagementScore * 100)}%
                  </span>
                </div>
                <Progress 
                  value={progressSummary.avgEngagementScore * 100} 
                  className="h-3"
                />
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">85%</div>
                    <div className="text-xs text-muted-foreground">Comprehension</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">78%</div>
                    <div className="text-xs text-muted-foreground">Participation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">92%</div>
                    <div className="text-xs text-muted-foreground">Retention</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Session Completion Status
              </CardTitle>
              <CardDescription>
                Check if your session meets completion requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={validateCompletion}
                  disabled={validating}
                  className="flex-1"
                >
                  {validating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {validating ? 'Validating...' : 'Check Completion Status'}
                </Button>
                
                {onContinueLesson && (
                  <Button 
                    variant="outline" 
                    onClick={onContinueLesson}
                    className="flex-1"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Continue Lesson
                  </Button>
                )}
              </div>
              
              {completionValidation && (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {completionValidation.canComplete 
                        ? 'Your session is ready for completion!' 
                        : `${completionValidation.missingRequirements.length} requirements remaining`
                      }
                    </AlertDescription>
                  </Alert>
                  
                  {completionValidation.missingRequirements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Missing Requirements:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {completionValidation.missingRequirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-3 w-3 mt-0.5 text-yellow-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {completionValidation.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recommendations:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {completionValidation.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <TrendingUp className="h-3 w-3 mt-0.5 text-blue-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {completionValidation.canComplete && onSessionComplete && (
                    <Button 
                      onClick={onSessionComplete}
                      className="w-full"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Session
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressDashboard;