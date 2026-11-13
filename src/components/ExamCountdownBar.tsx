import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  Compass,
  Edit2,
  Flame,
  Zap,
} from 'lucide-react';

interface ExamCountdownBarProps {
  onOpenSprint?: () => void;
  onOpenChecklist?: () => void;
  className?: string;
  compact?: boolean;
}

const STORAGE_EXAM_DATE_KEY = 'endsem-insights-exam-target-v1';
const STORAGE_ONE_AM_TARGET_KEY = 'endsem-insights-1am-target-v1';

// Default Endsem Exam: Tomorrow at 08:00 AM (Nov 14, 2026 at 08:00 AM)
function getDefaultExamTarget(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

function getInitialExamTarget(): Date {
  try {
    const saved = window.localStorage.getItem(STORAGE_EXAM_DATE_KEY);
    if (saved) {
      const d = new Date(saved);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    // fallback
  }
  return getDefaultExamTarget();
}

function getInitialOneAmTarget(): Date {
  try {
    const saved = window.localStorage.getItem(STORAGE_ONE_AM_TARGET_KEY);
    if (saved) {
      const d = new Date(saved);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    // fallback
  }
  const now = new Date();
  const target = new Date(now);
  // If current hour is >= 1, next 1 AM is the following calendar morning
  if (now.getHours() >= 1) {
    target.setDate(target.getDate() + 1);
  }
  target.setHours(1, 0, 0, 0);
  return target;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function computeRemaining(target: Date, now: Date): TimeRemaining {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return { totalMs: diff, days, hours, minutes, seconds, isPast: false };
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function ExamCountdownBar({
  onOpenSprint,
  onOpenChecklist,
  className = '',
  compact = false,
}: ExamCountdownBarProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [examTarget, setExamTarget] = useState<Date>(() => getInitialExamTarget());
  const [oneAmTarget, setOneAmTarget] = useState<Date>(() => getInitialOneAmTarget());
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [customExamInput, setCustomExamInput] = useState(() => {
    const d = getInitialExamTarget();
    return d.toISOString().slice(0, 16);
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const examRemaining = useMemo(() => computeRemaining(examTarget, now), [examTarget, now]);
  const oneAmRemaining = useMemo(() => computeRemaining(oneAmTarget, now), [oneAmTarget, now]);

  const handleSaveExamDate = () => {
    const parsed = new Date(customExamInput);
    if (!Number.isNaN(parsed.getTime())) {
      setExamTarget(parsed);
      try {
        window.localStorage.setItem(STORAGE_EXAM_DATE_KEY, parsed.toISOString());
      } catch {
        // ignore
      }
    }
    setIsEditingExam(false);
  };

  const handleResetOneAmToTonight = () => {
    const fresh = new Date();
    fresh.setDate(fresh.getDate() + (fresh.getHours() >= 1 ? 1 : 0));
    fresh.setHours(1, 0, 0, 0);
    setOneAmTarget(fresh);
    try {
      window.localStorage.setItem(STORAGE_ONE_AM_TARGET_KEY, fresh.toISOString());
    } catch {
      // ignore
    }
  };

  // Required pace in marks / hour to finish 50 marks by 1:00 AM
  const hoursLeftToOneAm = oneAmRemaining.totalMs / (1000 * 60 * 60);
  const marksPerHourPace =
    hoursLeftToOneAm > 0 ? (50 / hoursLeftToOneAm).toFixed(1) : '50.0';

  return (
    <div
      className={`memphis-card exam-counter-card ${compact ? 'exam-counter-card--compact' : ''} ${className}`.trim()}
      data-testid="exam-countdown-bar"
    >
      <div className="exam-counter-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <span className="memphis-pill memphis-pill--solid-pink">
            <Flame size={13} aria-hidden="true" style={{ marginRight: '0.2rem' }} />
            1:00 AM SYLLABUS CRASH DEADLINE
          </span>
          <span className="memphis-pill memphis-pill--yellow">
            <Clock size={13} aria-hidden="true" style={{ marginRight: '0.2rem' }} />
            {oneAmRemaining.isPast ? (
              <strong style={{ color: 'var(--ink)' }}>Target 1:00 AM Reached!</strong>
            ) : (
              <span>
                <strong>
                  {oneAmRemaining.hours}h {oneAmRemaining.minutes}m {oneAmRemaining.seconds}s
                </strong>{' '}
                to 1 AM
              </span>
            )}
          </span>
        </div>

        <div className="exam-counter-actions">
          {onOpenSprint && (
            <button
              type="button"
              className="memphis-btn mindmap-btn memphis-btn--pink"
              onClick={onOpenSprint}
              data-testid="open-sprint-btn"
            >
              <Compass size={14} aria-hidden="true" />
              <span>1 AM Strategy Plan</span>
            </button>
          )}

          {onOpenChecklist && (
            <button
              type="button"
              className="memphis-btn mindmap-btn memphis-btn--teal"
              onClick={onOpenChecklist}
              data-testid="open-checklist-btn"
            >
              <CheckSquare size={14} aria-hidden="true" />
              <span>Syllabus Checklist</span>
            </button>
          )}
        </div>
      </div>

      <div className="exam-counter-grid">
        {/* Left Card: 1:00 AM Crash Clock */}
        <div className="counter-box counter-box--sprint" data-testid="counter-box-one-am">
          <div className="counter-box__top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Zap size={17} aria-hidden="true" style={{ color: 'var(--pink)' }} />
              <h3 className="counter-box__title">Target: Complete Syllabus by 1:00 AM</h3>
            </div>
            {oneAmRemaining.isPast && (
              <button
                type="button"
                className="memphis-btn mindmap-btn"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                onClick={handleResetOneAmToTonight}
              >
                Reset to Next 1 AM
              </button>
            )}
          </div>

          <div className="digit-blocks-wrap">
            <div className="digit-block">
              <span className="digit-block__num">{padZero(oneAmRemaining.hours)}</span>
              <span className="digit-block__label">HOURS</span>
            </div>
            <span className="digit-separator">:</span>
            <div className="digit-block">
              <span className="digit-block__num">{padZero(oneAmRemaining.minutes)}</span>
              <span className="digit-block__label">MINS</span>
            </div>
            <span className="digit-separator">:</span>
            <div className="digit-block digit-block--accent">
              <span className="digit-block__num">{padZero(oneAmRemaining.seconds)}</span>
              <span className="digit-block__label">SECS</span>
            </div>
          </div>

          <div className="counter-box__meta">
            <span>
              {oneAmRemaining.isPast
                ? 'Time up! Review formulas and rest.'
                : `Pacing Required: ${marksPerHourPace} marks / hr to clear 50 marks`}
            </span>
            <span className="memphis-pill memphis-pill--solid-teal">
              6-Slot Pareto Roadmap
            </span>
          </div>
        </div>

        {/* Right Card: Official Endsem Exam Countdown */}
        <div className="counter-box counter-box--exam" data-testid="counter-box-exam">
          <div className="counter-box__top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Calendar size={17} aria-hidden="true" />
              <h3 className="counter-box__title">Official Endsem Exam Countdown</h3>
            </div>
            <button
              type="button"
              className="memphis-btn mindmap-btn"
              style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
              onClick={() => setIsEditingExam((prev) => !prev)}
              data-testid="edit-exam-date-btn"
              aria-label="Edit exam date and time"
            >
              <Edit2 size={12} aria-hidden="true" />
              <span>{isEditingExam ? 'Cancel' : 'Set Date'}</span>
            </button>
          </div>

          {isEditingExam ? (
            <div className="exam-date-editor">
              <label style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                Set Exam Date &amp; Time:
                <input
                  type="datetime-local"
                  value={customExamInput}
                  onChange={(e) => setCustomExamInput(e.target.value)}
                  className="exam-datetime-input"
                  data-testid="exam-datetime-input"
                />
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="memphis-btn memphis-btn--yellow"
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                  onClick={handleSaveExamDate}
                  data-testid="save-exam-date-btn"
                >
                  Save Date
                </button>
                <button
                  type="button"
                  className="memphis-btn"
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                  onClick={() => {
                    const def = getDefaultExamTarget();
                    setCustomExamInput(def.toISOString().slice(0, 16));
                    setExamTarget(def);
                    try {
                      window.localStorage.removeItem(STORAGE_EXAM_DATE_KEY);
                    } catch {
                      // ignore
                    }
                    setIsEditingExam(false);
                  }}
                >
                  Reset Default
                </button>
              </div>
            </div>
          ) : (
            <div className="digit-blocks-wrap">
              <div className="digit-block">
                <span className="digit-block__num">{padZero(examRemaining.days)}</span>
                <span className="digit-block__label">DAYS</span>
              </div>
              <span className="digit-separator">:</span>
              <div className="digit-block">
                <span className="digit-block__num">{padZero(examRemaining.hours)}</span>
                <span className="digit-block__label">HOURS</span>
              </div>
              <span className="digit-separator">:</span>
              <div className="digit-block">
                <span className="digit-block__num">{padZero(examRemaining.minutes)}</span>
                <span className="digit-block__label">MINS</span>
              </div>
              <span className="digit-separator">:</span>
              <div className="digit-block">
                <span className="digit-block__num">{padZero(examRemaining.seconds)}</span>
                <span className="digit-block__label">SECS</span>
              </div>
            </div>
          )}

          <div className="counter-box__meta">
            <span>
              Target: {examTarget.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at{' '}
              {examTarget.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {examRemaining.days === 0 && !examRemaining.isPast && (
              <span className="memphis-pill memphis-pill--solid-pink">EXAM TODAY</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
