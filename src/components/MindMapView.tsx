import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Expand,
  ExternalLink,
  FileText,
  ListTree,
  Maximize2,
  Minimize2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  MindMapEdge,
  MindMapLayout,
  MindMapNodeData,
  MindMapSearchResult,
  PositionedMindMapNode,
  SubjectRecord,
} from '../types/study';
import {
  buildMindMapTree,
  computeMindMapLayout,
  getAllBranchIds,
  getInitialExpandedIds,
  type ModuleSortMode,
} from '../lib/mindMapBuilder';
import {
  buildStudyPdfUrl,
  extractFirstPageNumber,
  searchMindMapNodes,
} from '../lib/studyHelpers';
import { getAccentHex } from './MemphisDecor';

type FocusFilterMode = 'all' | 'networks' | 'signals' | 'todo';

interface MindMapViewProps {
  subject: SubjectRecord;
  focusedModule?: { moduleId: string; seq: number } | null;
  reviewedIds: Set<string>;
  onToggleReviewed: (nodeId: string) => void;
}

function buildNodeMap(root: MindMapNodeData): Map<string, MindMapNodeData> {
  const map = new Map<string, MindMapNodeData>();
  const walk = (node: MindMapNodeData) => {
    map.set(node.id, node);
    node.children.forEach(walk);
  };
  walk(root);
  return map;
}

