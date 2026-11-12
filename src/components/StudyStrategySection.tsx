import { useMemo, useState } from 'react';
import type { SubjectRecord } from '../types/study';
import { generateStudyStrategy } from '../lib/strategyEngine';
import { ScrollReveal } from './ScrollReveal';

interface StudyStrategySectionProps {
  subject: SubjectRecord;
}

const PRESET_HOURS = [6, 12, 20];

export function StudyStrategySection({ subject }: StudyStrategySectionProps) {
  const [availableHours, setAvailableHours] = useState(12);
  const strategy = useMemo(
    () => generateStudyStrategy(subject, availableHours),
    [subject, availableHours]
  );

  if (strategy.steps.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="strategy-heading" data-testid="study-strategy">
      <ScrollReveal variant="up">
        <div className="section-heading">
          <h2 id="strategy-heading">Study Strategy</h2>
          <span className="memphis-pill memphis-pill--solid-pink">
            TOP 2 = {strategy.topTwoCoveragePercent}%
          </span>
        </div>

        <div className="memphis-card strategy-banner">
          <h3 style={{ fontSize: '1.15rem' }}>{strategy.headline}</h3>

          <ul
            style={{
              margin: '0.65rem 0 0',
              paddingLeft: '1.15rem',
              fontSize: '0.9rem',
              display: 'grid',
              gap: '0.3rem',
            }}
          >
            {strategy.reasoningSummary.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>

          <div className="strategy-controls">
            {PRESET_HOURS.map((hrs) => (
              <button
                key={hrs}
                type="button"
                className={`memphis-btn mindmap-btn ${
                  availableHours === hrs ? 'memphis-btn--black' : ''
                }`}
                onClick={() => setAvailableHours(hrs)}
              >
                {hrs}h {hrs === 6 ? '(Sprint)' : hrs === 12 ? '(Standard)' : '(Full)'}
              </button>
            ))}

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginLeft: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <span>Custom: {availableHours}h</span>
              <input
                type="range"
                min={4}
                max={30}
                step={1}
                value={availableHours}
                aria-label="Available study hours before exam"
                onChange={(e) => setAvailableHours(Number(e.target.value))}
                style={{ accentColor: '#111111' }}
              />
            </label>
          </div>
        </div>
      </ScrollReveal>

      <div className="strategy-steps">
        {strategy.steps.map((step, idx) => {
          const stepAccent = step.order <= 2 ? 'pink' : step.order <= 4 ? 'teal' : 'yellow';

          return (
            <ScrollReveal key={step.moduleId} variant="up" delayIndex={idx}>
              <article
                className="memphis-card strategy-step"
                data-testid={`strategy-step-${step.order}`}
              >
                <div className="strategy-step__top">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.45rem' }}>
                    <span className={`memphis-pill memphis-pill--solid-${stepAccent}`}>
                      #{step.order}
                    </span>
                    <h3 style={{ fontSize: '1.05rem' }}>
                      M{step.moduleNumber} ({step.coCode}
                      {step.track ? ` • ${step.track}` : ''}): {step.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <span className="memphis-pill memphis-pill--yellow">{step.allocatedHours}h</span>
                    <span className="memphis-pill">
                      {step.weightage} marks • {step.cumulativePercent}% total
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>{step.rationale}</p>

                <div className="strategy-cols">
                  <div className="strategy-box">
                    <strong style={{ fontSize: '0.82rem' }}>Focus First</strong>
                    <ul>
                      {step.recommendedFocus.slice(0, 3).map((item) => (
                        <li key={item}>{item.replace(/\s*\([^)]*\)$/, '')}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="strategy-box">
                    <strong style={{ fontSize: '0.82rem' }}>Defer If Rushed</strong>
                    <ul>
                      {step.skipIfRushed.length > 0 ? (
                        step.skipIfRushed.slice(0, 2).map((item) => <li key={item}>{item}</li>)
                      ) : (
                        <li>Core examples only</li>
                      )}
                      <li>
                        <code>
                          {step.sourceFiles.filter((f) => !f.toLowerCase().includes('course plan')).join(', ') ||
                            step.sourceFiles[0]}
                        </code>
                      </li>
                    </ul>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
