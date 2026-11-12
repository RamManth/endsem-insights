import { useCallback, useEffect, useMemo, useState } from 'react';
import rawStudyData from './data/study-data.generated.json';
import { parseAndValidateStudyDataset } from './lib/studyParser';
import { prefersReducedMotion, smoothScrollToY } from './lib/scrollMotion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopNav } from './components/TopNav';
import { HomeView } from './components/HomeView';
import { SubjectView } from './components/SubjectView';
import { SubjectErrorState } from './components/SubjectErrorState';

const STORAGE_KEY = 'endsem-insights-reviewed-v1';

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'subject'; subjectId: string }
  | { kind: 'not_found'; rawPath: string };

export function parseHashRoute(hash: string): AppRoute {
  const cleaned = hash.replace(/^#/, '').trim();
  if (!cleaned || cleaned === '/') {
    return { kind: 'home' };
  }
  const match = /^\/subject\/([^/?#]+)\/?$/i.exec(cleaned);
  if (match) {
    return { kind: 'subject', subjectId: decodeURIComponent(match[1]) };
  }
  return { kind: 'not_found', rawPath: cleaned };
}

function loadReviewedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((v): v is string => typeof v === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

function saveReviewedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

interface AppProps {
  rawData?: unknown;
  initialHash?: string;
}

export function App({ rawData = rawStudyData, initialHash }: AppProps) {
  const parsed = useMemo(() => parseAndValidateStudyDataset(rawData), [rawData]);
  const { dataset, issues, hasFatalError } = parsed;

  const [route, setRoute] = useState<AppRoute>(() =>
    parseHashRoute(initialHash ?? (typeof window !== 'undefined' ? window.location.hash : ''))
  );
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => loadReviewedIds());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (prefersReducedMotion()) return;

    let rafId: number | null = null;
    const syncParallax = () => {
      rafId = null;
      const offset = -(window.scrollY || 0) * 0.18;
      document.documentElement.style.setProperty('--bg-scroll-y', `${offset.toFixed(1)}px`);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId =
        typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame(syncParallax)
          : (syncParallax(), null);
    };

    syncParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const navigateHome = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
    setRoute({ kind: 'home' });
    smoothScrollToY(0, 520);
  }, []);

  const navigateToSubject = useCallback((subjectId: string) => {
    const encoded = encodeURIComponent(subjectId);
    if (typeof window !== 'undefined') {
      window.location.hash = `#/subject/${encoded}`;
    }
    setRoute({ kind: 'subject', subjectId });
    smoothScrollToY(0, 520);
  }, []);

  const toggleReviewed = useCallback((nodeId: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      saveReviewedIds(next);
      return next;
    });
  }, []);

  const activeSubjectId = route.kind === 'subject' ? route.subjectId : null;
  const activeSubject =
    route.kind === 'subject'
      ? dataset.subjects.find((s) => s.id === route.subjectId)
      : undefined;
  const firstReadySubject = dataset.subjects.find((s) => s.status === 'ready');

  return (
    <ErrorBoundary onReset={navigateHome}>
      <div className="app-shell">
        <TopNav
          subjects={dataset.subjects}
          activeSubjectId={activeSubjectId}
          onGoHome={navigateHome}
        />

        <main className="main-container">
          {hasFatalError ? (
            <section className="memphis-card error-card" role="alert" data-testid="fatal-data-error">
              <span className="memphis-pill memphis-pill--solid-pink">MALFORMED STUDY DATA</span>
              <h1 style={{ fontSize: '1.75rem', marginTop: '0.85rem' }}>
                Could not load study dataset
              </h1>
              <p style={{ marginTop: '0.55rem', color: 'var(--ink-muted)' }}>
                {issues.map((i) => i.message).join(' ')}
              </p>
              <p style={{ marginTop: '0.85rem', fontSize: '0.9rem' }}>
                Run <code>npm run parse</code> to rebuild{' '}
                <code>src/data/study-data.generated.json</code> from your study material folders.
              </p>
            </section>
          ) : route.kind === 'home' ? (
            <div key="view-home" className="page-enter">
              <HomeView
                subjects={dataset.subjects}
                issues={issues}
                reviewedIds={reviewedIds}
                onSelectSubject={navigateToSubject}
              />
            </div>
          ) : route.kind === 'not_found' ? (
            <div key="view-not-found" className="page-enter">
              <SubjectErrorState
                requestedId={route.rawPath}
                readySubject={firstReadySubject}
                onBackHome={navigateHome}
                onOpenReadySubject={navigateToSubject}
              />
            </div>
          ) : (
            <div key={`view-subject-${route.subjectId}`} className="page-enter">
              <SubjectView
                subject={activeSubject}
                requestedId={route.subjectId}
                readySubject={firstReadySubject}
                reviewedIds={reviewedIds}
                onToggleReviewed={toggleReviewed}
                onBackHome={navigateHome}
                onSelectSubject={navigateToSubject}
              />
            </div>
          )}
        </main>

        <footer className="app-footer">
          <div className="app-footer__inner">
            <span>Endsem Insights</span>
            <span>{dataset.studyRootName}/</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;

