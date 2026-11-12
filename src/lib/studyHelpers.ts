import type {
  ExamReadinessSummary,
  FormulaShortcut,
  MindMapNodeData,
  MindMapSearchResult,
  ModuleRecord,
  SubjectRecord,
  TrackReadiness,
} from '../types/study';

function roundMarks(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Extracts the starting page number from a slide reference such as
 * `"pp. 43-58"`, `"p. 12"`, `"pp. 2-11, 22-24"`, or `"L6 (p. 3)"`.
 */
export function extractFirstPageNumber(sourceRef?: string | null): number {
  if (!sourceRef) return 1;
  const pageMatch = /(?:pp?\.\s*)(\d+)/i.exec(sourceRef);
  if (pageMatch) {
    const parsed = Number.parseInt(pageMatch[1], 10);
    if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  }
  return 1;
}

function encodeSafeStudyBasePath(
  folderName: string | undefined,
  sourceFile?: string | null
): string | null {
  if (!folderName || !sourceFile) return null;
  const trimmedFolder = folderName.trim();
  const trimmedFile = sourceFile.trim();
  if (!trimmedFolder || !trimmedFile || trimmedFile.includes(',')) return null;
  if (
    trimmedFolder.startsWith('.') ||
    trimmedFolder.includes('..') ||
    trimmedFolder.includes('/') ||
    trimmedFolder.includes('\\') ||
    trimmedFile.startsWith('/') ||
    trimmedFile.endsWith('/') ||
    trimmedFile.includes('\\')
  ) {
    return null;
  }

  const fileSegments = trimmedFile.split('/');
  if (
    fileSegments.length === 0 ||
    fileSegments.some((seg) => !seg || seg === '.' || seg === '..' || seg.includes('..') || seg.startsWith('.'))
  ) {
    return null;
  }

  const encodedPath = fileSegments.map((seg) => encodeURIComponent(seg)).join('/');
  return `/study-files/${encodeURIComponent(trimmedFolder)}/${encodedPath}`;
}

/**
 * Builds a browser-openable URL pointing to the exact PDF page for a study source.
 * Returns `null` when the source string refers to multiple files or unsafe path segments.
 */
export function buildStudyPdfUrl(
  folderName: string | undefined,
  sourceFile?: string | null,
  sourceRef?: string | null
): string | null {
  const basePath = encodeSafeStudyBasePath(folderName, sourceFile);
  if (!basePath) return null;
  const page = extractFirstPageNumber(sourceRef);
  return `${basePath}#page=${page}`;
}

/**
 * Builds a clean URL for downloading a study file without a `#page=` fragment.
 */
export function buildStudyDownloadUrl(
  folderName: string | undefined,
  sourceFile?: string | null
): string | null {
  return encodeSafeStudyBasePath(folderName, sourceFile);
}

function getModuleCompletionFraction(mod: ModuleRecord, reviewedIds: Set<string>): number {
  if (reviewedIds.has(mod.id)) return 1;
  if (mod.topicGroups.length === 0) return 0;

  let groupSum = 0;
  for (const grp of mod.topicGroups) {
    if (reviewedIds.has(grp.id)) {
      groupSum += 1;
    } else if (grp.leaves.length > 0) {
      const reviewedLeaves = grp.leaves.filter((leaf) => reviewedIds.has(leaf.id)).length;
      groupSum += reviewedLeaves / grp.leaves.length;
    }
  }
  return Math.min(1, groupSum / mod.topicGroups.length);
}

/**
 * Computes live exam marks readiness without double-counting nested parent/child checkboxes.
 */
export function computeExamReadiness(
  subject: SubjectRecord,
  reviewedIds: Set<string>
): ExamReadinessSummary {
  const unitLabel = subject.weightageSource === 'estimated' ? 'Est. %' : 'marks';
  if (subject.status !== 'ready' || subject.modules.length === 0) {
    return {
      earnedMarks: 0,
      totalMarks: subject.totalWeightage || 0,
      percent: 0,
      unitLabel,
      completedModules: 0,
      totalModules: subject.modules.length,
      tracks: [],
    };
  }

  let totalMarksRaw = 0;
  let earnedMarksRaw = 0;
  let completedModules = 0;
  const trackAcc = new Map<string, { earned: number; total: number; cos: Set<string> }>();

  for (const mod of subject.modules) {
    const fraction = getModuleCompletionFraction(mod, reviewedIds);
    const modEarned = mod.weightage * fraction;

    totalMarksRaw += mod.weightage;
    earnedMarksRaw += modEarned;
    if (fraction >= 0.999) completedModules += 1;

    if (mod.track) {
      const entry = trackAcc.get(mod.track) ?? { earned: 0, total: 0, cos: new Set<string>() };
      entry.earned += modEarned;
      entry.total += mod.weightage;
      entry.cos.add(mod.coCode);
      trackAcc.set(mod.track, entry);
    }
  }

  const orderedTrackNames = [
    ...['Networks', 'Signals'].filter((t) => trackAcc.has(t)),
    ...[...trackAcc.keys()].filter((t) => t !== 'Networks' && t !== 'Signals'),
  ];

  const tracks: TrackReadiness[] = orderedTrackNames.map((trackName) => {
    const data = trackAcc.get(trackName)!;
    const earnedMarks = roundMarks(data.earned);
    const totalMarks = roundMarks(data.total);
    const coPrefix =
      trackName === 'Networks'
        ? 'CO1–3'
        : trackName === 'Signals'
          ? 'CO4–5'
          : [...data.cos].join('/');
    return {
      track: trackName,
      label: coPrefix ? `${coPrefix} ${trackName}` : trackName,
      earnedMarks,
      totalMarks,
      percent: totalMarks > 0 ? Math.round((data.earned / data.total) * 100) : 0,
    };
  });

  const earnedMarks = roundMarks(earnedMarksRaw);
  const totalMarks = roundMarks(totalMarksRaw);
  const percent = totalMarks > 0 ? Math.round((earnedMarksRaw / totalMarksRaw) * 100) : 0;

  return {
    earnedMarks,
    totalMarks,
    percent,
    unitLabel,
    completedModules,
    totalModules: subject.modules.length,
    tracks,
  };
}

interface NasShortcutSeed {
  id: string;
  moduleId: string;
  moduleNumber: number;
  coCode: string;
  track: string;
  title: string;
  formulaCue: string;
  sourceFile: string;
  page: number;
}

const NAS_FORMULA_SHORTCUTS: NasShortcutSeed[] = [
  {
    id: 'nas-cheat-ctft-props',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'CTFT Properties Table',
    formulaCue: 'Linearity, Time/Freq Shift, Duality, Differentiation, Parseval',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 78,
  },
  {
    id: 'nas-cheat-ctft-pairs',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'Basic Fourier Transform Pairs',
    formulaCue: 'Impulse, Step, Gate/Sinc, Exponential, Sinusoid pairs',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 80,
  },
  {
    id: 'nas-cheat-ctfs-summary',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'CTFS Pairs, Parseval & Summary',
    formulaCue: 'Harmonic power |a_k|², Conjugate symmetry, CTFS table',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 24,
  },
  {
    id: 'nas-cheat-dtfs',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'DTFS Equations & DT Parseval',
    formulaCue: 'N-periodic synthesis/analysis & DT Parseval relation',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 40,
  },
  {
    id: 'nas-cheat-lccde',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'LCCDE Frequency Response H(jω)',
    formulaCue: 'System H(jω) = Y(jω)/X(jω) from differential equations',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 82,
  },
  {
    id: 'nas-cheat-conv-sum',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Convolution Sum (DT LTI)',
    formulaCue: 'y[n] = Σ x[k]h[n−k] & worked flip-shift plots',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 74,
  },
  {
    id: 'nas-cheat-conv-int',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Convolution Integral (CT LTI)',
    formulaCue: 'y(t) = ∫ x(τ)h(t−τ) dτ & piecewise overlap limits',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 84,
  },
  {
    id: 'nas-cheat-sys-props',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Causality, BIBO Stability & Linearity',
    formulaCue: 'Causality [p.56] • BIBO [p.58] • TI [p.61] • Linearity [p.63]',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 56,
  },
  {
    id: 'nas-cheat-test-signals',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Test Signals, Even/Odd & Energy/Power',
    formulaCue: 'Even/Odd [p.14] • u/δ/r Relations [p.25] • Energy/Power [p.40]',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 25,
  },
  {
    id: 'nas-cheat-dividers',
    moduleId: 'nas-m1',
    moduleNumber: 1,
    coCode: 'CO1',
    track: 'Networks',
    title: 'Voltage/Current Division & Supernode',
    formulaCue: 'Current divider [p.35] • Supernode [p.41] • Supermesh [p.55]',
    sourceFile: 'NAS_Module1_partA.pdf',
    page: 35,
  },
  {
    id: 'nas-cheat-theorems-cp',
    moduleId: 'nas-m1',
    moduleNumber: 1,
    coCode: 'CO1',
    track: 'Networks',
    title: 'L6–L9 Network Theorems Plan',
    formulaCue: 'Source Transform, Superposition, Thevenin/Norton, Max Power',
    sourceFile: 'Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf',
    page: 3,
  },
  {
    id: 'nas-cheat-laplace-pairs',
    moduleId: 'nas-m3',
    moduleNumber: 3,
    coCode: 'CO3',
    track: 'Networks',
    title: 'Laplace Transform Pairs & IVT / FVT',
    formulaCue: 'Standard Pairs table [p.9] • Initial & Final Value Theorems [p.12]',
    sourceFile: 'NS_Module3A_Rev3.pdf',
    page: 9,
  },
  {
    id: 'nas-cheat-s-models',
    moduleId: 'nas-m3',
    moduleNumber: 3,
    coCode: 'CO3',
    track: 'Networks',
    title: 's-Domain Inductor & Capacitor Models',
    formulaCue: 'Z_L = sL + i(0⁻)/s, Z_C = 1/(sC) + v(0⁻)/s',
    sourceFile: 'NS_Module3A_Rev3.pdf',
    page: 13,
  },
  {
    id: 'nas-cheat-twoport-sum',
    moduleId: 'nas-m3',
    moduleNumber: 3,
    coCode: 'CO3',
    track: 'Networks',
    title: 'Two-Port Summary & Conversions',
    formulaCue: 'Z, Y, h, ABCD matrices [p.19] • Conversion & Symmetry [pp.20–21]',
    sourceFile: 'NS_Module3B_Rev3.pdf',
    page: 19,
  },
  {
    id: 'nas-cheat-xfer-fns',
    moduleId: 'nas-m3',
    moduleNumber: 3,
    coCode: 'CO3',
    track: 'Networks',
    title: 'Network Functions, Ladder & Poles/Zeros',
    formulaCue: 'Transfer Functions [p.23] • Ladder [p.30] • Poles/Zeros [p.34]',
    sourceFile: 'NS_Module3B_Rev3.pdf',
    page: 22,
  },
  {
    id: 'nas-cheat-rlc-summary',
    moduleId: 'nas-m2',
    moduleNumber: 2,
    coCode: 'CO2',
    track: 'Networks',
    title: 'Driven RL/RC & RLC Damping Summary',
    formulaCue: 'Initial Conditions [p.22] • Driven Eq [p.40] • RLC α vs ω₀ [p.58]',
    sourceFile: 'NS_Module2_Rev2.pdf',
    page: 58,
  },
];

/**
 * Returns verified slide shortcuts & formula cues grounded strictly in `subject.sourceFiles`.
 */
export function getFormulaCheatSheet(subject: SubjectRecord): FormulaShortcut[] {
  const availableFiles = new Set(subject.sourceFiles.map((f) => f.filename));

  if (subject.id === 'nas' || subject.courseCode === 'ICE 2123') {
    const matched = NAS_FORMULA_SHORTCUTS.filter((item) => availableFiles.has(item.sourceFile));
    if (matched.length > 0) return matched;
  }

  // Generic fallback for other subjects derived purely from high-yield groups
  const derived: FormulaShortcut[] = [];
  for (const mod of [...subject.modules].sort((a, b) => b.weightage - a.weightage)) {
    for (const grp of mod.topicGroups) {
      if (grp.priority === 'supporting' && derived.length >= 12) continue;
      if (!availableFiles.has(grp.sourceFile)) continue;
      derived.push({
        id: `cheat-${grp.id}`,
        moduleId: mod.id,
        moduleNumber: mod.moduleNumber,
        coCode: mod.coCode,
        track: mod.track ?? null,
        title: grp.title,
        formulaCue: grp.leaves.slice(0, 3).map((l) => l.title).join(' • '),
        sourceFile: grp.sourceFile,
        page: extractFirstPageNumber(grp.sourceRef),
      });
    }
  }
  return derived;
}

/**
 * Searches mind-map modules, topic groups, and leaves and returns matches with
 * their full ancestor chain so the UI can auto-expand and center any match.
 */
export function searchMindMapNodes(
  tree: MindMapNodeData,
  query: string,
  limit = 10
): MindMapSearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const scored: { result: MindMapSearchResult; score: number }[] = [];

  const walk = (
    node: MindMapNodeData,
    ancestors: string[],
    enclosingModuleTitle?: string
  ) => {
    const nextModuleTitle = node.level === 1 ? node.title : enclosingModuleTitle;

    if (node.level > 0) {
      const titleLower = node.title.toLowerCase();
      const haystack = [
        titleLower,
        node.subtitle?.toLowerCase() ?? '',
        node.coCode?.toLowerCase() ?? '',
        node.track?.toLowerCase() ?? '',
        node.sourceFile?.toLowerCase() ?? '',
      ].join(' ');

      if (tokens.every((tok) => haystack.includes(tok))) {
        let score = 1;
        if (titleLower.startsWith(trimmed)) score += 6;
        else if (titleLower.includes(trimmed)) score += 4;
        if (node.level === 1) score += 2;
        else if (node.level === 2) score += 1;

        scored.push({
          score,
          result: {
            id: node.id,
            title: node.title,
            level: node.level,
            subtitle: node.subtitle,
            moduleTitle: node.level === 1 ? undefined : enclosingModuleTitle,
            coCode: node.coCode,
            track: node.track ?? null,
            ancestorIds: ancestors,
          },
        });
      }
    }

    for (const child of node.children) {
      walk(child, [...ancestors, node.id], nextModuleTitle);
    }
  };

  walk(tree, []);

  return scored
    .sort((a, b) => b.score - a.score || a.result.level - b.result.level)
    .slice(0, limit)
    .map((item) => item.result);
}

