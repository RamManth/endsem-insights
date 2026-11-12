import type {
  MemphisAccent,
  MindMapEdge,
  MindMapLayout,
  MindMapNodeData,
  PositionedMindMapNode,
  SubjectRecord,
} from '../types/study';
import { rankModulesByWeightage } from './studyParser';

const LEVEL_COLORS: MemphisAccent[] = ['pink', 'teal', 'yellow'];

export type ModuleSortMode = 'blueprint' | 'weightage';

/**
 * Builds a hierarchical mind map tree for a subject:
 * Level 0 (Subject Root) -> Level 1 (Modules) -> Level 2 (Topic Groups) -> Level 3 (Subtopic Leaves).
 */
export function buildMindMapTree(
  subject: SubjectRecord,
  sortMode: ModuleSortMode = 'weightage'
): MindMapNodeData {
  const ranked = rankModulesByWeightage(subject.modules);
  const rankMap = new Map(ranked.map((m) => [m.id, m.rank]));

  const orderedModules =
    sortMode === 'weightage'
      ? ranked
      : [...subject.modules].sort((a, b) => a.moduleNumber - b.moduleNumber);

  const moduleNodes: MindMapNodeData[] = orderedModules.map((mod, idx) => {
    const rank = rankMap.get(mod.id) ?? idx + 1;
    const accent: MemphisAccent =
      rank <= 2 ? 'pink' : rank <= 4 ? 'teal' : 'yellow';

    const primaryModuleFile =
      mod.sourceFiles.find((f) => !f.toLowerCase().includes('course plan')) ?? mod.sourceFiles[0];

    const groupNodes: MindMapNodeData[] = mod.topicGroups.map((group) => {
      const leafNodes: MindMapNodeData[] = group.leaves.map((leaf) => ({
        id: leaf.id,
        parentId: group.id,
        level: 3,
        title: leaf.title,
        accent,
        coCode: mod.coCode,
        track: mod.track ?? null,
        sourceFile: leaf.sourceFile,
        sourceRef: leaf.sourceRef,
        highYield: leaf.highYield,
        children: [],
      }));

      return {
        id: group.id,
        parentId: mod.id,
        level: 2,
        title: group.title,
        subtitle: `${group.leaves.length} topics`,
        accent,
        coCode: mod.coCode,
        track: mod.track ?? null,
        sourceFile: group.sourceFile,
        sourceRef: group.sourceRef,
        children: leafNodes,
      };
    });

    const weightLabel =
      mod.weightageSource === 'estimated'
        ? `~${mod.weightage}% Est.`
        : `${mod.weightage} marks`;

    return {
      id: mod.id,
      parentId: subject.id,
      level: 1,
      title: `M${mod.moduleNumber}: ${mod.title}`,
      subtitle: mod.track ? `${mod.coCode} • ${mod.track}` : mod.coCode,
      badge: `#${rank} • ${weightLabel}`,
      accent,
      weightage: mod.weightage,
      weightageSource: mod.weightageSource,
      coCode: mod.coCode,
      track: mod.track ?? null,
      rank,
      sourceFile: primaryModuleFile,
      sourceRef: `${mod.pageCount} slides`,
      sourceGapNote: mod.sourceGapNote,
      children: groupNodes,
    };
  });

  const coursePlanFile = subject.sourceFiles.find((f) => f.isCoursePlan)?.filename;

  return {
    id: subject.id,
    parentId: null,
    level: 0,
    title: subject.shortName,
    subtitle: `${subject.fullName} • ${subject.totalWeightage} marks`,
    badge: subject.weightageSource === 'estimated' ? 'ESTIMATED' : subject.courseCode,
    accent: 'black',
    weightage: subject.totalWeightage,
    weightageSource: subject.weightageSource,
    sourceFile: coursePlanFile ?? subject.sourceFiles.map((f) => f.filename).join(', '),
    sourceRef: `${subject.modules.length} modules`,
    children: moduleNodes,
  };
}

/**
 * Expands Root + #1 highest-weightage module initially so the initial canvas renders
 * at a large, comfortably readable scale with zero visual clutter.
 */
export function getInitialExpandedIds(tree: MindMapNodeData): Set<string> {
  const expanded = new Set<string>([tree.id]);
  tree.children.forEach((modNode) => {
    if ((modNode.rank ?? 99) === 1) {
      expanded.add(modNode.id);
    }
  });
  return expanded;
}

