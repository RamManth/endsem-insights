import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  Flame,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import {
  getChecklistForSubject,
  type SyllabusChecklistItem,
} from '../lib/syllabusChecklistData';
import { buildStudyPdfUrl } from '../lib/studyHelpers';
import { ScrollReveal } from './ScrollReveal';

interface SyllabusChecklistProps {
  subject: SubjectRecord;
  onFocusModule?: (moduleId: string) => void;
  onItemToggled?: (item: SyllabusChecklistItem, checked: boolean) => void;
}

const STORAGE_CHECKLIST_KEY = 'endsem-insights-checklist-v1';

function loadCheckedSet(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_CHECKLIST_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((v): v is string => typeof v === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

function saveCheckedSet(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_CHECKLIST_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

type ChecklistFilter = 'all' | '1am-core' | 'pending' | 'completed';

export function SyllabusChecklist({
  subject,
  onFocusModule,
  onItemToggled,
}: SyllabusChecklistProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => loadCheckedSet());
  const [filter, setFilter] = useState<ChecklistFilter>('all');

  const allItems = useMemo(() => getChecklistForSubject(subject), [subject]);

  const toggleItem = (item: SyllabusChecklistItem) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const isNowChecked = !next.has(item.id);
      if (isNowChecked) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }
      saveCheckedSet(next);
      onItemToggled?.(item, isNowChecked);
      return next;
    });
  };

  const handleMarkAllCore = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const item of allItems) {
        if (item.priority === '1am-core') {
          next.add(item.id);
        }
      }
      saveCheckedSet(next);
      return next;
    });
  };

  const handleClearAll = () => {
    setCheckedIds(new Set());
    saveCheckedSet(new Set());
  };

  // Metrics
  const totalItems = allItems.length;
  const completedCount = allItems.filter((i) => checkedIds.has(i.id)).length;
  const coreItems = allItems.filter((i) => i.priority === '1am-core');
  const coreCompletedCount = coreItems.filter((i) => checkedIds.has(i.id)).length;

  const totalMarks = subject.totalWeightage || 50;
  // Compute marks from checked items without double-counting past totalMarks
  const earnedMarks = Math.min(
    totalMarks,
    allItems
      .filter((i) => checkedIds.has(i.id))
      .reduce((sum, i) => sum + i.marks, 0)
  );
  const earnedPercent = Math.round((earnedMarks / totalMarks) * 100);

  // Minutes remaining for pending items
  const minutesRemaining = allItems
    .filter((i) => !checkedIds.has(i.id))
    .reduce((sum, i) => sum + i.estMinutes, 0);
  const hoursRemaining = (minutesRemaining / 60).toFixed(1);

  // Filtered items
  const visibleItems = allItems.filter((item) => {
    const isChecked = checkedIds.has(item.id);
    if (filter === '1am-core') return item.priority === '1am-core';
    if (filter === 'pending') return !isChecked;
    if (filter === 'completed') return isChecked;
    return true;
  });

  // Group by Module
  const groupedByModule = useMemo(() => {
    const map = new Map<number, SyllabusChecklistItem[]>();
    for (const item of visibleItems) {
      const list = map.get(item.moduleNumber) ?? [];
      list.push(item);
      map.set(item.moduleNumber, list);
    }
    // Sort in priority order: M5, M4, M1, M3, M2
    const priorityOrder = [5, 4, 1, 3, 2];
    const entries: { moduleNumber: number; items: SyllabusChecklistItem[] }[] = [];
    for (const modNum of priorityOrder) {
      if (map.has(modNum)) {
        entries.push({ moduleNumber: modNum, items: map.get(modNum)! });
      }
    }
    // Any remaining modules
    for (const [modNum, items] of map.entries()) {
      if (!priorityOrder.includes(modNum)) {
        entries.push({ moduleNumber: modNum, items });
      }
    }
    return entries;
  }, [visibleItems]);

  return (
    <section className="checklist-section" data-testid="syllabus-checklist">
      <ScrollReveal variant="up">
        <div className="section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <CheckSquare size={22} aria-hidden="true" />
            <h2 id="checklist-heading">Syllabus Completion Checklist</h2>
          </div>
          <span className="memphis-pill memphis-pill--solid-pink">
            {completedCount} / {totalItems} TOPICS CHECKED
          </span>
        </div>

        {/* Progress Scoreboard */}
        <div className="memphis-card checklist-scoreboard" data-testid="checklist-scoreboard">
          <div className="checklist-kpi">
            <span className="checklist-kpi__label">MARKS READY</span>
            <span className="checklist-kpi__val">
              {earnedMarks} / {totalMarks}
            </span>
            <div className="checklist-kpi__bar">
              <div
                className="checklist-kpi__fill"
                style={{ width: `${earnedPercent}%` }}
              />
            </div>
          </div>

          <div className="checklist-kpi">
            <span className="checklist-kpi__label">SYLLABUS PROGRESS</span>
            <span className="checklist-kpi__val">
              {Math.round((completedCount / totalItems) * 100)}%
            </span>
            <span className="checklist-kpi__sub">
              {completedCount} of {totalItems} topics mastered
            </span>
          </div>

          <div className="checklist-kpi">
            <span className="checklist-kpi__label">1 AM CRASH CORE</span>
            <span className="checklist-kpi__val">
              {coreCompletedCount} / {coreItems.length}
            </span>
            <span className="checklist-kpi__sub">
              Locks in 64%+ passing marks
            </span>
          </div>

          <div className="checklist-kpi">
            <span className="checklist-kpi__label">EST. TIME REMAINING</span>
            <span className="checklist-kpi__val">{hoursRemaining}h</span>
            <span className="checklist-kpi__sub">{minutesRemaining} mins total drill</span>
          </div>
        </div>
      </ScrollReveal>

      {/* Filter and Quick Action Toolbar */}
      <div className="checklist-toolbar" role="group" aria-label="Filter and manage checklist">
        <div className="checklist-filter-pills">
          <button
            type="button"
            className={`memphis-btn mindmap-btn ${filter === 'all' ? 'memphis-btn--yellow' : ''}`}
            onClick={() => setFilter('all')}
            data-testid="filter-all"
          >
            All Items ({totalItems})
          </button>
          <button
            type="button"
            className={`memphis-btn mindmap-btn ${filter === '1am-core' ? 'memphis-btn--pink' : ''}`}
            onClick={() => setFilter('1am-core')}
            data-testid="filter-1am-core"
          >
            <Flame size={13} aria-hidden="true" style={{ marginRight: '0.2rem' }} />
            1 AM Core ({coreItems.length})
          </button>
          <button
            type="button"
            className={`memphis-btn mindmap-btn ${filter === 'pending' ? 'memphis-btn--teal' : ''}`}
            onClick={() => setFilter('pending')}
            data-testid="filter-pending"
          >
            Pending ({totalItems - completedCount})
          </button>
          <button
            type="button"
            className={`memphis-btn mindmap-btn ${filter === 'completed' ? 'memphis-btn--black' : ''}`}
            onClick={() => setFilter('completed')}
            data-testid="filter-completed"
          >
            <Check size={13} aria-hidden="true" style={{ marginRight: '0.2rem' }} />
            Completed ({completedCount})
          </button>
        </div>

        <div className="checklist-actions">
          <button
            type="button"
            className="memphis-btn mindmap-btn memphis-btn--pink"
            onClick={handleMarkAllCore}
            data-testid="mark-all-core-btn"
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Mark 1 AM Core Done</span>
          </button>
          <button
            type="button"
            className="memphis-btn mindmap-btn"
            onClick={handleClearAll}
            data-testid="clear-all-checks-btn"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Checklist Grouped by Modules */}
      <div className="checklist-groups" data-testid="checklist-items-container">
        {groupedByModule.length === 0 ? (
          <div className="memphis-card checklist-empty" role="status">
            <CheckCircle2 size={36} aria-hidden="true" style={{ color: 'var(--teal)' }} />
            <h3>No topics match this filter!</h3>
            <p style={{ color: 'var(--ink-muted)', marginTop: '0.3rem' }}>
              Switch to "All Items" to review or check off more topics.
            </p>
          </div>
        ) : (
          groupedByModule.map(({ moduleNumber, items }) => {
            const modRecord = subject.modules.find((m) => m.moduleNumber === moduleNumber);
            const modWeight = modRecord?.weightage ?? items.reduce((s, i) => s + i.marks, 0);
            const modTitle = modRecord?.title ?? `Module ${moduleNumber}`;
            const modCo = modRecord?.coCode ?? `CO${moduleNumber}`;
            const modTrack = modRecord?.track ?? items[0]?.track ?? 'Networks';
            const accent = moduleNumber === 5 ? 'pink' : moduleNumber === 4 ? 'teal' : 'yellow';

            return (
              <div key={moduleNumber} className="checklist-module-group">
                <div className={`checklist-module-header checklist-module-header--${accent}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="memphis-pill memphis-pill--black">M{moduleNumber}</span>
                    <span className="memphis-pill">{modCo} • {modTrack}</span>
                    <h3 style={{ fontSize: '1.02rem', margin: 0 }}>{modTitle}</h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span className="memphis-pill memphis-pill--solid-pink">
                      {modWeight} Marks
                    </span>
                    {onFocusModule && modRecord && (
                      <button
                        type="button"
                        className="memphis-btn mindmap-btn"
                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                        onClick={() => onFocusModule(modRecord.id)}
                      >
                        Focus in Map
                      </button>
                    )}
                  </div>
                </div>

                <div className="checklist-items-list">
                  {items.map((item) => {
                    const isChecked = checkedIds.has(item.id);
                    const pdfUrl = buildStudyPdfUrl(subject.folderName, item.sourceFile, `p. ${item.page || 1}`);
                    const solvedPdfUrl = `/study-files/${subject.folderName}/resources/NAS_Repeated_Questions_Solved_With_Circuits.pdf#page=1`;

                    return (
                      <article
                        key={item.id}
                        className={`checklist-item ${isChecked ? 'checklist-item--checked' : ''}`}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <label className="checklist-item__checkbox-wrap">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item)}
                            className="checklist-native-checkbox"
                            aria-label={`Mark ${item.title} as completed`}
                          />
                          <span className="checklist-custom-box" aria-hidden="true">
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </span>
                        </label>

                        <div className="checklist-item__content">
                          <div className="checklist-item__top-row">
                            <h4 className="checklist-item__title">{item.title}</h4>
                            <div className="checklist-item__badges">
                              {item.priority === '1am-core' && (
                                <span className="memphis-pill memphis-pill--pink">
                                  <Flame size={11} aria-hidden="true" style={{ marginRight: '0.15rem' }} />
                                  1 AM CORE
                                </span>
                              )}
                              {item.pyqFrequency && (
                                <span className="memphis-pill memphis-pill--yellow">
                                  {item.pyqFrequency}
                                </span>
                              )}
                              <span className="memphis-pill">+{item.marks}m</span>
                              <span className="memphis-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Clock size={11} aria-hidden="true" />
                                {item.estMinutes}m
                              </span>
                            </div>
                          </div>

                          <p className="checklist-item__concept">{item.keyConcept}</p>

                          <div className="checklist-item__links">
                            {pdfUrl && (
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="checklist-link"
                                aria-label={`Open ${item.sourceFile} at page ${item.page}`}
                              >
                                <FileText size={12} aria-hidden="true" />
                                <span>{item.sourceFile} (p.{item.page || 1})</span>
                                <ExternalLink size={10} aria-hidden="true" />
                              </a>
                            )}
                            {item.solvedPdfRef && (
                              <a
                                href={solvedPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="checklist-link checklist-link--solved"
                                aria-label={`Open Solved Circuits PDF for ${item.title}`}
                              >
                                <Sparkles size={12} aria-hidden="true" />
                                <span>Solved Circuits: {item.solvedPdfRef}</span>
                                <ExternalLink size={10} aria-hidden="true" />
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
