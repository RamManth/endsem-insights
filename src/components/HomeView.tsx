import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, FolderOpen, LayoutGrid } from 'lucide-react';
import type { SubjectRecord, ValidationIssue } from '../types/study';
import { buildStudyFileLibrary, computeExamReadiness } from '../lib/studyHelpers';
import { rankModulesByWeightage } from '../lib/studyParser';
import { ExamCountdownBar } from './ExamCountdownBar';
import { GravityTabs, type GravityTabItem } from './GravityTabs';
import { MemphisGeoBadge, MemphisSquiggle } from './MemphisDecor';
import { ScrollReveal } from './ScrollReveal';
import { StudyFilesSection } from './StudyFilesSection';

interface HomeViewProps {
  subjects: SubjectRecord[];
  issues: ValidationIssue[];
  reviewedIds?: Set<string>;
  onSelectSubject: (subjectId: string) => void;
}

type HomeTab = 'subjects' | 'files';

export function HomeView({
  subjects,
  issues,
  reviewedIds = new Set<string>(),
  onSelectSubject,
}: HomeViewProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>('subjects');
  const totalFilesCount = useMemo(() => buildStudyFileLibrary(subjects).length, [subjects]);
  const primaryReadySubject = subjects.find((s) => s.status === 'ready')?.id ?? 'nas';

  const homeTabs: GravityTabItem[] = useMemo(() => {
    const base: GravityTabItem[] = [
      {
        id: 'subjects',
        label: 'Subjects',
        badge: subjects.length,
        icon: <LayoutGrid size={15} aria-hidden="true" />,
        accent: 'yellow',
        testId: 'home-tab-subjects',
      },
    ];
    if (totalFilesCount > 0) {
      base.push({
        id: 'files',
        label: 'Files Library',
        badge: totalFilesCount,
        icon: <FolderOpen size={15} aria-hidden="true" />,
        accent: 'teal',
        testId: 'home-tab-files',
      });
    }
    return base;
  }, [subjects.length, totalFilesCount]);

  return (
    <div>
      <ScrollReveal variant="up">
        <section className="home-hero home-hero--compact">
          <h1 className="home-title">Which subject do you want to study today?</h1>
          <div style={{ marginTop: '0.55rem' }}>
            <MemphisSquiggle />
          </div>
        </section>
      </ScrollReveal>

      <ExamCountdownBar
        onOpenSprint={() => onSelectSubject(primaryReadySubject)}
        onOpenChecklist={() => onSelectSubject(primaryReadySubject)}
      />

      {issues.some((i) => i.level === 'error') && (
        <div
          className="memphis-card"
          role="status"
          style={{
            padding: '0.8rem 1rem',
            marginBottom: '1.1rem',
            background: 'var(--pink-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{issues.find((i) => i.level === 'error')?.message}</span>
        </div>
      )}

      <GravityTabs
        tabs={homeTabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as HomeTab)}
        ariaLabel="Home dashboard categories"
        idPrefix="home"
      >
        {activeTab === 'subjects' ? (
          <section aria-label="Subjects">
            <div className="subject-grid">
              {subjects.map((subject, idx) => {
                const isReady = subject.status === 'ready';
                const ranked = rankModulesByWeightage(subject.modules);
                const topModule = ranked[0];
                const readiness = isReady ? computeExamReadiness(subject, reviewedIds) : null;

                return (
                  <ScrollReveal
                    key={subject.id}
                    variant="scale"
                    delayIndex={idx}
                    immediate
                    className="subject-card-reveal"
                  >
                    <button
                      type="button"
                      className="subject-card"
                      onClick={() => onSelectSubject(subject.id)}
                      data-testid={`subject-card-${subject.id}`}
                    >
                      <div className={`subject-card__band subject-card__band--${subject.accentColor}`} />

                      <div className="subject-card__body">
                        <div className="subject-card__top">
                          <div>
                            <h2 className="subject-card__title">{subject.shortName}</h2>
                            <p className="subject-card__full">
                              {subject.fullName !== subject.shortName ? subject.fullName : subject.courseCode}
                            </p>
                          </div>
                          <MemphisGeoBadge accent={subject.accentColor} />
                        </div>

                        <div className="subject-card__stats">
                          <div className="mini-stat">
                            <span className="mini-stat__label">Content</span>
                            <span className="mini-stat__val">
                              {isReady ? `${subject.modules.length} Modules` : 'Empty folder'}
                            </span>
                          </div>
                          <div className="mini-stat">
                            <span className="mini-stat__label">
                              {isReady ? 'Top Weight' : 'Status'}
                            </span>
                            <span className="mini-stat__val">
                              {isReady && topModule
                                ? `M${topModule.moduleNumber} • ${topModule.weightage} marks`
                                : 'No files'}
                            </span>
                          </div>
                        </div>

                        {readiness && (
                          <div className="home-readiness" data-testid={`home-readiness-${subject.id}`}>
                            <div className="home-readiness__meta">
                              <span>
                                {readiness.earnedMarks} / {readiness.totalMarks} {readiness.unitLabel} ready
                              </span>
                              <span>{readiness.percent}%</span>
                            </div>
                            <div className="readiness-track" aria-hidden="true">
                              <div
                                className="readiness-fill"
                                style={{
                                  width: `${readiness.percent}%`,
                                  background:
                                    subject.accentColor === 'pink'
                                      ? 'var(--pink)'
                                      : subject.accentColor === 'teal'
                                        ? 'var(--teal)'
                                        : 'var(--yellow)',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="subject-card__footer">
                        <span>
                          {isReady
                            ? `${subject.totalWeightage} ${subject.weightageSource === 'estimated' ? 'Est. %' : 'Marks'}`
                            : `${subject.folderName}/`}
                        </span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </div>
                    </button>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>
        ) : (
          <StudyFilesSection subjects={subjects} mode="home" />
        )}
      </GravityTabs>
    </div>
  );
}