export function getAllBranchIds(tree: MindMapNodeData): Set<string> {
  const ids = new Set<string>();
  const walk = (node: MindMapNodeData) => {
    if (node.children.length > 0) {
      ids.add(node.id);
      node.children.forEach(walk);
    }
  };
  walk(tree);
  return ids;
}

const LEVEL_WIDTHS: Record<0 | 1 | 2 | 3, number> = {
  0: 240,
  1: 316,
  2: 284,
  3: 320,
};

const LEVEL_CHARS_PER_LINE: Record<0 | 1 | 2 | 3, number> = {
  0: 18,
  1: 27,
  2: 26,
  3: 32,
};

function getNodeSize(node: MindMapNodeData): { width: number; height: number } {
  const width = LEVEL_WIDTHS[node.level];
  const charsPerLine = LEVEL_CHARS_PER_LINE[node.level];
  const titleLines = Math.max(1, Math.ceil(node.title.length / charsPerLine));

  if (node.level === 0) {
    return {
      width,
      height: Math.max(108, 56 + titleLines * 26 + (node.subtitle ? 24 : 0)),
    };
  }
  if (node.level === 1) {
    return {
      width,
      height: Math.max(94, 48 + titleLines * 22 + (node.subtitle ? 20 : 0)),
    };
  }
  if (node.level === 2) {
    return {
      width,
      height: Math.max(76, 32 + titleLines * 21 + (node.subtitle ? 20 : 0)),
    };
  }
  return {
    width,
    height: Math.max(62, 26 + titleLines * 20),
  };
}

const LEVEL_X_GAP = 86;
const VERTICAL_GAP = 20;
const PADDING_X = 48;
const PADDING_Y = 44;

interface SubtreeMeasurement {
  totalHeight: number;
  maxDepth: number;
}

function measureSubtree(node: MindMapNodeData, expandedIds: Set<string>): SubtreeMeasurement {
  const { height } = getNodeSize(node);
  const isExpanded = node.children.length > 0 && expandedIds.has(node.id);
  if (!isExpanded) {
    return { totalHeight: height, maxDepth: node.level };
  }
  const childMeasurements = node.children.map((c) => measureSubtree(c, expandedIds));
  const childrenHeight =
    childMeasurements.reduce((sum, m) => sum + m.totalHeight, 0) +
    VERTICAL_GAP * Math.max(0, childMeasurements.length - 1);
  return {
    totalHeight: Math.max(height, childrenHeight),
    maxDepth: Math.max(...childMeasurements.map((m) => m.maxDepth)),
  };
}

/**
 * Computes a collision-free center-outward bi-directional mind map layout:
 * the main subject sits at the center, and Level-1 modules branch outward to both
 * the right and left sides with smooth cubic Bézier connectors.
 */
