import type {
  MemphisAccent,
  ModuleRecord,
  ParsedDatasetResult,
  PyqAnalysisSummary,
  PyqExamPaper,
  PyqQuestionAppearance,
  RankedModule,
  RepeatedPyqQuestion,
  RepeatedPyqTopic,
  ResourceFileCategory,
  ResourceFileMeta,
  ReverseStrategyInsight,
  SourceFileMeta,
  StudyDataset,
  SubjectRecord,
  SubjectStatus,
  TopicGroup,
  TopicLeaf,
  ValidationIssue,
  WeightageSource,
} from '../types/study';

const VALID_ACCENTS: MemphisAccent[] = ['pink', 'teal', 'yellow'];
const VALID_STATUSES: SubjectStatus[] = ['ready', 'missing_material', 'missing_folder', 'malformed'];
const VALID_WEIGHT_SOURCES: WeightageSource[] = ['stated', 'estimated', 'missing'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asPositiveNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return fallback;
}

function asPositiveInt(value: unknown, fallback = 0): number {
  return Math.round(asPositiveNumber(value, fallback));
}

function parseTopicLeaf(raw: unknown, fallbackId: string, defaultSource: string): TopicLeaf | null {
  if (!isRecord(raw)) return null;
  const title = asNullableString(raw.title);
  if (!title) return null;

  return {
    id: asNonEmptyString(raw.id, fallbackId),
    title,
    sourceFile: asNonEmptyString(raw.sourceFile, defaultSource),
    sourceRef: asNonEmptyString(raw.sourceRef, 'Source notes'),
    highYield: Boolean(raw.highYield),
  };
}

function parseTopicGroup(
  raw: unknown,
  fallbackId: string,
  defaultSource: string,
  issues: ValidationIssue[],
  subjectId: string
): TopicGroup | null {
  if (!isRecord(raw)) {
    issues.push({ level: 'warning', subjectId, message: `Skipped malformed topic group ${fallbackId}.` });
    return null;
  }

  const title = asNullableString(raw.title);
  if (!title) {
    issues.push({ level: 'warning', subjectId, message: `Skipped topic group ${fallbackId} with missing title.` });
    return null;
  }

  const sourceFile = asNonEmptyString(raw.sourceFile, defaultSource);
  const rawLeaves = Array.isArray(raw.leaves) ? raw.leaves : [];
  const leaves = rawLeaves
    .map((leaf, idx) => parseTopicLeaf(leaf, `${fallbackId}-leaf-${idx + 1}`, sourceFile))
    .filter((leaf): leaf is TopicLeaf => leaf !== null);

  const priority =
    raw.priority === 'high-yield' || raw.priority === 'core' || raw.priority === 'supporting'
      ? raw.priority
      : 'core';

  return {
    id: asNonEmptyString(raw.id, fallbackId),
    title,
    sourceFile,
    sourceRef: asNonEmptyString(raw.sourceRef, 'Slides'),
    priority,
    leaves,
  };
}

