import { describe, expect, it } from 'vitest';
import generatedData from '../data/study-data.generated.json';
import { parseAndValidateStudyDataset } from '../lib/studyParser';
import { generateStudyStrategy } from '../lib/strategyEngine';

describe('strategyEngine', () => {
  it('generates a high-weightage-first strategy for NAS with accurate coverage & rationale', () => {
    const { dataset } = parseAndValidateStudyDataset(generatedData);
    const nas = dataset.subjects.find((s) => s.id === 'nas')!;

    const strategy = generateStudyStrategy(nas, 12);

    expect(strategy.steps.map((s) => s.moduleNumber)).toEqual([5, 4, 1, 3, 2]);
    expect(strategy.topTwoCoveragePercent).toBe(64);
    expect(strategy.hasEstimatedWeights).toBe(false);
    expect(strategy.steps[0].allocatedHours).toBeGreaterThan(strategy.steps[4].allocatedHours);
    expect(strategy.steps[0].recommendedFocus.length).toBeGreaterThan(0);
    expect(strategy.steps[0].sourceFiles).toContain('NS_Module5_Rev1.pdf');
    expect(strategy.reasoningSummary.some((r) => r.includes('64%'))).toBe(true);
    expect(strategy.reasoningSummary.some((r) => r.includes('Module 4'))).toBe(true);
  });

  it('clamps extreme time budgets and handles subjects without modules cleanly', () => {
    const { dataset } = parseAndValidateStudyDataset(generatedData);
    const nas = dataset.subjects.find((s) => s.id === 'nas')!;

    const sprint = generateStudyStrategy(nas, 0);
    expect(sprint.availableHours).toBe(2);
    expect(sprint.steps).toHaveLength(5);

    const emptySubject = {
      ...nas,
      id: 'empty',
      status: 'missing_material' as const,
      modules: [],
    };
    const emptyStrategy = generateStudyStrategy(emptySubject, 10);
    expect(emptyStrategy.steps).toHaveLength(0);
    expect(emptyStrategy.topTwoCoveragePercent).toBe(0);
  });

  it('adds an estimation disclaimer when any module weightage is estimated', () => {
    const { dataset } = parseAndValidateStudyDataset({
      subjects: [
        {
          id: 'est',
          shortName: 'EST',
          fullName: 'Estimated Subject',
          status: 'ready',
          modules: [
            { id: 'e1', moduleNumber: 1, title: 'Topic A', weightage: 0, pageCount: 60 },
            { id: 'e2', moduleNumber: 2, title: 'Topic B', weightage: 0, pageCount: 30 },
          ],
        },
      ],
    });

    const strategy = generateStudyStrategy(dataset.subjects[0], 8);
    expect(strategy.hasEstimatedWeights).toBe(true);
    expect(strategy.reasoningSummary.some((r) => r.toLowerCase().includes('estimated'))).toBe(true);
  });
});