export function computeMindMapLayout(
  tree: MindMapNodeData,
  expandedIds: Set<string>
): MindMapLayout {
  const nodes: PositionedMindMapNode[] = [];
  const edges: MindMapEdge[] = [];

  const rootExpanded = tree.children.length > 0 && expandedIds.has(tree.id);
  const rightChildren: MindMapNodeData[] = [];
  const leftChildren: MindMapNodeData[] = [];

  if (rootExpanded) {
    tree.children.forEach((child, idx) => {
      // Alternate so top weightages spread evenly outward left & right
      if (idx % 2 === 0) {
        rightChildren.push(child);
      } else {
        leftChildren.push(child);
      }
    });
  }

  const leftMaxDepth =
    leftChildren.length > 0
      ? Math.max(...leftChildren.map((c) => measureSubtree(c, expandedIds).maxDepth))
      : 0;
  const rightMaxDepth =
    rightChildren.length > 0
      ? Math.max(...rightChildren.map((c) => measureSubtree(c, expandedIds).maxDepth))
      : 0;

  // Compute how wide the left side extends so the center node never clips off left edge
  let leftSpan = 0;
  for (let lvl = 1; lvl <= leftMaxDepth; lvl += 1) {
    leftSpan += LEVEL_X_GAP + LEVEL_WIDTHS[lvl as 1 | 2 | 3];
  }

  let rightSpan = 0;
  for (let lvl = 1; lvl <= rightMaxDepth; lvl += 1) {
    rightSpan += LEVEL_X_GAP + LEVEL_WIDTHS[lvl as 1 | 2 | 3];
  }

  const rootDim = getNodeSize(tree);
  const rootX = PADDING_X + leftSpan;

  const leftMeasures = leftChildren.map((c) => measureSubtree(c, expandedIds));
  const rightMeasures = rightChildren.map((c) => measureSubtree(c, expandedIds));

  const leftTotalH =
    leftMeasures.reduce((s, m) => s + m.totalHeight, 0) +
    VERTICAL_GAP * Math.max(0, leftMeasures.length - 1);
  const rightTotalH =
    rightMeasures.reduce((s, m) => s + m.totalHeight, 0) +
    VERTICAL_GAP * Math.max(0, rightMeasures.length - 1);

  const canvasContentH = Math.max(rootDim.height, leftTotalH, rightTotalH);
  const rootY = PADDING_Y + (canvasContentH - rootDim.height) / 2;
  const rootCenterY = rootY + rootDim.height / 2;

  nodes.push({
    data: tree,
    x: rootX,
    y: rootY,
    width: rootDim.width,
    height: rootDim.height,
    childCount: tree.children.length,
    isExpanded: rootExpanded,
    direction: 'center',
  });

  function placeSideBranch(
    node: MindMapNodeData,
    direction: 'left' | 'right',
    parentEdgeX: number,
    parentCenterY: number,
    topY: number,
    colorIndex: number
  ): { heightUsed: number } {
    const dim = getNodeSize(node);
    const measure = measureSubtree(node, expandedIds);

    let xOffset = 0;
    for (let lvl = 1; lvl < node.level; lvl += 1) {
      xOffset += LEVEL_X_GAP + LEVEL_WIDTHS[lvl as 1 | 2 | 3];
    }

    const x =
      direction === 'right'
        ? rootX + rootDim.width + LEVEL_X_GAP + xOffset
        : rootX - LEVEL_X_GAP - xOffset - dim.width;

    const isExpanded = node.children.length > 0 && expandedIds.has(node.id);
    const y = topY + (measure.totalHeight - dim.height) / 2;
    const centerY = y + dim.height / 2;

    nodes.push({
      data: node,
      x,
      y,
      width: dim.width,
      height: dim.height,
      childCount: node.children.length,
      isExpanded,
      direction,
    });

    const accent =
      node.accent === 'black'
        ? LEVEL_COLORS[colorIndex % LEVEL_COLORS.length]
        : node.accent;

    edges.push({
      id: `${node.parentId ?? 'root'}->${node.id}`,
      fromId: node.parentId ?? tree.id,
      toId: node.id,
      x1: parentEdgeX,
      y1: parentCenterY,
      x2: direction === 'right' ? x : x + dim.width,
      y2: centerY,
      accent,
    });

    if (isExpanded) {
      const childrenHeight =
        node.children.reduce((sum, c) => sum + measureSubtree(c, expandedIds).totalHeight, 0) +
        VERTICAL_GAP * Math.max(0, node.children.length - 1);
      let childTop = topY + (measure.totalHeight - childrenHeight) / 2;
      const childParentEdgeX = direction === 'right' ? x + dim.width : x;
      node.children.forEach((child, idx) => {
        const res = placeSideBranch(
          child,
          direction,
          childParentEdgeX,
          centerY,
          childTop,
          idx
        );
        childTop += res.heightUsed + VERTICAL_GAP;
      });
    }

    return { heightUsed: measure.totalHeight };
  }

  let rightCursorY = PADDING_Y + (canvasContentH - rightTotalH) / 2;
  rightChildren.forEach((child, idx) => {
    const res = placeSideBranch(
      child,
      'right',
      rootX + rootDim.width,
      rootCenterY,
      rightCursorY,
      idx
    );
    rightCursorY += res.heightUsed + VERTICAL_GAP;
  });

  let leftCursorY = PADDING_Y + (canvasContentH - leftTotalH) / 2;
  leftChildren.forEach((child, idx) => {
    const res = placeSideBranch(
      child,
      'left',
      rootX,
      rootCenterY,
      leftCursorY,
      idx
    );
    leftCursorY += res.heightUsed + VERTICAL_GAP;
  });

  const totalWidth = Math.max(760, PADDING_X * 2 + leftSpan + rootDim.width + rightSpan);
  const totalHeight = Math.max(440, PADDING_Y * 2 + canvasContentH);

  return {
    nodes,
    edges,
    width: totalWidth,
    height: totalHeight,
  };
}