function clampScale(scale: number): number {
  return Math.max(0.32, Math.min(1.5, scale));
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smoothly interpolates existing nodes and SVG Bézier edge endpoints in lockstep over 620ms,
 * while tracking newly revealed nodes/edges for staggered worm-draw entrance animations.
 */
function useSmoothMindMapLayout(targetLayout: MindMapLayout) {
  const [renderedLayout, setRenderedLayout] = useState<MindMapLayout>(targetLayout);
  const [enteringOrder, setEnteringOrder] = useState<Map<string, number>>(() => new Map());
  const latestRenderedRef = useRef<MindMapLayout>(targetLayout);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = latestRenderedRef.current;
    const prevNodeIds = new Set(prev.nodes.map((n) => n.data.id));
    const newlyAdded = targetLayout.nodes.filter((n) => !prevNodeIds.has(n.data.id));

    const orderMap = new Map<string, number>();
    newlyAdded.forEach((n, idx) => {
      orderMap.set(n.data.id, idx);
    });
    setEnteringOrder(orderMap);

    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof requestAnimationFrame === 'undefined') {
      latestRenderedRef.current = targetLayout;
      setRenderedLayout(targetLayout);
      return;
    }

    const prevNodePos = new Map(prev.nodes.map((n) => [n.data.id, { x: n.x, y: n.y }]));
    const prevEdgePos = new Map(
      prev.edges.map((e) => [e.id, { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }])
    );

    const hasMovements = targetLayout.nodes.some((n) => {
      const p = prevNodePos.get(n.data.id);
      return p && (Math.abs(p.x - n.x) > 0.5 || Math.abs(p.y - n.y) > 0.5);
    });

    if (!hasMovements) {
      latestRenderedRef.current = targetLayout;
      setRenderedLayout(targetLayout);
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const durationMs = 680;
    const startTime = performance.now();

    const buildFrame = (rawT: number): MindMapLayout => {
      const t = easeOutQuart(rawT);

      const interpNodes: PositionedMindMapNode[] = targetLayout.nodes.map((node) => {
        const from = prevNodePos.get(node.data.id);
        if (!from) return node;
        return {
          ...node,
          x: lerp(from.x, node.x, t),
          y: lerp(from.y, node.y, t),
        };
      });

      const interpPosMap = new Map(
        interpNodes.map((n) => [n.data.id, { x: n.x, y: n.y, width: n.width, height: n.height, dir: n.direction }])
      );

      const interpEdges: MindMapEdge[] = targetLayout.edges.map((edge) => {
        const fromEdge = prevEdgePos.get(edge.id);
        if (fromEdge) {
          return {
            ...edge,
            x1: lerp(fromEdge.x1, edge.x1, t),
            y1: lerp(fromEdge.y1, edge.y1, t),
            x2: lerp(fromEdge.x2, edge.x2, t),
            y2: lerp(fromEdge.y2, edge.y2, t),
          };
        }
        const parentBox = interpPosMap.get(edge.fromId);
        const childBox = interpPosMap.get(edge.toId);
        if (!parentBox || !childBox) return edge;
        const goingLeft = childBox.dir === 'left';
        return {
          ...edge,
          x1: goingLeft ? parentBox.x : parentBox.x + parentBox.width,
          y1: parentBox.y + parentBox.height / 2,
          x2: goingLeft ? childBox.x + childBox.width : childBox.x,
          y2: childBox.y + childBox.height / 2,
        };
      });

      return {
        nodes: interpNodes,
        edges: interpEdges,
        width: targetLayout.width,
        height: targetLayout.height,
      };
    };

    // Apply frame 0 synchronously so aria-expanded and new worm edges appear on click without a 1-frame lag
    const initialFrame = buildFrame(0);
    latestRenderedRef.current = initialFrame;
    setRenderedLayout(initialFrame);

    const step = (now: number) => {
      const rawT = Math.min(1, (now - startTime) / durationMs);
      const nextLayout = buildFrame(rawT);
      latestRenderedRef.current = nextLayout;
      setRenderedLayout(nextLayout);

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [targetLayout]);

  return { renderedLayout, enteringOrder };
}

export function MindMapView({
  subject,
  focusedModule,
  reviewedIds,
  onToggleReviewed,
}: MindMapViewProps) {
  const [sortMode, setSortMode] = useState<ModuleSortMode>('weightage');
  const [viewMode, setViewMode] = useState<'canvas' | 'outline'>('canvas');
  const [focusFilter, setFocusFilter] = useState<FocusFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const tree = useMemo(() => buildMindMapTree(subject, sortMode), [subject, sortMode]);
  const nodeMap = useMemo(() => buildNodeMap(tree), [tree]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => getInitialExpandedIds(tree));
  const [selectedId, setSelectedId] = useState<string>(tree.id);

  // Reset expanded/selected/filter/search cleanly when switching subjects
  useEffect(() => {
    setExpandedIds(getInitialExpandedIds(tree));
    setSelectedId(tree.id);
    setFocusFilter('all');
    setSearchQuery('');
    setSearchOpen(false);
  }, [subject.id]);

  // Global Cmd+K / Ctrl+K or '/' shortcut for quick topic search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus & expand a module when user clicks "Focus" from Rankings
  useEffect(() => {
    const modId = focusedModule?.moduleId;
    if (!modId || !nodeMap.has(modId)) return;
    const next = new Set(expandedIds);
    next.add(tree.id);
    next.add(modId);
    setExpandedIds(next);
    setSelectedId(modId);
    if (viewMode === 'canvas') {
      const nextLayout = computeMindMapLayout(tree, next);
      focusNodeInViewport(modId, nextLayout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedModule]);

  const layout = useMemo(() => computeMindMapLayout(tree, expandedIds), [tree, expandedIds]);
  const { renderedLayout, enteringOrder } = useSmoothMindMapLayout(layout);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.78 });
  const [isGrabbing, setIsGrabbing] = useState(false);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, origX: 0, origY: 0 });

  const fitToViewport = useCallback(
    (targetLayout = layout) => {
      const el = viewportRef.current;
      const vw = el && el.clientWidth > 0 ? el.clientWidth : 920;
      const vh = el && el.clientHeight > 0 ? el.clientHeight : 600;
      const padding = 36;
      const scaleX = (vw - padding) / targetLayout.width;
      const scaleY = (vh - padding) / targetLayout.height;
      const nextScale = clampScale(Math.min(1, scaleX, scaleY));
      const x = (vw - targetLayout.width * nextScale) / 2;
      const y = (vh - targetLayout.height * nextScale) / 2;
      setTransform({ x, y, scale: nextScale });
    },
    [layout]
  );

  // Smoothly pan & zoom so a clicked or newly-expanded node stays comfortably readable
  const focusNodeInViewport = useCallback(
    (nodeId: string, targetLayout: ReturnType<typeof computeMindMapLayout>) => {
      const el = viewportRef.current;
      const vw = el && el.clientWidth > 0 ? el.clientWidth : 920;
      const vh = el && el.clientHeight > 0 ? el.clientHeight : 600;
      const target = targetLayout.nodes.find((n) => n.data.id === nodeId);
      if (!target) return;

      const minReadableScale = vw < 520 ? 0.68 : 0.88;
      const desiredScale = clampScale(Math.max(transform.scale, minReadableScale));
      const nodeCenterX = target.x + target.width / 2;
      const nodeCenterY = target.y + target.height / 2;
      const biasMag = vw < 520 ? 40 : 120;
      const biasX =
        target.direction === 'right' ? -biasMag : target.direction === 'left' ? biasMag : 0;

      setTransform({
        scale: desiredScale,
        x: vw / 2 - nodeCenterX * desiredScale + biasX,
        y: vh / 2 - nodeCenterY * desiredScale,
      });
    },
    [transform.scale]
  );

  // Auto-fit when subject or viewMode switches back to canvas
  useEffect(() => {
    if (viewMode === 'canvas') {
      fitToViewport(layout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id, viewMode]);

  const toggleNodeExpanded = (nodeId: string, panToTarget = true) => {
    const next = new Set(expandedIds);
    const willExpand = !next.has(nodeId);
    if (willExpand) {
      next.add(nodeId);
    } else {
      next.delete(nodeId);
    }
    setExpandedIds(next);
    if (panToTarget && willExpand && viewMode === 'canvas') {
      const nextLayout = computeMindMapLayout(tree, next);
      focusNodeInViewport(nodeId, nextLayout);
    }
  };

  const handleNodeClick = (node: MindMapNodeData) => {
    setSelectedId(node.id);
    if (node.level > 0 && node.children.length > 0 && !expandedIds.has(node.id)) {
      toggleNodeExpanded(node.id, true);
    } else if (viewMode === 'canvas') {
      focusNodeInViewport(node.id, layout);
    }
  };

  const handleExpandAll = () => {
    const all = getAllBranchIds(tree);
    setExpandedIds(all);
    const fullLayout = computeMindMapLayout(tree, all);
    fitToViewport(fullLayout);
  };

  const handleCollapseToModules = () => {
    const rootOnly = new Set([tree.id]);
    setExpandedIds(rootOnly);
    const compactLayout = computeMindMapLayout(tree, rootOnly);
    fitToViewport(compactLayout);
  };

  const handleZoomBy = (delta: number) => {
    setTransform((prev) => {
      const el = viewportRef.current;
      const vw = el && el.clientWidth > 0 ? el.clientWidth : 920;
      const vh = el && el.clientHeight > 0 ? el.clientHeight : 540;
      const nextScale = clampScale(prev.scale + delta);
      const ratio = nextScale / prev.scale;
      const cx = vw / 2;
      const cy = vh / 2;
      return {
        scale: nextScale,
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      };
    });
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: transform.x,
      origY: transform.y,
    };
    setIsGrabbing(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    setTransform((prev) => ({
      ...prev,
      x: dragStateRef.current.origX + dx,
      y: dragStateRef.current.origY + dy,
    }));
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsGrabbing(false);
    if (dragStateRef.current.pointerId !== null) {
      try {
        e.currentTarget.releasePointerCapture?.(dragStateRef.current.pointerId);
      } catch {
        // Ignore if pointer capture already released
      }
    }
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    // Only zoom when Ctrl/Cmd is pressed so vertical page scrolling stays natural
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    handleZoomBy(e.deltaY < 0 ? 0.1 : -0.1);
  };

  const selectedNode = nodeMap.get(selectedId) ?? tree;
  const searchResults = useMemo(
    () => searchMindMapNodes(tree, searchQuery, 10),
    [tree, searchQuery]
  );
  const hasNetworksTrack = tree.children.some((m) => m.track === 'Networks');
  const hasSignalsTrack = tree.children.some((m) => m.track === 'Signals');

  const nodeHasUnreviewed = useCallback(
    (node: MindMapNodeData): boolean => {
      if (reviewedIds.has(node.id)) return false;
      if (node.children.length === 0) return true;
      return node.children.some((child) => nodeHasUnreviewed(child));
    },
    [reviewedIds]
  );

  const nodeMatchesFilter = useCallback(
    (node: MindMapNodeData): boolean => {
      if (focusFilter === 'all' || node.level === 0) return true;
      if (focusFilter === 'networks') return node.track === 'Networks';
      if (focusFilter === 'signals') return node.track === 'Signals';
      return nodeHasUnreviewed(node);
    },
    [focusFilter, nodeHasUnreviewed]
  );

  const handleSelectSearchResult = (result: MindMapSearchResult) => {
    const nextExpanded = new Set(expandedIds);
    nextExpanded.add(tree.id);
    for (const ancestorId of result.ancestorIds) {
      nextExpanded.add(ancestorId);
    }
    setExpandedIds(nextExpanded);
    setSelectedId(result.id);

    const matchedNode = nodeMap.get(result.id);
    if (matchedNode && !nodeMatchesFilter(matchedNode)) {
      setFocusFilter('all');
    }

    setSearchQuery('');
    setSearchOpen(false);
    if (viewMode === 'canvas') {
      const nextLayout = computeMindMapLayout(tree, nextExpanded);
      focusNodeInViewport(result.id, nextLayout);
    }
  };

  const selectedPdfUrl =
    selectedNode.sourceFile &&
    subject.sourceFiles.some((f) => f.filename === selectedNode.sourceFile)
      ? buildStudyPdfUrl(subject.folderName, selectedNode.sourceFile, selectedNode.sourceRef)
      : null;
  const selectedSlidePage = extractFirstPageNumber(selectedNode.sourceRef);

  return (
    <section aria-labelledby="mindmap-heading" style={{ marginBottom: '2.5rem' }}>
      <div className="section-heading">
        <h2 id="mindmap-heading">Mind Map</h2>
      </div>

      <div className="memphis-card mindmap-shell">
        <div className="mindmap-toolbar">
          <div className="mindmap-controls">
            <button
              type="button"
              className={`memphis-btn mindmap-btn ${viewMode === 'canvas' ? 'memphis-btn--yellow' : ''}`}
              onClick={() => setViewMode('canvas')}
            >
              <Compass size={14} aria-hidden="true" />
              <span>Mind Map</span>
            </button>
            <button
              type="button"
              className={`memphis-btn mindmap-btn ${viewMode === 'outline' ? 'memphis-btn--yellow' : ''}`}
              onClick={() => setViewMode('outline')}
            >
              <ListTree size={14} aria-hidden="true" />
              <span>Branch Outline</span>
            </button>

            <button
              type="button"
              className="memphis-btn mindmap-btn"
              onClick={() =>
                setSortMode((prev) => (prev === 'weightage' ? 'blueprint' : 'weightage'))
              }
              title="Toggle module branch order"
            >
              <span>Order: {sortMode === 'weightage' ? 'Weightage ↓' : 'Mod 1→N'}</span>
            </button>
          </div>

          <div className="mindmap-controls">
            <button
              type="button"
              className="memphis-btn mindmap-btn"
              onClick={handleExpandAll}
              title="Expand all branches"
            >
              <Maximize2 size={14} aria-hidden="true" />
              <span>Expand All</span>
            </button>
            <button
              type="button"
              className="memphis-btn mindmap-btn"
              onClick={handleCollapseToModules}
              title="Collapse subtopics"
            >
              <Minimize2 size={14} aria-hidden="true" />
              <span>Modules Only</span>
            </button>

            {viewMode === 'canvas' && (
              <>
                <button
                  type="button"
                  className="memphis-btn mindmap-btn"
                  onClick={() => handleZoomBy(-0.15)}
                  aria-label="Zoom out mind map"
                >
                  <ZoomOut size={14} aria-hidden="true" />
                </button>
                <span className="memphis-pill" aria-live="polite">
                  {Math.round(transform.scale * 100)}%
                </span>
                <button
                  type="button"
                  className="memphis-btn mindmap-btn"
                  onClick={() => handleZoomBy(0.15)}
                  aria-label="Zoom in mind map"
                >
                  <ZoomIn size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="memphis-btn mindmap-btn memphis-btn--teal"
                  onClick={() => fitToViewport(layout)}
                  aria-label="Fit mind map to view"
                >
                  <Expand size={14} aria-hidden="true" />
                  <span>Fit</span>
                </button>
              </>
            )}
          </div>

          <div className="mindmap-toolbar-row--secondary">
            <div className="mindmap-controls" role="group" aria-label="Filter mind map branches">
              <button
                type="button"
                className={`memphis-btn mindmap-btn ${focusFilter === 'all' ? 'memphis-btn--yellow' : ''}`}
                onClick={() => setFocusFilter('all')}
                data-testid="filter-all"
              >
                All
              </button>
              {hasSignalsTrack && (
                <button
                  type="button"
                  className={`memphis-btn mindmap-btn ${focusFilter === 'signals' ? 'memphis-btn--pink' : ''}`}
                  onClick={() => setFocusFilter('signals')}
                  data-testid="filter-signals"
                >
                  Signals (CO4–5)
                </button>
              )}
              {hasNetworksTrack && (
                <button
                  type="button"
                  className={`memphis-btn mindmap-btn ${focusFilter === 'networks' ? 'memphis-btn--teal' : ''}`}
                  onClick={() => setFocusFilter('networks')}
                  data-testid="filter-networks"
                >
                  Networks (CO1–3)
                </button>
              )}
              <button
                type="button"
                className={`memphis-btn mindmap-btn ${focusFilter === 'todo' ? 'memphis-btn--yellow' : ''}`}
                onClick={() => setFocusFilter('todo')}
                data-testid="filter-todo"
              >
                To-Do
              </button>
            </div>

            <div className="mindmap-search-wrap">
              <div className="mindmap-search-box">
                <Search size={14} aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="mindmap-search-input"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      e.preventDefault();
                      handleSelectSearchResult(searchResults[0]);
                    }
                  }}
                  placeholder="Search topics (⌘K)"
                  aria-label="Search topics in mind map"
                  data-testid="mindmap-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="mindmap-search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    aria-label="Clear topic search"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </div>

              {searchOpen && searchQuery.trim().length > 0 && (
                <div
                  className="memphis-card mindmap-search-results"
                  role="listbox"
                  aria-label="Matching topics"
                  data-testid="mindmap-search-results"
                >
                  {searchResults.length === 0 ? (
                    <div className="mindmap-search-empty">No matching topic</div>
                  ) : (
                    searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        role="option"
                        aria-selected={res.id === selectedId}
                        className="mindmap-search-item"
                        onClick={() => handleSelectSearchResult(res)}
                        data-testid={`search-result-${res.id}`}
                      >
                        <span className="mindmap-search-item__title">{res.title}</span>
                        <span className="mindmap-search-item__meta">
                          {[res.coCode, res.moduleTitle].filter(Boolean).join(' • ')}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'canvas' ? (
          <div
            ref={viewportRef}
            className={`mindmap-viewport ${isGrabbing ? 'mindmap-viewport--grabbing' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            role="region"
            aria-label={`Interactive mind map for ${subject.shortName}. Drag to pan, click nodes to inspect, or click plus buttons to expand branches.`}
            data-testid="mindmap-canvas"
          >
            <div
              className={`mindmap-stage ${isGrabbing ? '' : 'mindmap-stage--smooth'}`}
              style={{
                width: renderedLayout.width,
                height: renderedLayout.height,
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              }}
            >
              <svg
                width={renderedLayout.width}
                height={renderedLayout.height}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                aria-hidden="true"
              >
                {renderedLayout.edges.map((edge) => {
                  const dx = Math.abs(edge.x2 - edge.x1) * 0.48;
                  const ctrlX1 = edge.x2 >= edge.x1 ? edge.x1 + dx : edge.x1 - dx;
                  const ctrlX2 = edge.x2 >= edge.x1 ? edge.x2 - dx : edge.x2 + dx;
                  const pathD = `M ${edge.x1} ${edge.y1} C ${ctrlX1} ${edge.y1}, ${ctrlX2} ${edge.y2}, ${edge.x2} ${edge.y2}`;
                  const isHighlighted =
                    edge.toId === selectedId || edge.fromId === selectedId;
                  const targetNode = nodeMap.get(edge.toId);
                  const isDimmed =
                    focusFilter !== 'all' && targetNode ? !nodeMatchesFilter(targetNode) : false;
                  const enterIdx = enteringOrder.get(edge.toId);
                  const isEntering = enterIdx !== undefined;
                  const wormStyle = isEntering
                    ? { animationDelay: `${Math.min(enterIdx, 6) * 95}ms` }
                    : undefined;
                  return (
                    <g key={edge.id} className={isDimmed ? 'mm-edge-dimmed' : undefined}>
                      <path
                        d={pathD}
                        pathLength={1}
                        fill="none"
                        stroke="#111111"
                        strokeWidth={isHighlighted ? 5 : 3.2}
                        strokeLinecap="round"
                        className={`mm-edge-path ${isEntering ? 'mm-edge-worm' : ''}`}
                        style={wormStyle}
                      />
                      <path
                        d={pathD}
                        pathLength={1}
                        fill="none"
                        stroke={getAccentHex(edge.accent)}
                        strokeWidth={isHighlighted ? 2.8 : 1.7}
                        strokeLinecap="round"
                        opacity={0.92}
                        className={`mm-edge-path ${isEntering ? 'mm-edge-worm' : ''}`}
                        style={wormStyle}
                      />
                    </g>
                  );
                })}
              </svg>

              {renderedLayout.nodes.map((positioned: PositionedMindMapNode) => {
                const { data, x, y, width, height, childCount, isExpanded, direction } =
                  positioned;
                const isSelected = data.id === selectedId;
                const isReviewed = reviewedIds.has(data.id);
                const isDimmed = focusFilter !== 'all' && !nodeMatchesFilter(data);
                const enterIdx = enteringOrder.get(data.id);
                const isEntering = enterIdx !== undefined;

                let levelClass = 'mm-node--level2';
                if (data.level === 0) levelClass = 'mm-node--level0';
                else if (data.level === 1) levelClass = `mm-node--level1-${data.accent}`;
                else if (data.level === 3) levelClass = 'mm-node--level3';

                const enterClass = isEntering
                  ? direction === 'left'
                    ? 'mm-node-wrap--enter-left'
                    : 'mm-node-wrap--enter-right'
                  : '';

                return (
                  <div
                    key={data.id}
                    className={`mm-node-wrap ${enterClass} ${isDimmed ? 'mm-node-wrap--dimmed' : ''}`}
                    style={{
                      left: x,
                      top: y,
                      width,
                      height,
                      animationDelay: isEntering
                        ? `${210 + Math.min(enterIdx, 6) * 95}ms`
                        : undefined,
                    }}
                  >
                    <button
                      type="button"
                      className={`mm-node ${levelClass} ${isSelected ? 'mm-node--selected' : ''} ${isReviewed ? 'mm-node--reviewed' : ''}`}
                      style={{ width: '100%', height: '100%' }}
                      onClick={() => handleNodeClick(data)}
                      data-testid={`mindmap-node-${data.id}`}
                    >
                      {(data.badge || isReviewed) && (
                        <div className="mm-node__badge-row">
                          {data.badge ? (
                            <span className="mm-node__badge">{data.badge}</span>
                          ) : (
                            <span />
                          )}
                          {isReviewed && (
                            <span
                              className="mm-node__badge"
                              style={{ background: 'var(--teal)' }}
                            >
                              DONE
                            </span>
                          )}
                        </div>
                      )}
                      <span className="mm-node__title">{data.title}</span>
                      {data.subtitle && (
                        <span className="mm-node__sub">{data.subtitle}</span>
                      )}
                    </button>

                    {childCount > 0 && data.level > 0 && (
                      <button
                        type="button"
                        className={`mm-toggle-btn ${
                          direction === 'left' ? 'mm-toggle-btn--left' : 'mm-toggle-btn--right'
                        }`}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${data.title}`}
                        aria-expanded={isExpanded}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNodeExpanded(data.id, true);
                          setSelectedId(data.id);
                        }}
                        data-testid={`mindmap-toggle-${data.id}`}
                      >
                        {isExpanded ? '−' : '+'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mindmap-outline" data-testid="mindmap-outline">
            {tree.children.filter((modNode) => nodeMatchesFilter(modNode)).map((modNode) => {
              const isOpen = expandedIds.has(modNode.id);
              return (
                <div key={modNode.id} className="outline-module">
                  <button
                    type="button"
                    className="outline-module__summary"
                    onClick={() => {
                      toggleNodeExpanded(modNode.id);
                      setSelectedId(modNode.id);
                    }}
                    aria-expanded={isOpen}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span>{modNode.title}</span>
                    </span>
                    <span className={`memphis-pill memphis-pill--solid-${modNode.accent === 'black' ? 'yellow' : modNode.accent}`}>
                      {modNode.badge}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="outline-groups">
                      {modNode.children.map((group) => (
                        <div
                          key={group.id}
                          style={{
                            border: '2px solid var(--ink)',
                            borderRadius: '10px',
                            padding: '0.7rem 0.85rem',
                            background: 'var(--bg-cream)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.4rem',
                              marginBottom: '0.45rem',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedId(group.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                fontWeight: 700,
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              {group.title}
                            </button>
                            <span className="memphis-pill">{group.sourceFile}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {group.children.map((leaf) => (
                              <button
                                key={leaf.id}
                                type="button"
                                className={`memphis-btn mindmap-btn ${
                                  leaf.id === selectedId ? 'memphis-btn--pink' : ''
                                }`}
                                onClick={() => setSelectedId(leaf.id)}
                              >
                                {reviewedIds.has(leaf.id) && <CheckCircle2 size={13} />}
                                <span>{leaf.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mindmap-inspector" data-testid="mindmap-inspector">
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h3 style={{ fontSize: '1.15rem' }}>{selectedNode.title}</h3>
            {(selectedNode.sourceFile || selectedNode.sourceRef) && (
              <p style={{ marginTop: '0.3rem', fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
                <FileText
                  size={14}
                  style={{ verticalAlign: 'middle', marginRight: '0.35rem' }}
                  aria-hidden="true"
                />
                {selectedNode.sourceFile}
                {selectedNode.sourceRef ? ` • ${selectedNode.sourceRef}` : ''}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {selectedPdfUrl && (
              <a
                href={selectedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="memphis-btn mindmap-btn memphis-btn--yellow"
                data-testid="mindmap-open-pdf"
              >
                <span>Open Slide (p. {selectedSlidePage})</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
            {selectedNode.level > 0 && selectedNode.children.length > 0 && (
              <button
                type="button"
                className="memphis-btn mindmap-btn"
                onClick={() => toggleNodeExpanded(selectedNode.id)}
              >
                {expandedIds.has(selectedNode.id) ? 'Collapse' : 'Expand'}
              </button>
            )}
            <button
              type="button"
              className={`memphis-btn mindmap-btn ${
                reviewedIds.has(selectedNode.id) ? 'memphis-btn--teal' : ''
              }`}
              onClick={() => onToggleReviewed(selectedNode.id)}
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>{reviewedIds.has(selectedNode.id) ? 'Done' : 'Mark Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
