import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { smoothScrollToY } from '../lib/scrollMotion';
import { MemphisLogoMark } from './MemphisDecor';

interface TopNavProps {
  subjects: SubjectRecord[];
  activeSubjectId: string | null;
  onGoHome: () => void;
  onSelectSubject: (subjectId: string) => void;
}

export function TopNav({
  subjects,
  activeSubjectId,
  onGoHome,
  onSelectSubject,
}: TopNavProps) {
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let current = 0;
    let target = 0;
    let rafId: number | null = null;

    const computeTarget = () => {
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      target = doc.scrollHeight <= window.innerHeight + 8 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable));
    };

    const tick = () => {
      current += (target - current) * 0.22;
      if (Math.abs(target - current) < 0.002) {
        current = target;
      }
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${current})`;
      }
      if (Math.abs(target - current) > 0.002) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const schedule = () => {
      computeTarget();
      if (typeof window.requestAnimationFrame !== 'function') {
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${target})`;
        return;
      }
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    const resizeObs =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(schedule)
        : null;
    resizeObs?.observe(document.documentElement);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resizeObs?.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [activeSubjectId]);

  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <button
          type="button"
          className="brand-btn"
          onClick={() => {
            onGoHome();
            smoothScrollToY(0, 520);
          }}
          aria-label="Go to Endsem Insights home"
        >
          <MemphisLogoMark />
          <span className="brand-title">Endsem Insights</span>
        </button>

        <nav className="nav-pills" aria-label="Subject navigation">
          {activeSubjectId !== null && (
            <button
              type="button"
              className="memphis-btn memphis-btn--yellow"
              onClick={onGoHome}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Home</span>
            </button>
          )}
          {subjects.map((subj) => {
            const isActive = subj.id === activeSubjectId;
            const accentClass = isActive ? `memphis-btn--${subj.accentColor}` : '';
            return (
              <button
                key={subj.id}
                type="button"
                className={`memphis-btn ${accentClass}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectSubject(subj.id)}
              >
                <span>{subj.shortName}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="scroll-progress-track" aria-hidden="true">
        <div
          ref={progressRef}
          className="scroll-progress-fill"
          data-testid="scroll-progress-fill"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </header>
  );
}