export type StudyFileKind = 'summary' | 'slides' | 'pyq' | 'plan';

export interface StudyFileLibraryItem {
  id: string;
  subjectId: string;
  subjectShortName: string;
  folderName: string;
  title: string;
  description: string;
  filename: string;
  kind: StudyFileKind;
  badge: string;
  featured: boolean;
  pageCount: number;
  sizeBytes?: number;
  openUrl: string | null;
  downloadUrl: string | null;
}

/**
 * Formats byte counts cleanly for display inside file cards.
 */
export function formatFileSize(sizeBytes?: number): string | null {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return null;
  }
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function toSubjectRelativePath(folderName: string, relativePath: string, filename: string): string {
  const prefix = `${folderName}/`;
  if (relativePath.startsWith(prefix)) {
    return relativePath.slice(prefix.length);
  }
  return relativePath || filename;
}

/**
 * Collects curated resources, course plans, module slides, and audited PYQ papers
 * into a unified, sorted list for the website's Files section.
 */
export function buildStudyFileLibrary(subjects: SubjectRecord[]): StudyFileLibraryItem[] {
  const items: StudyFileLibraryItem[] = [];

  for (const subj of subjects) {
    for (const res of subj.resourceFiles ?? []) {
      const subRel = toSubjectRelativePath(subj.folderName, res.relativePath, res.filename);
      items.push({
        id: `${subj.id}-res-${res.id}`,
        subjectId: subj.id,
        subjectShortName: subj.shortName,
        folderName: subj.folderName,
        title: res.title,
        description: res.description,
        filename: res.filename,
        kind: 'summary',
        badge: res.badge || 'PYQ REPEAT LIST',
        featured: true,
        pageCount: res.pageCount,
        sizeBytes: res.sizeBytes,
        openUrl: buildStudyPdfUrl(subj.folderName, subRel, 'p. 1'),
        downloadUrl: buildStudyDownloadUrl(subj.folderName, subRel),
      });
    }

    for (const src of subj.sourceFiles) {
      const subRel = toSubjectRelativePath(subj.folderName, src.relativePath, src.filename);
      const isPlan = src.isCoursePlan;
      items.push({
        id: `${subj.id}-src-${src.filename}`,
        subjectId: subj.id,
        subjectShortName: subj.shortName,
        folderName: subj.folderName,
        title: src.filename.replace(/\.pdf$/i, '').replace(/_/g, ' '),
        description: isPlan
          ? 'Official course plan, CO weights & lecture breakdown'
          : `${src.pageCount} slides${src.exampleCount > 0 ? ` • ${src.exampleCount} worked examples` : ''}`,
        filename: src.filename,
        kind: isPlan ? 'plan' : 'slides',
        badge: isPlan ? 'COURSE PLAN' : 'MODULE SLIDES',
        featured: false,
        pageCount: src.pageCount,
        sizeBytes: src.sizeBytes,
        openUrl: buildStudyPdfUrl(subj.folderName, subRel, 'p. 1'),
        downloadUrl: buildStudyDownloadUrl(subj.folderName, subRel),
      });
    }

    for (const paper of subj.pyqAnalysis?.papers ?? []) {
      const subRel = toSubjectRelativePath(subj.folderName, paper.relativePath, paper.filename);
      items.push({
        id: `${subj.id}-pyq-${paper.id}`,
        subjectId: subj.id,
        subjectShortName: subj.shortName,
        folderName: subj.folderName,
        title: `${paper.examLabel} (${paper.courseCode})`,
        description: `${paper.questionCount} questions • ${paper.maxMarks} marks • ${paper.examDate}`,
        filename: paper.filename,
        kind: 'pyq',
        badge: 'PYQ PAPER',
        featured: false,
        pageCount: paper.pageCount,
        openUrl: buildStudyPdfUrl(subj.folderName, subRel, 'p. 1'),
        downloadUrl: buildStudyDownloadUrl(subj.folderName, subRel),
      });
    }
  }

  return items;
}

