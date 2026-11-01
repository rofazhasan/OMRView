export type QuestionType = 
  | 'QTYPE_MCQ4' 
  | 'QTYPE_MCQ5' 
  | 'QTYPE_MCQ4_RTL' 
  | 'QTYPE_MCQ5_RTL' 
  | 'QTYPE_INT' 
  | 'QTYPE_INT_FROM_1'
  | 'CUSTOM';

export interface FieldBlock {
  fieldType?: QuestionType | string;
  origin: [number, number];
  fieldLabels: string[];
  bubblesGap: number;
  labelsGap: number;
  bubbleValues?: string[];
  direction?: 'horizontal' | 'vertical' | string;
  bubbleDimensions?: [number, number];
  emptyValue?: string;
  section?: string;
}

export interface TemplatePreprocessor {
  name: 'CropOnMarkers' | 'CropPage' | 'FeatureBasedAlignment' | string;
  options?: Record<string, any>;
}

export interface Template {
  pageDimensions: [number, number];
  bubbleDimensions: [number, number];
  fieldBlocks: Record<string, FieldBlock>;
  customLabels?: Record<string, string[]>;
  outputColumns?: string[];
  emptyValue?: string;
  preProcessors?: TemplatePreprocessor[];
}

export interface BubblePoint {
  x: number;
  y: number;
  label: string;
  value: string;
  section?: string;
}

export interface BubbleDetectionResult extends BubblePoint {
  meanVal: number;
  confidence: number;
  isMarked: boolean;
  rect: { x: number; y: number; width: number; height: number };
  fillRatio?: number;
}

export interface StateMachineAuditReport {
  finalState: string;
  stepCount: number;
  totalLatencyNs: number;
  averageTransitionNs: number;
  lyapunovFinalEnergy: number;
  history: {
    step: number;
    from: string;
    to: string;
    event: string;
    latencyNs: number;
  }[];
}

export interface ScanProcessingResult {
  sheetId: string;
  filename: string;
  timestamp: number;
  responses: Record<string, string[]>;
  concatenatedResponses: Record<string, string>;
  bubbleDetections: BubbleDetectionResult[];
  thresholdUsed: number;
  markersDetected: boolean;
  skewAngle: number;
  status: 'SUCCESS' | 'FLAGGED' | 'FAILED';
  flags: string[];
  warpedImageCanvas?: HTMLCanvasElement;
  stateMachineAudit?: StateMachineAuditReport;
}

export interface MarkingScheme {
  correct: number;
  incorrect: number;
  unmarked: number;
  bonus?: number;
}

export interface SectionMarkingRule {
  sectionName: string;
  marking: MarkingScheme;
  questions: string[];
}

export interface EvaluationConfig {
  examName: string;
  examCode?: string;
  totalMarks?: number;
  answerKey: Record<string, string | string[] | [string, number][]>;
  multiSetAnswerKeys?: Record<string, Record<string, string | string[] | [string, number][]>>;
  markingSchemes?: Record<string, MarkingScheme>;
  sections?: Record<string, {
    questions: string[];
    markingScheme: string;
  }>;
  bonusQuestions?: string[];
  rollNumberField?: string;
  setNameField?: string;
}

export interface QuestionVerdict {
  question: string;
  studentAnswer: string;
  correctAnswer: string | string[] | [string, number][];
  verdict: 'correct' | 'incorrect' | 'unmarked' | 'bonus' | 'multi_marked';
  score: number;
  section: string;
}

export interface StudentScoreCard {
  sheetId: string;
  filename: string;
  rollNumber: string;
  studentName?: string;
  examSet: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  rank?: number;
  percentile?: number;
  correctCount: number;
  incorrectCount: number;
  unmarkedCount: number;
  sectionScores: Record<string, { score: number; max: number; correct: number; total: number }>;
  questionVerdicts: Record<string, QuestionVerdict>;
  flags: string[];
  needsReview: boolean;
  manualOverride?: boolean;
}

export interface ClassPsychometrics {
  totalCandidates: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  standardDeviation: number;
  passPercentage: number;
  gradeDistribution: {
    A: number; // >= 80%
    B: number; // 65-79%
    C: number; // 50-64%
    D: number; // 40-49%
    F: number; // < 40%
  };
  itemAnalysis: Record<string, {
    question: string;
    difficultyIndex: number; // p-value: proportion answering correctly
    discriminationIndex: number; // D: upper 27% vs lower 27%
    distractorCounts: Record<string, number>;
    classification: 'Ideal' | 'Too Easy' | 'Too Hard' | 'Poor Discriminator';
  }>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  sheetId: string;
  field: string;
  previousValue: string;
  newValue: string;
  reason: string;
  operator: string;
}

