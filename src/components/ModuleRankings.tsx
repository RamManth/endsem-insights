import { Crosshair, ExternalLink, Info } from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { buildStudyPdfUrl } from '../lib/studyHelpers';
import { rankModulesByWeightage } from '../lib/studyParser';
import { getAccentHex } from './MemphisDecor';
import { ScrollReveal } from './ScrollReveal';

interface ModuleRankingsProps {
  subject: SubjectRecord;
  onFocusModule: (moduleId: string) => void;
}

export function ModuleRankings({ subject, onFocusModule }: ModuleRankingsProps) {
  const rankedModules = rankModulesByWeightage(subject.modules);

  return (
    <section
      className="rankings-section"
      aria-labelledby="rankings-heading"
      data-testid="module-rankings"
    >
      <ScrollReveal variant="up">
        <div className="section-heading">
          <h2 id="rankings-heading">Module Rankings</h2>
          <span className="memphis-pill memphis-pill--yellow">
            {subject.weightageSource === 'estimated'
              ? 'Estimated weights'
              : `${subject.totalWeightage} marks total`}
          </span>
        </div>
      </ScrollReveal>

      {subject.weightageSource === 'estimated' && (
        <div
          className="memphis-card"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '0.9rem',
            background: 'var(--yellow-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            fontSize: '0.88rem',
          }}
        >
          <Info size={16} aria-hidden="true" />
          <span>Weightages are estimated from slide volume and example density.</span>
        </div>
      )}

      <div className="rankings-list">
        {rankedModules.map((mod, idx) => {
          const accent = mod.rank <= 2 ? 'pink' : mod.rank <= 4 ? 'teal' : 'yellow';
          const barColor = getAccentHex(accent);
          const primaryFile =
            mod.sourceFiles.find((f) => !f.toLowerCase().includes('course plan')) ??
            mod.sourceFiles[0];
          const pdfUrl = buildStudyPdfUrl(subject.folderName, primaryFile);

          return (
            <ScrollReveal key={mod.id} variant="up" delayIndex={idx}>
              <article
                className="memphis-card rank-card"
                data-testid={`ranked-module-${mod.id}`}
              >
                <div className="rank-badge" style={{ background: barColor }}>
                  <span>#{mod.rank}</span>
                </div>

                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.08rem' }}>
                    Module {mod.moduleNumber} ({mod.coCode}
                    {mod.track ? ` • ${mod.track}` : ''}) — {mod.title}
                  </h3>

                  <div className="rank-bar-track" aria-hidden="true">
                    <div
                      className="rank-bar-fill rank-bar-fill--animate"
                      style={{
                        width: `${Math.max(8, mod.weightagePercent)}%`,
                        background: barColor,
                      }}
                    />
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                    <strong>{mod.weightagePercent}%</strong> share
                    {mod.weightageSource === 'estimated' ? ' (Estimated)' : ''} •{' '}
                    {mod.sourceFiles.filter((f) => !f.toLowerCase().includes('course plan')).join(', ') ||
                      mod.sourceFiles[0]}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        lineHeight: 1,
                      }}
                    >
                      {mod.weightage}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      {mod.weightageUnit === '%' ? 'EST %' : 'MARKS'}
                    </span>
                  </div>

                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="memphis-btn mindmap-btn memphis-btn--yellow"
                      aria-label={`Open Module ${mod.moduleNumber} slides PDF`}
                    >
                      <span>Slides</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  )}

                  <button
                    type="button"
                    className="memphis-btn mindmap-btn"
                    onClick={() => onFocusModule(mod.id)}
                    aria-label={`Focus Module ${mod.moduleNumber} in Mind Map`}
                  >
                    <Crosshair size={14} aria-hidden="true" />
                    <span>Focus</span>
                  </button>
                </div>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