function parseModule(
  raw: unknown,
  index: number,
  subjectId: string,
  issues: ValidationIssue[]
): ModuleRecord | null {
  if (!isRecord(raw)) {
    issues.push({ level: 'error', subjectId, message: `Module entry #${index + 1} is not an object.` });
    return null;
  }

  const title = asNullableString(raw.title);
  if (!title) {
    issues.push({ level: 'error', subjectId, message: `Module entry #${index + 1} is missing a title.` });
    return null;
  }

  const moduleNumber = asPositiveInt(raw.moduleNumber, index + 1) || index + 1;
  const moduleId = asNonEmptyString(raw.id, `${subjectId}-m${moduleNumber}`);
  const sourceFiles = Array.isArray(raw.sourceFiles)
    ? raw.sourceFiles.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];
  const defaultSource = sourceFiles[0] ?? 'Course material';

  const rawGroups = Array.isArray(raw.topicGroups) ? raw.topicGroups : [];
  const topicGroups = rawGroups
    .map((group, gIdx) => parseTopicGroup(group, `${moduleId}-g${gIdx + 1}`, defaultSource, issues, subjectId))
    .filter((group): group is TopicGroup => group !== null);

  const rawWeight = raw.weightage;
  const hasExplicitWeight = typeof rawWeight === 'number' && Number.isFinite(rawWeight) && rawWeight > 0;
  const weightageSource: WeightageSource =
    raw.weightageSource === 'stated' && hasExplicitWeight
      ? 'stated'
      : raw.weightageSource === 'estimated'
        ? 'estimated'
        : hasExplicitWeight
          ? 'stated'
          : 'estimated';

  if (typeof rawWeight === 'number' && (!Number.isFinite(rawWeight) || rawWeight < 0)) {
    issues.push({
      level: 'warning',
      subjectId,
      message: `Module ${moduleNumber} had invalid weightage (${String(rawWeight)}); falling back to volume estimate.`,
    });
  }

  return {
    id: moduleId,
    moduleNumber,
    coCode: asNonEmptyString(raw.coCode, `CO${moduleNumber}`),
    track: asNullableString(raw.track),
    title,
    weightage: hasExplicitWeight ? rawWeight : 0,
    weightageUnit: asNonEmptyString(raw.weightageUnit, 'marks'),
    weightageSource,
    coursePlanHours:
      typeof raw.coursePlanHours === 'number' && Number.isFinite(raw.coursePlanHours)
        ? raw.coursePlanHours
        : null,
    coursePlanMarks100:
      typeof raw.coursePlanMarks100 === 'number' && Number.isFinite(raw.coursePlanMarks100)
        ? raw.coursePlanMarks100
        : null,
    sourceFiles,
    pageCount: asPositiveInt(raw.pageCount, 0),
    exampleCount: asPositiveInt(raw.exampleCount, 0),
    sourceGapNote: asNullableString(raw.sourceGapNote),
    prerequisites: Array.isArray(raw.prerequisites)
      ? raw.prerequisites.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [],
    topicGroups,
  };
}

/**
 * Estimates module weightages when explicit weightages are absent or zero,
 * proportional to slide/page count, worked-example density, and topic richness.
 */
export function estimateMissingModuleWeightages(modules: ModuleRecord[]): ModuleRecord[] {
  const needsEstimation = modules.some((mod) => mod.weightage <= 0 || mod.weightageSource === 'estimated');
  if (!needsEstimation || modules.length === 0) {
    return modules;
  }

  const scores = modules.map((mod) => {
    const leafCount = mod.topicGroups.reduce((sum, grp) => sum + grp.leaves.length, 0);
    const pages = Math.max(1, mod.pageCount || mod.topicGroups.length * 10);
    return pages + 1.5 * mod.exampleCount + 2 * leafCount;
  });

  const totalScore = scores.reduce((sum, score) => sum + score, 0) || 1;

  return modules.map((mod, idx) => {
    if (mod.weightage > 0 && mod.weightageSource === 'stated') {
      return mod;
    }
    const estimated = Math.max(1, Math.round((scores[idx] / totalScore) * 100));
    return {
      ...mod,
      weightage: estimated,
      weightageUnit: '%',
      weightageSource: 'estimated',
      sourceGapNote:
        mod.sourceGapNote ??
        `Weightage estimated from ${mod.pageCount || 'available'} slides/pages and ${mod.exampleCount} worked examples.`,
    };
  });
}

function parseSourceFile(raw: unknown): SourceFileMeta | null {
  if (!isRecord(raw)) return null;
  const filename = asNullableString(raw.filename);
  if (!filename) return null;

  return {
    filename,
    relativePath: asNonEmptyString(raw.relativePath, filename),
    pageCount: asPositiveInt(raw.pageCount, 0),
    sizeBytes: typeof raw.sizeBytes === 'number' && Number.isFinite(raw.sizeBytes) && raw.sizeBytes >= 0 ? Math.round(raw.sizeBytes) : undefined,
    exampleCount: asPositiveInt(raw.exampleCount, 0),
    isCoursePlan: Boolean(raw.isCoursePlan),
    parseError: asNullableString(raw.parseError),
  };
}

