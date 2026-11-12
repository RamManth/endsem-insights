import type { RankedModule, StrategyStep, StudyStrategy, SubjectRecord } from '../types/study';
import { rankModulesByWeightage } from './studyParser';

function roundToHalfHour(hours: number): number {
  return Math.max(0.5, Math.round(hours * 2) / 2);
}

function buildModuleRationale(
  mod: RankedModule,
  rankedById: Map<string, RankedModule>,
  allRanked: RankedModule[]
): string {
  const parts: string[] = [];

  if (mod.rank === 1) {
    parts.push(`Highest weightage (${mod.weightage} marks, ${mod.weightagePercent}%) — best marks-per-hour return.`);
  } else if (mod.rank === 2) {
    const topTwo = Math.round((allRanked[0].weightagePercent + mod.weightagePercent) * 10) / 10;
    parts.push(`Second highest (${mod.weightage} marks) — locks in ${topTwo}% combined with Module ${allRanked[0].moduleNumber}.`);
  } else {
    parts.push(`Adds ${mod.weightage} marks (${mod.weightagePercent}%) toward ${mod.cumulativePercent}% cumulative coverage.`);
  }

  if (mod.prerequisites.length > 0) {
    const prereqLabels = mod.prerequisites
      .map((id) => rankedById.get(id))
      .filter((p): p is RankedModule => Boolean(p))
      .map((p) => `M${p.moduleNumber}`);
    if (prereqLabels.length > 0) {
      parts.push(`Builds on ${prereqLabels.join(' & ')}.`);
    }
  }

  if (mod.weightageSource === 'estimated') {
    parts.push('(Weightage estimated from slides.)');
  }

  return parts.join(' ');
}

/**
 * Generates an exam-focused, high-weightage-first study plan given limited hours before the exam.
 */
export function generateStudyStrategy(subject: SubjectRecord, availableHours = 12): StudyStrategy {
  const safeHours = Math.max(2, Math.min(60, Number.isFinite(availableHours) ? availableHours : 12));
  const ranked = rankModulesByWeightage(subject.modules);

  if (ranked.length === 0) {
    return {
      subjectId: subject.id,
      availableHours: safeHours,
      totalWeightage: 0,
      hasEstimatedWeights: false,
      topTwoCoveragePercent: 0,
      headline: `No study modules parsed yet for ${subject.shortName}.`,
      reasoningSummary: [subject.statusMessage],
      steps: [],
    };
  }

  const totalWeightage = ranked.reduce((sum, m) => sum + m.weightage, 0) || 1;
  const rankedById = new Map(ranked.map((m) => [m.id, m]));
  const hasEstimatedWeights = ranked.some((m) => m.weightageSource === 'estimated');

  // Allocate time proportional to weightage, slightly boosting top-ranked modules when time is tight
  const urgencyBias = safeHours <= 10 ? 1.15 : 1.0;
  const rawWeights = ranked.map((m, idx) =>
    idx < 2 ? m.weightage * urgencyBias : m.weightage
  );
  const rawSum = rawWeights.reduce((sum, w) => sum + w, 0) || 1;

  const steps: StrategyStep[] = ranked.map((mod, idx) => {
    const allocatedHours = roundToHalfHour((rawWeights[idx] / rawSum) * safeHours);
    const highYieldLeaves = mod.topicGroups.flatMap((g) =>
      g.leaves.filter((l) => l.highYield).map((l) => `${l.title} (${l.sourceFile}, ${l.sourceRef})`)
    );
    const supportingLeaves = mod.topicGroups.flatMap((g) =>
      g.leaves.filter((l) => !l.highYield).map((l) => l.title)
    );

    const focusLimit = mod.tier === 'Tier 1: High-Yield Core' ? 5 : 3;
    const recommendedFocus =
      highYieldLeaves.length > 0
        ? highYieldLeaves.slice(0, focusLimit)
        : mod.topicGroups.slice(0, 3).map((g) => g.title);

    return {
      order: idx + 1,
      moduleId: mod.id,
      moduleNumber: mod.moduleNumber,
      coCode: mod.coCode,
      track: mod.track,
      title: mod.title,
      weightage: mod.weightage,
      weightagePercent: mod.weightagePercent,
      weightageSource: mod.weightageSource,
      cumulativePercent: mod.cumulativePercent,
      allocatedHours,
      tier: mod.tier,
      recommendedFocus,
      skipIfRushed: supportingLeaves.slice(0, 3),
      rationale: buildModuleRationale(mod, rankedById, ranked),
      sourceFiles: mod.sourceFiles,
    };
  });

  const topTwoCoveragePercent =
    ranked.length >= 2
      ? Math.round(((ranked[0].weightage + ranked[1].weightage) / totalWeightage) * 1000) / 10
      : ranked[0].weightagePercent;

  const topModsLabel =
    ranked.length >= 2
      ? `Module ${ranked[0].moduleNumber} (${ranked[0].weightage} marks) & Module ${ranked[1].moduleNumber} (${ranked[1].weightage} marks)`
      : `Module ${ranked[0].moduleNumber} (${ranked[0].weightage} marks)`;

  const headline = `Lock in ${topTwoCoveragePercent}% of marks first via ${topModsLabel} in your first ${Math.round((steps[0].allocatedHours + (steps[1]?.allocatedHours ?? 0)) * 10) / 10} hrs.`;

  const reasoningSummary: string[] = [
    `Pareto Yield: Top ${Math.min(2, ranked.length)} modules cover ${topTwoCoveragePercent}% (${ranked
      .slice(0, 2)
      .reduce((s, m) => s + m.weightage, 0)}/${totalWeightage} ${ranked[0].weightageUnit}).`,
    ranked.some((m) => m.id === 'nas-m5' && m.prerequisites.includes('nas-m4'))
      ? 'Concept Flow: Module 5 builds directly on Module 4 (LTI systems & signals); Modules 1, 3, and 2 share circuit foundations for pass two.'
      : 'Dependency Flow: High-weight modules go first while lower-weight topics stay for quick review.',
    `Time Split (${safeHours}h): Spend ${steps
      .slice(0, 2)
      .reduce((s, step) => s + step.allocatedHours, 0)}h on Tier 1 worked examples before lower-mark modules.`,
  ];

  if (hasEstimatedWeights) {
    reasoningSummary.push('Note: Weightages are estimated from slide volume and topic count.');
  }

  return {
    subjectId: subject.id,
    availableHours: safeHours,
    totalWeightage,
    hasEstimatedWeights,
    topTwoCoveragePercent,
    headline,
    reasoningSummary,
    steps,
  };
}

