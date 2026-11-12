import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, BookOpen, Repeat } from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { computeExamReadiness } from '../lib/studyHelpers';
import { smoothScrollToElement } from '../lib/scrollMotion';
import { FloatingScrollNav, type ScrollSectionTarget } from './FloatingScrollNav';
import { FormulaCheatDrawer } from './FormulaCheatDrawer';
import { MindMapView } from './MindMapView';
import { ModuleRankings } from './ModuleRankings';
import { PyqReverseStrategySection } from './PyqReverseStrategySection';
import { ScrollReveal } from './ScrollReveal';
import { StudyStrategySection } from './StudyStrategySection';
import { SubjectErrorState } from './SubjectErrorState';

interface SubjectViewProps {
  subject?: SubjectRecord;
  requestedId?: string;
  readySubject?: SubjectRecord;
  reviewedIds: Set<string>;
  onToggleReviewed: (nodeId: string) => void;
  onBackHome: () => void;
  onSelectSubject: (subjectId: string) => void;
}

export function SubjectView({
  subject,
  requestedId,
  readySubject,
  reviewedIds,
  onToggleReviewed,
  onBackHome,
  onSelectSubject,
}: SubjectViewProps) {
  const [focusedModule, setFocusedModule] = useState<{ moduleId: string; seq: number } | null>(null);
  const [cheatDrawerOpen, setCheatDrawerOpen] = useState(false);
  const mindMapTopRef = useRef<HTMLDivElement | null>(null);
  const rankingsTopRef = useRef<HTMLDivElement | null>(null);
  const strategyTopRef = useRef<HTMLDivElement | null>(null);
  const pyqTopRef = useRef<HTMLDivElement | null>(null);

  const hasPyq = Boolean(subject?.pyqAnalysis);
  const scrollSections = useMemo<ScrollSectionTarget[]>(() => {
    const base: ScrollSectionTarget[] = [
      { id: 'mindmap', label: 'Map', getElement: () => mindMapTopRef.current },
      { id: 'rankings', label: 'Ranks', getElement: () => rankingsTopRef.current },
      { id: 'strategy', label: 'Plan', getElement: () => strategyTopRef.current },
    ];
    if (hasPyq) {
      base.push({ id: 'pyq', label: 'PYQs', getElement: () => pyqTopRef.current });
    }
    return base;
  }, [hasPyq]);

  if (!subject || subject.status !== 'ready' || subject.modules.length === 0) {
    return (
      <SubjectErrorState
        subject={subject}
        requestedId={requestedId}
        readySubject={readySubject}
        onBackHome={onBackHome}
        onOpenReadySubject={onSelectSubject}
      />
    );
  }

  const readiness = computeExamReadiness(subject, reviewedIds);

  const handleFocusModule = (moduleId: string) => {
    setFocusedModule((prev) => ({ moduleId, seq: (prev?.seq ?? 0) + 1 }));
    smoothScrollToElement(mindMapTopRef.current, 88, 720);
  };

  return (
    <div data-testid={`subject-view-${subject.id}`}>
      <header
        className="memphis-card subject-header"
        style={{
          borderTopWidth: '10px',
          borderTopColor:
            subject.accentColor === 'pink'
              ? 'var(--pink)'
              : subject.accentColor === 'teal'
                ? 'var(--teal)'
                : 'var(--yellow)',
        }}
      >
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.4rem' }}>
            <span className={`memphis-pill memphis-pill--solid-${subject.accentColor}`}>
              {subject.courseCode}
            </span>
            <span className="memphis-pill" data-testid="subject-readiness-pill">
              {readiness.earnedMarks} / {readiness.totalMarks} {readiness.unitLabel} ready ({readiness.percent}%)
            </span>
            {readiness.tracks.map((trk) => (
              <span
                key={trk.track}
                className={`memphis-pill ${
                  trk.track === 'Signals'
                    ? 'memphis-pill--pink'
                    : trk.track === 'Networks'
                      ? 'memphis-pill--teal'
                      : ''
                }`}
              >
                {trk.label}: {trk.earnedMarks}/{trk.totalMarks} marks
              </span>
            ))}
          </div>
          <h1 style={{ fontSize: 'clamp(1.65rem, 3.2vw, 2.3rem)' }}>
            {subject.shortName} — {subject.fullName}
          </h1>

          <div className="readiness-strip" aria-label={`Exam readiness ${readiness.percent}%`}>
            <div className="readiness-track">
              <div
                className="readiness-fill"
                style={{
                  width: `${readiness.percent}%`,
                  background: 'var(--teal)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', alignItems: 'center' }}>
          {subject.pyqAnalysis && (
            <button
              type="button"
              className="memphis-btn memphis-btn--pink"
              onClick={() => smoothScrollToElement(pyqTopRef.current, 88, 780)}
              data-testid="jump-pyq-btn"
            >
              <Repeat size={16} aria-hidden="true" />
              <span>PYQ Repeats ({subject.pyqAnalysis.repeatedQuestionCount})</span>
            </button>
          )}

          <button
            type="button"
            className="memphis-btn memphis-btn--yellow"
            onClick={() => setCheatDrawerOpen(true)}
            data-testid="open-formula-sheet-btn"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>Formula Sheet</span>
          </button>

          <button type="button" className="memphis-btn" onClick={onBackHome}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Subjects</span>
          </button>
        </div>
      </header>

      <FormulaCheatDrawer
        subject={subject}
        isOpen={cheatDrawerOpen}
        onClose={() => setCheatDrawerOpen(false)}
      />

      {subject.parseWarnings.length > 0 && (
        <div
          className="memphis-card"
          role="status"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            background: 'var(--yellow-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span style={{ fontSize: '0.88rem' }}>{subject.parseWarnings[0]}</span>
        </div>
      )}

      <div ref={mindMapTopRef} className="scroll-anchor">
        <ScrollReveal variant="up">
          <MindMapView
            subject={subject}
            focusedModule={focusedModule}
            reviewedIds={reviewedIds}
            onToggleReviewed={onToggleReviewed}
          />
        </ScrollReveal>
      </div>

      <div ref={rankingsTopRef} className="scroll-anchor">
        <ModuleRankings subject={subject} onFocusModule={handleFocusModule} />
      </div>

      <div ref={strategyTopRef} className="scroll-anchor">
        <StudyStrategySection subject={subject} />
      </div>

      <div ref={pyqTopRef} className="scroll-anchor">
        <PyqReverseStrategySection subject={subject} onFocusModule={handleFocusModule} />
      </div>

      <FloatingScrollNav sections={scrollSections} />
    </div>
  );
}
