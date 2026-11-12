import { describe, expect, it } from 'vitest';
import generatedData from '../data/study-data.generated.json';
import {
  estimateMissingModuleWeightages,
  parseAndValidateStudyDataset,
  rankModulesByWeightage,
} from '../lib/studyParser';
import type { ModuleRecord } from '../types/study';

describe('studyParser', () => {
  it('validates the generated study dataset with NAS ready and MATH III / SNT missing material', () => {
    const result = parseAndValidateStudyDataset(generatedData);

    expect(result.hasFatalError).toBe(false);
    expect(result.dataset.subjects).toHaveLength(3);

    const nas = result.dataset.subjects.find((s) => s.id === 'nas');
    const math = result.dataset.subjects.find((s) => s.id === 'math-iii');
    const snt = result.dataset.subjects.find((s) => s.id === 'snt');

    expect(nas?.status).toBe('ready');
    expect(nas?.modules).toHaveLength(5);
    expect(nas?.totalWeightage).toBe(50);
    expect(nas?.modules.filter((m) => m.track === 'Networks').map((m) => m.coCode)).toEqual([
      'CO1',
      'CO2',
      'CO3',
    ]);
    expect(nas?.modules.filter((m) => m.track === 'Signals').map((m) => m.coCode)).toEqual([
      'CO4',
      'CO5',
    ]);
    expect(nas?.sourceFiles.some((f) => f.filename === 'NS_Module5_Rev1.pdf')).toBe(true);
    expect(
      nas?.sourceFiles.some(
        (f) => f.filename === 'Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf'
      )
    ).toBe(true);

    expect(math?.status).toBe('missing_material');
    expect(snt?.status).toBe('missing_material');
  });

  it('ranks NAS modules strictly from highest to lowest weightage', () => {
    const result = parseAndValidateStudyDataset(generatedData);
    const nas = result.dataset.subjects.find((s) => s.id === 'nas')!;
    const ranked = rankModulesByWeightage(nas.modules);

    expect(ranked.map((m) => [m.moduleNumber, m.weightage])).toEqual([
      [5, 17],
      [4, 15],
      [1, 7],
      [3, 6],
      [2, 5],
    ]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].weightagePercent).toBe(34);
    expect(ranked[1].cumulativePercent).toBe(64);
    expect(ranked[4].cumulativePercent).toBe(100);
  });

  it('breaks weightage ties deterministically using coursePlanMarks100, pageCount, then moduleNumber', () => {
    const sampleModules: ModuleRecord[] = [
      {
        id: 'm1',
        moduleNumber: 1,
        coCode: 'CO1',
        title: 'Module 1',
        weightage: 10,
        weightageUnit: 'marks',
        weightageSource: 'stated',
        coursePlanHours: 8,
        coursePlanMarks100: 15,
        sourceFiles: ['a.pdf'],
        pageCount: 20,
        exampleCount: 2,
        sourceGapNote: null,
        prerequisites: [],
        topicGroups: [],
      },
      {
        id: 'm2',
        moduleNumber: 2,
        coCode: 'CO2',
        title: 'Module 2',
        weightage: 10,
        weightageUnit: 'marks',
        weightageSource: 'stated',
        coursePlanHours: 10,
        coursePlanMarks100: 25,
        sourceFiles: ['b.pdf'],
        pageCount: 50,
        exampleCount: 8,
        sourceGapNote: null,
        prerequisites: [],
        topicGroups: [],
      },
    ];

    const ranked = rankModulesByWeightage(sampleModules);
    expect(ranked.map((m) => m.id)).toEqual(['m2', 'm1']);
  });

  it('estimates weightages proportionally when explicit weightages are omitted', () => {
    const rawUnweighted = {
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-12T00:00:00Z',
      studyRootName: 'Endsem insights',
      subjects: [
        {
          id: 'demo',
          shortName: 'DEMO',
          fullName: 'Demo Subject',
          status: 'ready',
          modules: [
            {
              id: 'd-m1',
              moduleNumber: 1,
              title: 'Light Module',
              weightage: 0,
              pageCount: 20,
              exampleCount: 2,
              sourceFiles: ['M1.pdf'],
              topicGroups: [],
            },
            {
              id: 'd-m2',
              moduleNumber: 2,
              title: 'Heavy Module',
              weightage: 0,
              pageCount: 80,
              exampleCount: 18,
              sourceFiles: ['M2.pdf'],
              topicGroups: [],
            },
          ],
        },
      ],
    };

    const result = parseAndValidateStudyDataset(rawUnweighted);
    const demo = result.dataset.subjects[0];
    expect(demo.weightageSource).toBe('estimated');
    expect(demo.modules[1].weightage).toBeGreaterThan(demo.modules[0].weightage);
    expect(demo.modules[0].weightageSource).toBe('estimated');
    expect(demo.modules[1].weightageSource).toBe('estimated');
  });

  it('handles malformed datasets, negative weights, and duplicate IDs without throwing', () => {
    const badRoot = parseAndValidateStudyDataset(null);
    expect(badRoot.hasFatalError).toBe(true);
    expect(badRoot.issues[0].level).toBe('error');

    const mixedBad = parseAndValidateStudyDataset({
      subjects: [
        null,
        { id: 'dup', shortName: 'DUP', modules: [{ moduleNumber: 1, title: 'Valid', weightage: -5, pageCount: 30 }] },
        { id: 'dup', shortName: 'DUP2', modules: [] },
      ],
    });

    expect(mixedBad.hasFatalError).toBe(false);
    expect(mixedBad.dataset.subjects).toHaveLength(1);
    expect(mixedBad.dataset.subjects[0].modules[0].weightageSource).toBe('estimated');
    expect(mixedBad.issues.length).toBeGreaterThanOrEqual(2);
  });

  it('estimateMissingModuleWeightages returns unchanged array when all modules are stated', () => {
    const result = parseAndValidateStudyDataset(generatedData);
    const nas = result.dataset.subjects.find((s) => s.id === 'nas')!;
    const out = estimateMissingModuleWeightages(nas.modules);
    expect(out).toEqual(nas.modules);
  });
});