const VALID_RESOURCE_CATEGORIES: ResourceFileCategory[] = [
  'pyq-summary',
  'pyq-solutions',
  'notes',
  'cheat-sheet',
  'other',
];

function parseResourceFile(raw: unknown, idx: number): ResourceFileMeta | null {
  if (!isRecord(raw)) return null;
  const filename = asNullableString(raw.filename);
  const relativePath = asNullableString(raw.relativePath);
  if (!filename || !relativePath) return null;

  const category: ResourceFileCategory = VALID_RESOURCE_CATEGORIES.includes(
    raw.category as ResourceFileCategory
  )
    ? (raw.category as ResourceFileCategory)
    : 'other';

  return {
    id: asNonEmptyString(raw.id, `resource-${idx + 1}`),
    title: asNonEmptyString(raw.title, filename),
    description: asNonEmptyString(raw.description, ''),
    filename,
    relativePath,
    category,
    badge: asNullableString(raw.badge),
    pageCount: asPositiveInt(raw.pageCount, 0),
    sizeBytes: asPositiveInt(raw.sizeBytes, 0),
  };
}

function parsePyqAppearance(raw: unknown): PyqQuestionAppearance | null {
  if (!isRecord(raw)) return null;
  const examLabel = asNullableString(raw.examLabel);
  const questionRef = asNullableString(raw.questionRef);
  const sourceFile = asNullableString(raw.sourceFile);
  if (!examLabel || !questionRef || !sourceFile) return null;

  const similarity =
    raw.similarity === 'exact' || raw.similarity === 'exact-circuit' || raw.similarity === 'variant'
      ? raw.similarity
      : 'variant';

  return {
    examId: asNonEmptyString(raw.examId, examLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    examLabel,
    questionRef,
    marks: typeof raw.marks === 'number' && Number.isFinite(raw.marks) ? raw.marks : null,
    sourceFile,
    page: Math.max(1, asPositiveInt(raw.page, 1)),
    detail: asNonEmptyString(raw.detail, questionRef),
    similarity,
  };
}

function parsePyqAnalysis(raw: unknown): PyqAnalysisSummary | null {
  if (!isRecord(raw)) return null;

  const papers: PyqExamPaper[] = Array.isArray(raw.papers)
    ? raw.papers
        .map((p): PyqExamPaper | null => {
          if (!isRecord(p)) return null;
          const filename = asNullableString(p.filename);
          const examLabel = asNullableString(p.examLabel);
          if (!filename || !examLabel) return null;
          return {
            id: asNonEmptyString(p.id, filename),
            filename,
            relativePath: asNonEmptyString(p.relativePath, `pyq/${filename}`),
            examLabel,
            examDate: asNonEmptyString(p.examDate, 'Unknown date'),
            courseCode: asNonEmptyString(p.courseCode, ''),
            maxMarks: asPositiveNumber(p.maxMarks, 0),
            pageCount: asPositiveInt(p.pageCount, 0),
            questionCount: asPositiveInt(p.questionCount, 0),
            examSessionKey: asNullableString(p.examSessionKey) ?? undefined,
          };
        })
        .filter((p): p is PyqExamPaper => p !== null)
    : [];

  const repeatedQuestions: RepeatedPyqQuestion[] = Array.isArray(raw.repeatedQuestions)
    ? raw.repeatedQuestions
        .map((q, idx): RepeatedPyqQuestion | null => {
          if (!isRecord(q)) return null;
          const title = asNullableString(q.title);
          if (!title) return null;
          const appearances = Array.isArray(q.appearances)
            ? q.appearances.map(parsePyqAppearance).filter((a): a is PyqQuestionAppearance => a !== null)
            : [];
          if (appearances.length === 0) return null;
          const matchType =
            q.matchType === 'exact' || q.matchType === 'exact-circuit' || q.matchType === 'variant'
              ? q.matchType
              : 'variant';
          return {
            id: asNonEmptyString(q.id, `pyq-q-${idx + 1}`),
            title,
            moduleId: asNonEmptyString(q.moduleId, ''),
            coCode: asNonEmptyString(q.coCode, 'CO'),
            track: asNullableString(q.track),
            blueprintMarks: asPositiveNumber(q.blueprintMarks, 0),
            appearanceCount: asPositiveInt(q.appearanceCount, appearances.length),
            examPaperCount: Math.max(1, asPositiveInt(q.examPaperCount, 1)),
            cumulativeMarks: asPositiveNumber(q.cumulativeMarks, 0),
            matchType,
            summaryCue: asNonEmptyString(q.summaryCue, title),
            appearances,
          };
        })
        .filter((q): q is RepeatedPyqQuestion => q !== null)
    : [];

  const VALID_VERDICTS = ['Must-Do Core', 'Template Drill', 'High-ROI Focus', 'Fast MCQ Lock'] as const;
  const repeatedTopics: RepeatedPyqTopic[] = Array.isArray(raw.repeatedTopics)
    ? raw.repeatedTopics
        .map((t, idx): RepeatedPyqTopic | null => {
          if (!isRecord(t)) return null;
          const title = asNullableString(t.title);
          if (!title) return null;
          const verdict = VALID_VERDICTS.includes(t.strategyVerdict as (typeof VALID_VERDICTS)[number])
            ? (t.strategyVerdict as RepeatedPyqTopic['strategyVerdict'])
            : 'High-ROI Focus';
          return {
            id: asNonEmptyString(t.id, `pyq-t-${idx + 1}`),
            title,
            moduleId: asNonEmptyString(t.moduleId, ''),
            coCode: asNonEmptyString(t.coCode, 'CO'),
            track: asNullableString(t.track),
            blueprintMarks: asPositiveNumber(t.blueprintMarks, 0),
            paperHits: Math.max(1, asPositiveInt(t.paperHits, 1)),
            totalPapers: Math.max(1, asPositiveInt(t.totalPapers, papers.length || 1)),
            questionCount: Math.max(1, asPositiveInt(t.questionCount, 1)),
            cumulativeMarks: asPositiveNumber(t.cumulativeMarks, 0),
            strategyVerdict: verdict,
            summary: asNonEmptyString(t.summary, title),
            sourceFile: asNullableString(t.sourceFile) ?? undefined,
            page: typeof t.page === 'number' && t.page >= 1 ? Math.round(t.page) : undefined,
          };
        })
        .filter((t): t is RepeatedPyqTopic => t !== null)
    : [];

  const reverseStrategy: ReverseStrategyInsight[] = Array.isArray(raw.reverseStrategy)
    ? raw.reverseStrategy
        .map((s, idx): ReverseStrategyInsight | null => {
          if (!isRecord(s)) return null;
          const headline = asNullableString(s.headline);
          const detail = asNullableString(s.detail);
          if (!headline || !detail) return null;
          const accent = VALID_ACCENTS.includes(s.accent as MemphisAccent)
            ? (s.accent as MemphisAccent)
            : VALID_ACCENTS[idx % VALID_ACCENTS.length];
          return {
            id: asNonEmptyString(s.id, `rev-strat-${idx + 1}`),
            verdict: asNonEmptyString(s.verdict, 'REVERSE CHECK'),
            accent,
            headline,
            metric: asNonEmptyString(s.metric, ''),
            detail,
          };
        })
        .filter((s): s is ReverseStrategyInsight => s !== null)
    : [];

  if (papers.length === 0 && repeatedQuestions.length === 0 && repeatedTopics.length === 0) {
    return null;
  }

  return {
    totalPdfCount: asPositiveInt(raw.totalPdfCount, papers.length),
    totalExamSessions: Math.max(1, asPositiveInt(raw.totalExamSessions, papers.length)),
    totalQuestionsScanned: asPositiveInt(raw.totalQuestionsScanned, 0),
    repeatedQuestionCount: asPositiveInt(raw.repeatedQuestionCount, repeatedQuestions.length),
    repeatedTopicCount: asPositiveInt(raw.repeatedTopicCount, repeatedTopics.length),
    papers,
    repeatedQuestions,
    repeatedTopics,
    reverseStrategy,
  };
}

function parseSubject(raw: unknown, index: number, issues: ValidationIssue[]): SubjectRecord | null {
  if (!isRecord(raw)) {
    issues.push({ level: 'error', message: `Subject entry #${index + 1} is malformed and was skipped.` });
    return null;
  }

  const shortName = asNullableString(raw.shortName) ?? asNullableString(raw.folderName);
  if (!shortName) {
    issues.push({ level: 'error', message: `Subject entry #${index + 1} is missing a name.` });
    return null;
  }

  const id = asNonEmptyString(raw.id, shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const accentColor = VALID_ACCENTS.includes(raw.accentColor as MemphisAccent)
    ? (raw.accentColor as MemphisAccent)
    : VALID_ACCENTS[index % VALID_ACCENTS.length];

  const sourceFiles = Array.isArray(raw.sourceFiles)
    ? raw.sourceFiles.map(parseSourceFile).filter((f): f is SourceFileMeta => f !== null)
    : [];

  const resourceFiles = Array.isArray(raw.resourceFiles)
    ? raw.resourceFiles
        .map((r, rIdx) => parseResourceFile(r, rIdx))
        .filter((f): f is ResourceFileMeta => f !== null)
    : [];

  const parseWarnings = Array.isArray(raw.parseWarnings)
    ? raw.parseWarnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    : [];

  const rawModules = Array.isArray(raw.modules) ? raw.modules : [];
  const parsedModules = rawModules
    .map((m, mIdx) => parseModule(m, mIdx, id, issues))
    .filter((m): m is ModuleRecord => m !== null);

  const normalizedModules = estimateMissingModuleWeightages(parsedModules);

  let status: SubjectStatus = VALID_STATUSES.includes(raw.status as SubjectStatus)
    ? (raw.status as SubjectStatus)
    : normalizedModules.length > 0
      ? 'ready'
      : 'missing_material';

  if (status === 'ready' && normalizedModules.length === 0) {
    status = sourceFiles.length > 0 ? 'malformed' : 'missing_material';
    issues.push({
      level: 'warning',
      subjectId: id,
      message: `${shortName} was marked ready but contained zero valid modules.`,
    });
  }

  const anyEstimated = normalizedModules.some((m) => m.weightageSource === 'estimated');
  const weightageSource: WeightageSource =
    normalizedModules.length === 0
      ? 'missing'
      : VALID_WEIGHT_SOURCES.includes(raw.weightageSource as WeightageSource) && !anyEstimated
        ? (raw.weightageSource as WeightageSource)
        : anyEstimated
          ? 'estimated'
          : 'stated';

  const totalWeightage = normalizedModules.reduce((sum, mod) => sum + mod.weightage, 0);

  return {
    id,
    folderName: asNonEmptyString(raw.folderName, shortName),
    shortName,
    fullName: asNonEmptyString(raw.fullName, shortName),
    courseCode: asNonEmptyString(raw.courseCode, 'Course Material'),
    accentColor,
    tagline: asNonEmptyString(raw.tagline, 'End-semester study insights'),
    status,
    statusMessage: asNonEmptyString(
      raw.statusMessage,
      status === 'ready'
        ? 'Study material parsed successfully.'
        : `No readable modules found in ${shortName}/.`
    ),
    weightageScaleLabel: asNonEmptyString(
      raw.weightageScaleLabel,
      weightageSource === 'estimated' ? 'Estimated Share (%)' : 'Blueprint Weightage'
    ),
    weightageSource,
    weightageBasis: asNonEmptyString(
      raw.weightageBasis,
      weightageSource === 'estimated'
        ? 'Estimated from module material volume and topic density.'
        : 'Source syllabus & course blueprint.'
    ),
    totalWeightage,
    sourceFiles,
    resourceFiles,
    parseWarnings,
    modules: normalizedModules,
    pyqAnalysis: parsePyqAnalysis(raw.pyqAnalysis),
  };
}

/**
 * Validates and normalizes the generated study dataset JSON.
 * Never throws on malformed data; instead surfaces structured ValidationIssue records.
 */
export function parseAndValidateStudyDataset(raw: unknown): ParsedDatasetResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(raw) || !Array.isArray(raw.subjects)) {
    issues.push({
      level: 'error',
      message: 'Study dataset is missing or malformed (expected an object with a "subjects" array).',
    });
    return {
      dataset: {
        schemaVersion: '1.0.0',
        generatedAt: new Date(0).toISOString(),
        studyRootName: 'Unknown',
        subjects: [],
      },
      issues,
      hasFatalError: true,
    };
  }

  const seenIds = new Set<string>();
  const subjects: SubjectRecord[] = [];

  raw.subjects.forEach((entry, idx) => {
    const parsed = parseSubject(entry, idx, issues);
    if (!parsed) return;
    if (seenIds.has(parsed.id)) {
      issues.push({
        level: 'warning',
        subjectId: parsed.id,
        message: `Duplicate subject id "${parsed.id}" ignored.`,
      });
      return;
    }
    seenIds.add(parsed.id);
    subjects.push(parsed);
  });

  const dataset: StudyDataset = {
    schemaVersion: asNonEmptyString(raw.schemaVersion, '1.0.0'),
    generatedAt: asNonEmptyString(raw.generatedAt, new Date(0).toISOString()),
    studyRootName: asNonEmptyString(raw.studyRootName, 'Endsem insights'),
    subjects,
  };

  return {
    dataset,
    issues,
    hasFatalError: subjects.length === 0,
  };
}

