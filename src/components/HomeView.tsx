import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { SubjectRecord, ValidationIssue } from '../types/study';
import { computeExamReadiness } from '../lib/studyHelpers';
import { rankModulesByWeightage } from '../lib/studyParser';
import { MemphisGeoBadge, MemphisSquiggle } from './MemphisDecor';
import { ScrollReveal } from './ScrollReveal';

interface HomeViewProps {
  subjects: SubjectRecord[];
  issues: ValidationIssue[];
  reviewedIds?: Set<string>;
  onSelectSubject: (subjectId: string) => void;
}

export function HomeView({
  subjects,
  issues,
  reviewedIds = new Set<string>(),
  onSelectSubject,
}: HomeViewProps) {
  return (
    <div>
      <ScrollReveal variant="up">
        <section className="home-hero">
          <h1 className="home-title">Which subject do you want to study today?</h1>
          <div style={{ marginTop: '0.65rem' }}>
            <MemphisSquiggle />
          </div>
        </section>
      </ScrollReveal>

      {issues.some((i) => i.level === 'error') && (
        <div
          className="memphis-card"
          role="status"
          style={{
            padding: '0.8rem 1rem',
            marginBottom: '1.25rem',
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
    </div>
  );
}
