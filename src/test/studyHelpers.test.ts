import { describe, expect, it } from 'vitest';
import generatedData from '../data/study-data.generated.json';
import { buildMindMapTree } from '../lib/mindMapBuilder';
import {
  buildStudyPdfUrl,
  computeExamReadiness,
  extractFirstPageNumber,
  getFormulaCheatSheet,
  searchMindMapNodes,
} from '../lib/studyHelpers';
import { parseAndValidateStudyDataset } from '../lib/studyParser';

describe('studyHelpers', () => {
  const { dataset } = parseAndValidateStudyDataset(generatedData);
  const nas = dataset.subjects.find((s) => s.id === 'nas')!;

  it('extracts slide page numbers and builds safe PDF URLs with #page anchors', () => {
    expect(extractFirstPageNumber('pp. 43-58')).toBe(43);
    expect(extractFirstPageNumber('L6 (p. 3)')).toBe(3);
    expect(extractFirstPageNumber('pp. 2-11, 22-24')).toBe(2);
    expect(extractFirstPageNumber('58 slides')).toBe(1);

    expect(buildStudyPdfUrl('NAS', 'NS_Module5_Rev1.pdf', 'pp. 78-81')).toBe(
      '/study-files/NAS/NS_Module5_Rev1.pdf#page=78'
    );
    expect(
      buildStudyPdfUrl(
        'NAS',
        'Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf',
        'L6 (p. 3)'
      )
    ).toBe(
      '/study-files/NAS/Course%20Plan%20-%20BTech%20Theory%20-%203%20Credits_ICE2123_NAS_Rev2_Signed-2.pdf#page=3'
    );

    expect(
      buildStudyPdfUrl(
        'NAS',
        'pyq/Network Analysis and Signals (ICE 2154).pdf',
        'p. 3'
      )
    ).toBe('/study-files/NAS/pyq/Network%20Analysis%20and%20Signals%20(ICE%202154).pdf#page=3');

    // Reject path traversal and multi-file joined strings
    expect(buildStudyPdfUrl('NAS', '../secret.pdf', 'p. 1')).toBeNull();
    expect(buildStudyPdfUrl('NAS', 'pyq/../secret.pdf', 'p. 1')).toBeNull();
    expect(buildStudyPdfUrl('NAS', '/abs/file.pdf', 'p. 1')).toBeNull();
    expect(buildStudyPdfUrl('NAS', 'a.pdf, b.pdf', 'p. 1')).toBeNull();
  });

  it('computes live exam readiness without double-counting parent and child items', () => {
    const empty = computeExamReadiness(nas, new Set());
    expect(empty.earnedMarks).toBe(0);
    expect(empty.totalMarks).toBe(50);
    expect(empty.percent).toBe(0);
    expect(empty.tracks.find((t) => t.track === 'Networks')).toMatchObject({
      earnedMarks: 0,
      totalMarks: 18,
    });
    expect(empty.tracks.find((t) => t.track === 'Signals')).toMatchObject({
      earnedMarks: 0,
      totalMarks: 32,
    });

    // Marking Module 5 (17 marks) AND a nested group inside Module 5 must still yield exactly 17
    const m5AndNested = new Set<string>([
      'nas-m5',
      nas.modules.find((m) => m.id === 'nas-m5')!.topicGroups[0].id,
    ]);
    const afterM5 = computeExamReadiness(nas, m5AndNested);
    expect(afterM5.earnedMarks).toBe(17);
    expect(afterM5.percent).toBe(34);
    expect(afterM5.tracks.find((t) => t.track === 'Signals')?.earnedMarks).toBe(17);

    // Partial group completion inside Module 1 (7 marks, 2 groups -> 3.5 marks for 1 full group)
    const m1GroupId = nas.modules.find((m) => m.id === 'nas-m1')!.topicGroups[0].id;
    const partial = computeExamReadiness(nas, new Set([m1GroupId]));
    expect(partial.earnedMarks).toBeGreaterThan(0);
    expect(partial.earnedMarks).toBeLessThan(7);
  });

  it('searches deeply collapsed topics and returns full ancestor chains', () => {
    const tree = buildMindMapTree(nas, 'weightage');
    const matches = searchMindMapNodes(tree, 'Supernode');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].ancestorIds).toContain('nas');
    expect(matches[0].ancestorIds).toContain('nas-m1');
  });

  it('returns curated formula slide shortcuts traced strictly to existing NAS PDFs', () => {
    const shortcuts = getFormulaCheatSheet(nas);
    const validFiles = new Set(nas.sourceFiles.map((f) => f.filename));
    expect(shortcuts.length).toBeGreaterThanOrEqual(10);
    for (const item of shortcuts) {
      expect(validFiles.has(item.sourceFile)).toBe(true);
      expect(item.page).toBeGreaterThanOrEqual(1);
    }
  });
});

