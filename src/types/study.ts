export type MemphisAccent = 'pink' | 'teal' | 'yellow';

export type SubjectStatus = 'ready' | 'missing_material' | 'missing_folder' | 'malformed';

export type WeightageSource = 'stated' | 'estimated' | 'missing';

export type TopicPriority = 'high-yield' | 'core' | 'supporting';

export interface SourceFileMeta {
  filename: string;
  relativePath: string;
  pageCount: number;
  exampleCount: number;
  isCoursePlan: boolean;
  parseError: string | null;
}

export interface TopicLeaf {
  id: string;
  title: string;
  sourceFile: string;
  sourceRef: string;
  highYield: boolean;
}

export interface TopicGroup {
  id: string;
  title: string;
  sourceFile: string;
  sourceRef: string;
  priority: TopicPriority;
  leaves: TopicLeaf[];
}

export interface ModuleRecord {
  id: string;
  moduleNumber: number;
  coCode: string;
  track?: string | null;
  title: string;
  weightage: number;
  weightageUnit: string;
  weightageSource: WeightageSource;
  coursePlanHours: number | null;
  coursePlanMarks100: number | null;
  sourceFiles: string[];
  pageCount: number;
  exampleCount: number;
  sourceGapNote: string | null;
  prerequisites: string[];
  topicGroups: TopicGroup[];
}

export interface PyqExamPaper {
  id: string;
  filename: string;
  relativePath: string;
  examLabel: string;
  examDate: string;
  courseCode: string;
  maxMarks: number;
  pageCount: number;
  questionCount: number;
  examSessionKey?: string;
}

export interface PyqQuestionAppearance {
  examId: string;
  examLabel: string;
  questionRef: string;
  marks: number | null;
  sourceFile: string;
  page: number;
  detail: string;
  similarity: 'exact' | 'exact-circuit' | 'variant';
}

export interface RepeatedPyqQuestion {
  id: string;
  title: string;
  moduleId: string;
  coCode: string;
  track?: string | null;
  blueprintMarks: number;
  appearanceCount: number;
  examPaperCount: number;
  cumulativeMarks: number;
  matchType: 'exact' | 'exact-circuit' | 'variant';
  summaryCue: string;
  appearances: PyqQuestionAppearance[];
}

export interface RepeatedPyqTopic {
  id: string;
  title: string;
  moduleId: string;
  coCode: string;
  track?: string | null;
  blueprintMarks: number;
  paperHits: number;
  totalPapers: number;
  questionCount: number;
  cumulativeMarks: number;
  strategyVerdict: 'Must-Do Core' | 'Template Drill' | 'High-ROI Focus' | 'Fast MCQ Lock';
  summary: string;
  sourceFile?: string;
  page?: number;
}

export interface ReverseStrategyInsight {
  id: string;
  verdict: string;
  accent: MemphisAccent;
  headline: string;
  metric: string;
  detail: string;
}

export interface PyqAnalysisSummary {
  totalPdfCount: number;
  totalExamSessions: number;
  totalQuestionsScanned: number;
  repeatedQuestionCount: number;
  repeatedTopicCount: number;
  papers: PyqExamPaper[];
  repeatedQuestions: RepeatedPyqQuestion[];
  repeatedTopics: RepeatedPyqTopic[];
  reverseStrategy: ReverseStrategyInsight[];
}

export interface SubjectRecord {
  id: string;
  folderName: string;
  shortName: string;
  fullName: string;
  courseCode: string;
  accentColor: MemphisAccent;
  tagline: string;
  status: SubjectStatus;
  statusMessage: string;
  weightageScaleLabel: string;
  weightageSource: WeightageSource;
  weightageBasis: string;
  totalWeightage: number;
  sourceFiles: SourceFileMeta[];
  parseWarnings: string[];
  modules: ModuleRecord[];
  pyqAnalysis?: PyqAnalysisSummary | null;
}

export interface StudyDataset {
  schemaVersion: string;
  generatedAt: string;
  studyRootName: string;
  subjects: SubjectRecord[];
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  subjectId?: string;
  message: string;
}

export interface ParsedDatasetResult {
  dataset: StudyDataset;
  issues: ValidationIssue[];
  hasFatalError: boolean;
}

export interface RankedModule extends ModuleRecord {
  rank: number;
  weightagePercent: number;
  cumulativeWeightage: number;
  cumulativePercent: number;
  tier: 'Tier 1: High-Yield Core' | 'Tier 2: High-Leverage Foundations' | 'Tier 3: Targeted Review';
}

export interface StrategyStep {
  order: number;
  moduleId: string;
  moduleNumber: number;
  coCode: string;
  track?: string | null;
  title: string;
  weightage: number;
  weightagePercent: number;
  weightageSource: WeightageSource;
  cumulativePercent: number;
  allocatedHours: number;
  tier: RankedModule['tier'];
  recommendedFocus: string[];
  skipIfRushed: string[];
  rationale: string;
  sourceFiles: string[];
}

export interface StudyStrategy {
  subjectId: string;
  availableHours: number;
  totalWeightage: number;
  hasEstimatedWeights: boolean;
  topTwoCoveragePercent: number;
  headline: string;
  reasoningSummary: string[];
  steps: StrategyStep[];
}

export interface MindMapNodeData {
  id: string;
  parentId: string | null;
  level: 0 | 1 | 2 | 3;
  title: string;
  subtitle?: string;
  badge?: string;
  accent: MemphisAccent | 'black';
  weightage?: number;
  weightageSource?: WeightageSource;
  coCode?: string;
  track?: string | null;
  rank?: number;
  sourceFile?: string;
  sourceRef?: string;
  sourceGapNote?: string | null;
  highYield?: boolean;
  children: MindMapNodeData[];
}

export interface TrackReadiness {
  track: string;
  label: string;
  earnedMarks: number;
  totalMarks: number;
  percent: number;
}

export interface ExamReadinessSummary {
  earnedMarks: number;
  totalMarks: number;
  percent: number;
  unitLabel: string;
  completedModules: number;
  totalModules: number;
  tracks: TrackReadiness[];
}

export interface FormulaShortcut {
  id: string;
  moduleId: string;
  moduleNumber: number;
  coCode: string;
  track: string | null;
  title: string;
  formulaCue: string;
  sourceFile: string;
  page: number;
}

export interface MindMapSearchResult {
  id: string;
  title: string;
  level: 0 | 1 | 2 | 3;
  subtitle?: string;
  moduleTitle?: string;
  coCode?: string;
  track?: string | null;
  ancestorIds: string[];
}

export interface PositionedMindMapNode {
  data: MindMapNodeData;
  x: number;
  y: number;
  width: number;
  height: number;
  childCount: number;
  isExpanded: boolean;
  direction: 'left' | 'right' | 'center';
}

export interface MindMapEdge {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  accent: MemphisAccent | 'black';
}

export interface MindMapLayout {
  nodes: PositionedMindMapNode[];
  edges: MindMapEdge[];
  width: number;
  height: number;
}
