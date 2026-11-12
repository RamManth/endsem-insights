import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { smoothScrollToY } from '../lib/scrollMotion';
import { MemphisLogoMark } from './MemphisDecor';

interface TopNavProps {
  subjects: SubjectRecord[];
  activeSubjectId: string | null;
  onGoHome: () => void;
}

export function TopNav({
  subjects,
  activeSubjectId,
  onGoHome,
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

        <nav className="nav-pills" aria-label="Workspace navigation">
          {activeSubjectId !== null && (
            <>
              <span
                className="memphis-pill"
                style={{ background: 'var(--bg-cream)' }}
                data-testid="topnav-active-subject"
              >
                {subjects.find((s) => s.id === activeSubjectId)?.shortName ?? activeSubjectId}
              </span>
              <button
                type="button"
                className="memphis-btn memphis-btn--yellow"
                onClick={onGoHome}
                data-testid="topnav-home-btn"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>All Subjects</span>
              </button>
            </>
          )}
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