/**
 * Ranks modules from highest weightage to lowest.
 * Breaks ties deterministically using Course Plan marks, slide/page volume, then module number.
 */
export function rankModulesByWeightage(modules: ModuleRecord[]): RankedModule[] {
  if (modules.length === 0) return [];

  const sorted = [...modules].sort((a, b) => {
    if (b.weightage !== a.weightage) return b.weightage - a.weightage;
    const marksA = a.coursePlanMarks100 ?? 0;
    const marksB = b.coursePlanMarks100 ?? 0;
    if (marksB !== marksA) return marksB - marksA;
    if (b.pageCount !== a.pageCount) return b.pageCount - a.pageCount;
    return a.moduleNumber - b.moduleNumber;
  });

  const totalWeightage = sorted.reduce((sum, m) => sum + m.weightage, 0) || 1;
  let runningTotal = 0;

  return sorted.map((mod, idx) => {
    runningTotal += mod.weightage;
    const weightagePercent = Math.round((mod.weightage / totalWeightage) * 1000) / 10;
    const cumulativePercent = Math.round((runningTotal / totalWeightage) * 1000) / 10;

    let tier: RankedModule['tier'];
    if (weightagePercent >= 25 || idx < 2 && cumulativePercent <= 70 && weightagePercent >= 20) {
      tier = 'Tier 1: High-Yield Core';
    } else if (weightagePercent >= 12) {
      tier = 'Tier 2: High-Leverage Foundations';
    } else {
      tier = 'Tier 3: Targeted Review';
    }

    return {
      ...mod,
      rank: idx + 1,
      weightagePercent,
      cumulativeWeightage: runningTotal,
      cumulativePercent,
      tier,
    };
  });
}

