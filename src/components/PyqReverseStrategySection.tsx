import { useState } from 'react';
import { Crosshair, Download, ExternalLink, Layers, Repeat, Target } from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { buildStudyDownloadUrl, buildStudyPdfUrl } from '../lib/studyHelpers';
import { getAccentHex } from './MemphisDecor';
import { CountUpNumber, ScrollReveal } from './ScrollReveal';

interface PyqReverseStrategySectionProps {
  subject: SubjectRecord;
  onFocusModule: (moduleId: string) => void;
}

type PyqFilterMode = 'all' | 'Signals' | 'Networks' | 'exact-only';

export function PyqReverseStrategySection({
  subject,
  onFocusModule,
}: PyqReverseStrategySectionProps) {
  const [filterMode, setFilterMode] = useState<PyqFilterMode>('all');
  const pyq = subject.pyqAnalysis;

  if (!pyq) return null;

  const filteredQuestions = pyq.repeatedQuestions.filter((item) => {
    if (filterMode === 'Signals') return item.track === 'Signals';
    if (filterMode === 'Networks') return item.track === 'Networks';
    if (filterMode === 'exact-only') {
      return item.matchType === 'exact' || item.matchType === 'exact-circuit';
    }
    return true;
  });

  const filteredTopics = pyq.repeatedTopics.filter((item) => {
    if (filterMode === 'Signals') return item.track === 'Signals';
    if (filterMode === 'Networks') return item.track === 'Networks';
    return true;
  });

  const resolveResourceUrls = (category: 'pyq-summary' | 'pyq-solutions') => {
    const file = subject.resourceFiles?.find((res) => res.category === category);
    if (!file) return null;
    const folderPrefix = `${subject.folderName}/`;
    const rel = file.relativePath.startsWith(folderPrefix)
      ? file.relativePath.slice(folderPrefix.length)
      : file.relativePath;
    return {
      file,
      openUrl: buildStudyPdfUrl(subject.folderName, rel, 'p. 1'),
      downloadUrl: buildStudyDownloadUrl(subject.folderName, rel),
    };
  };

  const summaryResource = resolveResourceUrls('pyq-summary');
  const solutionsResource = resolveResourceUrls('pyq-solutions');

  return (
    <section
      className="pyq-section"
      aria-labelledby="pyq-heading"
      data-testid="pyq-reverse-strategy"
    >
      <ScrollReveal variant="up">
        <div className="section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Repeat size={22} aria-hidden="true" />
            <h2 id="pyq-heading">PYQ Reverse Strategy</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {solutionsResource?.openUrl && (
              <a
                href={solutionsResource.openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="memphis-btn mindmap-btn memphis-btn--teal"
                style={{ textDecoration: 'none' }}
              >
                <span>Solved Circuits PDF ({solutionsResource.file.pageCount}p)</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
            {summaryResource?.openUrl && (
              <a
                href={summaryResource.openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="memphis-btn mindmap-btn memphis-btn--yellow"
                style={{ textDecoration: 'none' }}
              >
                <span>Repeated Qs PDF ({summaryResource.file.pageCount}p)</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
            {summaryResource?.downloadUrl && (
              <a
                href={summaryResource.downloadUrl}
                download={summaryResource.file.filename}
                className="memphis-btn mindmap-btn"
                style={{ textDecoration: 'none' }}
                aria-label={`Download ${summaryResource.file.filename}`}
              >
                <Download size={13} aria-hidden="true" />
                <span>Download List</span>
              </a>
            )}
            <span className="memphis-pill memphis-pill--pink">
              {pyq.totalQuestionsScanned} Questions • {pyq.totalExamSessions} Exams ({pyq.totalPdfCount} PDFs)
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* Stats Summary */}
      <ScrollReveal variant="up" delayIndex={1}>
        <div className="pyq-stats-grid" data-testid="pyq-stats-grid">
          <div className="memphis-card pyq-stat-card" style={{ background: 'var(--yellow-soft)' }}>
            <span className="pyq-stat-card__label">Exams Scanned</span>
            <span className="pyq-stat-card__val">
              <CountUpNumber value={pyq.totalExamSessions} />
            </span>
            <span className="pyq-stat-card__sub">{pyq.totalPdfCount} PYQ PDFs</span>
          </div>
          <div className="memphis-card pyq-stat-card" style={{ background: 'var(--pink-soft)' }}>
            <span className="pyq-stat-card__label">Questions Audited</span>
            <span className="pyq-stat-card__val">
              <CountUpNumber value={pyq.totalQuestionsScanned} />
            </span>
            <span className="pyq-stat-card__sub">Part A + Part B + Makeups</span>
          </div>
          <div className="memphis-card pyq-stat-card" style={{ background: 'var(--teal-soft)' }}>
            <span className="pyq-stat-card__label">Repeated Questions</span>
            <span className="pyq-stat-card__val">
              <CountUpNumber value={pyq.repeatedQuestionCount} />
            </span>
            <span className="pyq-stat-card__sub">Exact / circuit / template</span>
          </div>
          <div className="memphis-card pyq-stat-card">
            <span className="pyq-stat-card__label">Repeated Topics</span>
            <span className="pyq-stat-card__val">
              <CountUpNumber value={pyq.repeatedTopicCount} />
            </span>
            <span className="pyq-stat-card__sub">Cross-exam archetypes</span>
          </div>
        </div>
      </ScrollReveal>

      {/* Reverse Strategy Check: PYQ vs Blueprint */}
      {pyq.reverseStrategy.length > 0 && (
        <div className="pyq-reverse-grid" data-testid="pyq-reverse-checks">
          {pyq.reverseStrategy.map((card, idx) => (
            <ScrollReveal
              key={card.id}
              variant="scale"
              delayIndex={idx}
              className="pyq-card-reveal"
            >
              <article
                className="memphis-card pyq-reverse-card"
                style={{ borderTopWidth: '8px', borderTopColor: getAccentHex(card.accent) }}
              >
                <div className="pyq-reverse-card__top">
                  <span className={`memphis-pill memphis-pill--${card.accent}`}>
                    {card.verdict}
                  </span>
                  {card.metric && <span className="memphis-pill">{card.metric}</span>}
                </div>
                <h3 style={{ fontSize: '1.02rem', marginTop: '0.5rem' }}>{card.headline}</h3>
                <p style={{ marginTop: '0.35rem', fontSize: '0.86rem', color: 'var(--ink-muted)' }}>
                  {card.detail}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="pyq-filter-bar" role="group" aria-label="Filter PYQ repeats">
        {(
          [
            { key: 'all', label: 'All Tracks' },
            { key: 'Signals', label: 'Signals (CO4–5)' },
            { key: 'Networks', label: 'Networks (CO1–3)' },
            { key: 'exact-only', label: 'Exact / Same Circuit Only' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`memphis-btn mindmap-btn ${
              filterMode === tab.key
                ? tab.key === 'Signals'
                  ? 'memphis-btn--pink'
                  : tab.key === 'Networks'
                    ? 'memphis-btn--teal'
                    : 'memphis-btn--yellow'
                : ''
            }`}
            onClick={() => setFilterMode(tab.key)}
            data-testid={`pyq-filter-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* LIST 1: Repeated Questions */}
      <div className="pyq-subblock" data-testid="pyq-repeated-questions-list">
        <div className="pyq-subblock__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Target size={18} aria-hidden="true" />
            <h3>1. Repeated Questions ({filteredQuestions.length})</h3>
          </div>
          <span className="memphis-pill">Exact / circuit / prompt frequency</span>
        </div>

        <div className="pyq-list">
          {filteredQuestions.map((item, idx) => {
            const trackPill =
              item.track === 'Signals'
                ? 'memphis-pill--pink'
                : item.track === 'Networks'
                  ? 'memphis-pill--teal'
                  : 'memphis-pill--yellow';

            const matchLabel =
              item.matchType === 'exact'
                ? 'EXACT REPEAT'
                : item.matchType === 'exact-circuit'
                  ? 'SAME CIRCUIT'
                  : 'REPEAT TEMPLATE';

            return (
              <ScrollReveal
                key={`${filterMode}-${item.id}`}
                variant="up"
                delayIndex={idx}
                maxStagger={5}
                immediate={filterMode !== 'all'}
              >
                <article
                  className="memphis-card pyq-repeat-card"
                  data-testid={`pyq-question-${item.id}`}
                >
                  <div
                    className="pyq-freq-box"
                    style={{
                      background:
                        item.examPaperCount >= 4
                          ? 'var(--pink)'
                          : item.examPaperCount === 3
                            ? 'var(--yellow)'
                            : 'var(--teal)',
                    }}
                  >
                    <span className="pyq-freq-box__count">
                      <CountUpNumber value={item.appearanceCount} suffix="×" durationMs={520} />
                    </span>
                    <span className="pyq-freq-box__sub">
                      in {item.examPaperCount}/{pyq.totalExamSessions} exams
                    </span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.3rem' }}>
                      <span className={`memphis-pill ${trackPill}`}>
                        {item.coCode}
                        {item.track ? ` • ${item.track}` : ''} • {item.blueprintMarks}m endsem
                      </span>
                      <span className="memphis-pill memphis-pill--yellow">{matchLabel}</span>
                      {item.cumulativeMarks > 0 && (
                        <span className="memphis-pill">{item.cumulativeMarks} PYQ marks</span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '1.04rem' }}>{item.title}</h4>
                    <p style={{ marginTop: '0.22rem', fontSize: '0.86rem', color: 'var(--ink-muted)' }}>
                      {item.summaryCue}
                    </p>

                    <div className="pyq-appearances">
                      {item.appearances.map((app, aIdx) => {
                        const pdfUrl = buildStudyPdfUrl(
                          subject.folderName,
                          app.sourceFile,
                          `p. ${app.page}`
                        );
                        const label = `${app.examLabel} ${app.questionRef}${
                          app.marks !== null ? ` (${app.marks}m)` : ''
                        } • p.${app.page}`;

                        return pdfUrl ? (
                          <a
                            key={`${item.id}-${aIdx}`}
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="memphis-btn mindmap-btn pyq-chip"
                            title={app.detail}
                          >
                            <span>{label}</span>
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        ) : (
                          <span key={`${item.id}-${aIdx}`} className="memphis-pill" title={app.detail}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {item.moduleId && (
                    <button
                      type="button"
                      className="memphis-btn mindmap-btn"
                      onClick={() => onFocusModule(item.moduleId)}
                      title="Focus mapped module in Mind Map"
                    >
                      <Crosshair size={14} aria-hidden="true" />
                      <span>Map</span>
                    </button>
                  )}
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {/* LIST 2: Repeated Topics */}
      <div className="pyq-subblock" data-testid="pyq-repeated-topics-list">
        <div className="pyq-subblock__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Layers size={18} aria-hidden="true" />
            <h3>2. Repeated Topics ({filteredTopics.length})</h3>
          </div>
          <span className="memphis-pill">Paper coverage &amp; blueprint alignment</span>
        </div>

        <div className="pyq-topics-grid">
          {filteredTopics.map((topic, idx) => {
            const pct = Math.round((topic.paperHits / Math.max(1, topic.totalPapers)) * 100);
            const verdictClass =
              topic.strategyVerdict === 'Must-Do Core'
                ? 'memphis-pill--solid-pink'
                : topic.strategyVerdict === 'High-ROI Focus'
                  ? 'memphis-pill--pink'
                  : topic.strategyVerdict === 'Template Drill'
                    ? 'memphis-pill--teal'
                    : 'memphis-pill--yellow';

            const sampleUrl =
              topic.sourceFile
                ? buildStudyPdfUrl(subject.folderName, topic.sourceFile, `p. ${topic.page ?? 1}`)
                : null;

            return (
              <ScrollReveal
                key={`${filterMode}-${topic.id}`}
                variant="scale"
                delayIndex={idx}
                maxStagger={5}
                className="pyq-card-reveal"
                immediate={filterMode !== 'all'}
              >
                <article
                  className="memphis-card pyq-topic-card"
                  data-testid={`pyq-topic-${topic.id}`}
                >
                  <div className="pyq-topic-card__top">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <span className={`memphis-pill ${verdictClass}`}>{topic.strategyVerdict}</span>
                      <span className="memphis-pill">
                        {topic.coCode}
                        {topic.track ? ` • ${topic.track}` : ''}
                      </span>
                    </div>
                    <span className="pyq-topic-card__score">
                      {topic.paperHits}/{topic.totalPapers} exams ({pct}%)
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.02rem', marginTop: '0.45rem' }}>{topic.title}</h4>

                  <div className="pyq-topic-stats">
                    <span>
                      <strong>{topic.questionCount}</strong> PYQ questions
                    </span>
                    <span>
                      <strong>{topic.cumulativeMarks}</strong> PYQ marks
                    </span>
                    <span>
                      <strong>{topic.blueprintMarks}m</strong> Endsem weight
                    </span>
                  </div>

                  <div className="rank-bar-track" aria-hidden="true" style={{ margin: '0.45rem 0' }}>
                    <div
                      className="rank-bar-fill rank-bar-fill--animate"
                      style={{
                        width: `${Math.max(12, pct)}%`,
                        background: topic.track === 'Signals' ? 'var(--pink)' : 'var(--teal)',
                      }}
                    />
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>{topic.summary}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.65rem' }}>
                    {topic.moduleId && (
                      <button
                        type="button"
                        className="memphis-btn mindmap-btn"
                        onClick={() => onFocusModule(topic.moduleId)}
                      >
                        <Crosshair size={13} aria-hidden="true" />
                        <span>Focus Module</span>
                      </button>
                    )}
                    {sampleUrl && (
                      <a
                        href={sampleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="memphis-btn mindmap-btn memphis-btn--yellow"
                      >
                        <span>Sample PYQ (p. {topic.page ?? 1})</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {/* Audited Papers Bar */}
      <div className="pyq-papers-bar" data-testid="pyq-papers-bar">
        {pyq.papers.map((paper) => {
          const url = buildStudyPdfUrl(subject.folderName, paper.relativePath, 'p. 1');
          const text = `${paper.examLabel} • ${paper.questionCount} Qs${
            paper.maxMarks > 0 ? ` (${paper.maxMarks}m)` : ''
          }`;
          return url ? (
            <a
              key={paper.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="memphis-btn mindmap-btn"
            >
              <span>{text}</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : (
            <span key={paper.id} className="memphis-pill">
              {text}
            </span>
          );
        })}
      </div>
    </section>
  );
}

