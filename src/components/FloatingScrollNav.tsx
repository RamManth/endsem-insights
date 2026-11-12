import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { smoothScrollToElement, smoothScrollToY } from '../lib/scrollMotion';

export interface ScrollSectionTarget {
  id: string;
  label: string;
  getElement: () => HTMLElement | null;
}

interface FloatingScrollNavProps {
  sections?: ScrollSectionTarget[];
}

/**
 * Compact floating quick-jump & scroll-to-top bar with live scroll-spy highlighting.
 */
export function FloatingScrollNav({ sections = [] }: FloatingScrollNavProps) {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    const evaluate = () => {
      rafId = null;
      const scrollY = window.scrollY || 0;
      setVisible(scrollY > 220);

      if (sections.length > 0) {
        const thresholdY = 160;
        let current = sections[0].id;
        for (const sec of sections) {
          const el = sec.getElement();
          if (!el || typeof el.getBoundingClientRect !== 'function') continue;
          const top = el.getBoundingClientRect().top;
          if (top <= thresholdY) {
            current = sec.id;
          }
        }
        setActiveId(current);
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId =
        typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame(evaluate)
          : (evaluate(), null);
    };

    evaluate();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Quick section scroll navigation"
      className={`floating-scroll-dock ${visible ? 'floating-scroll-dock--visible' : ''}`}
      aria-hidden={!visible}
      data-testid="floating-scroll-nav"
    >
      {sections.map((sec) => (
        <button
          key={sec.id}
          type="button"
          tabIndex={visible ? 0 : -1}
          className={`floating-dock-btn ${activeId === sec.id ? 'floating-dock-btn--active' : ''}`}
          aria-label={`Jump to ${sec.label} section`}
          onClick={() => smoothScrollToElement(sec.getElement(), 88, 720)}
        >
          {sec.label}
        </button>
      ))}
      <button
        type="button"
        tabIndex={visible ? 0 : -1}
        className="floating-dock-btn floating-dock-btn--top"
        aria-label="Scroll smoothly back to top"
        onClick={() => smoothScrollToY(0, 620)}
      >
        <ArrowUp size={15} aria-hidden="true" />
      </button>
    </nav>
  );
}

