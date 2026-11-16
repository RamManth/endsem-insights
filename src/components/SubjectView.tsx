import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckSquare,
  Compass,
  Flame,
  FolderOpen,
  GitBranch,
  Repeat,
} from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { buildStudyFileLibrary, computeExamReadiness } from '../lib/studyHelpers';
import { getChecklistForSubject } from '../lib/syllabusChecklistData';
import { smoothScrollToY } from '../lib/scrollMotion';
import { ExamCountdownBar } from './ExamCountdownBar';
import { FormulaCheatDrawer } from './FormulaCheatDrawer';
import { FloatingScrollNav } from './FloatingScrollNav';
import { GravityTabs, type GravityTabItem } from './GravityTabs';
import { MindMapView } from './MindMapView';
import { ModuleRankings } from './ModuleRankings';
import { OneAmSprintStrategy } from './OneAmSprintStrategy';
import { PyqReverseStrategySection } from './PyqReverseStrategySection';
import { StudyFilesSection } from './StudyFilesSection';
import { StudyStrategySection } from './StudyStrategySection';
import { SubjectErrorState } from './SubjectErrorState';
import { SyllabusChecklist } from './SyllabusChecklist';

interface SubjectViewProps {
  subject?: SubjectRecord;
  requestedId?: string;
  readySubject?: SubjectRecord;
  reviewedIds: Set<string>;
  onToggleReviewed: (nodeId: string) => void;
  onBackHome: () => void;
  onSelectSubject: (subjectId: string) => void;
}

type SubjectDashboardTab =
  | 'mindmap'
  | 'sprint'
  | 'checklist'
  | 'rankings'
  | 'strategy'
  | 'pyq'
  | 'files';

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
  const [activeTab, setActiveTab] = useState<SubjectDashboardTab>('mindmap');

  useEffect(() => {
    setActiveTab('mindmap');
  }, [subject?.id]);

  const hasPyq = Boolean(subject?.pyqAnalysis);
  const fileCount = useMemo(
    () => (subject ? buildStudyFileLibrary([subject]).length : 0),
    [subject]
  );
  const checklistCount = useMemo(
    () => (subject ? getChecklistForSubject(subject).length : 0),
    [subject]
  );
  const hasFiles = fileCount > 0;

  const dashboardTabs = useMemo<GravityTabItem[]>(() => {
    if (!subject) return [];
    const items: GravityTabItem[] = [
      {
        id: 'mindmap',
        label: 'Mind Map',
        badge: subject.modules.length,
        icon: <GitBranch size={15} aria-hidden="true" />,
        accent: 'yellow',
        testId: 'dash-tab-mindmap',
      },
      {
        id: 'sprint',
        label: '1 AM Sprint',
        badge: 'CRASH PLAN',
        icon: <Flame size={15} aria-hidden="true" />,
        accent: 'pink',
        testId: 'dash-tab-sprint',
      },
      {
        id: 'checklist',
        label: 'Checklist',
        badge: `${checklistCount} ITEMS`,
        icon: <CheckSquare size={15} aria-hidden="true" />,
        accent: 'teal',
        testId: 'dash-tab-checklist',
      },
      {
        id: 'rankings',
        label: 'Rankings',
        badge: subject.modules.length,
        icon: <Award size={15} aria-hidden="true" />,
        accent: 'yellow',
        testId: 'dash-tab-rankings',
      },
      {
        id: 'strategy',
        label: 'Study Plan',
        icon: <Compass size={15} aria-hidden="true" />,
        accent: 'yellow',
        testId: 'dash-tab-strategy',
      },
    ];
    if (hasPyq && subject.pyqAnalysis) {
      items.push({
        id: 'pyq',
        label: 'PYQ Strategy',
        badge: subject.pyqAnalysis.repeatedQuestionCount,
        icon: <Repeat size={15} aria-hidden="true" />,
        accent: 'pink',
        testId: 'dash-tab-pyq',
      });
    }
    if (hasFiles) {
      items.push({
        id: 'files',
        label: 'Files',
        badge: fileCount,
        icon: <FolderOpen size={15} aria-hidden="true" />,
        accent: 'teal',
        testId: 'dash-tab-files',
      });
    }
    return items;
  }, [subject, hasPyq, hasFiles, fileCount]);

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
    setActiveTab('mindmap');
    setFocusedModule((prev) => ({ moduleId, seq: (prev?.seq ?? 0) + 1 }));
    smoothScrollToY(0, 480);
  };

  return (
    <div data-testid={`subject-view-${subject.id}`}>
      <header
        className="memphis-card subject-header subject-header--compact"
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
          <h1 style={{ fontSize: 'clamp(1.5rem, 2.9vw, 2.05rem)' }}>
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
          <button
            type="button"
            className="memphis-btn memphis-btn--pink"
            onClick={() => setActiveTab('sprint')}
            data-testid="jump-sprint-btn"
          >
            <Flame size={16} aria-hidden="true" />
            <span>1 AM Sprint</span>
          </button>

          <button
            type="button"
            className="memphis-btn memphis-btn--teal"
            onClick={() => setActiveTab('checklist')}
            data-testid="jump-checklist-btn"
          >
            <CheckSquare size={16} aria-hidden="true" />
            <span>Checklist</span>
          </button>

          {subject.pyqAnalysis && (
            <button
              type="button"
              className="memphis-btn"
              onClick={() => setActiveTab('pyq')}
              data-testid="jump-pyq-btn"
            >
              <Repeat size={16} aria-hidden="true" />
              <span>PYQs ({subject.pyqAnalysis.repeatedQuestionCount})</span>
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

          {hasFiles && (
            <button
              type="button"
              className="memphis-btn"
              onClick={() => setActiveTab('files')}
              data-testid="jump-files-btn"
            >
              <FolderOpen size={16} aria-hidden="true" />
              <span>Files</span>
            </button>
          )}

          <button type="button" className="memphis-btn" onClick={onBackHome}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Subjects</span>
          </button>
        </div>
      </header>

      <ExamCountdownBar
        onOpenSprint={() => setActiveTab('sprint')}
        onOpenChecklist={() => setActiveTab('checklist')}
        compact
      />

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
            marginBottom: '1rem',
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

      <GravityTabs
        tabs={dashboardTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as SubjectDashboardTab)}
        ariaLabel="Subject dashboard categories"
        idPrefix="subject-dash"
      >
        {activeTab === 'mindmap' && (
          <MindMapView
            subject={subject}
            focusedModule={focusedModule}
            reviewedIds={reviewedIds}
            onToggleReviewed={onToggleReviewed}
          />
        )}

        {activeTab === 'sprint' && (
          <OneAmSprintStrategy
            subject={subject}
            onOpenChecklist={() => setActiveTab('checklist')}
            onOpenFormulaDrawer={() => setCheatDrawerOpen(true)}
            onFocusModule={handleFocusModule}
          />
        )}

        {activeTab === 'checklist' && (
          <SyllabusChecklist
            subject={subject}
            onFocusModule={handleFocusModule}
          />
        )}

        {activeTab === 'rankings' && (
          <ModuleRankings subject={subject} onFocusModule={handleFocusModule} />
        )}

        {activeTab === 'strategy' && <StudyStrategySection subject={subject} />}

        {activeTab === 'pyq' && hasPyq && (
          <PyqReverseStrategySection subject={subject} onFocusModule={handleFocusModule} />
        )}

        {activeTab === 'files' && hasFiles && (
          <StudyFilesSection subjects={[subject]} mode="subject" />
        )}
      </GravityTabs>

      <FloatingScrollNav />
    </div>
  );
}
