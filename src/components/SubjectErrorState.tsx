import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { SubjectRecord } from '../types/study';

interface SubjectErrorStateProps {
  subject?: SubjectRecord;
  requestedId?: string;
  readySubject?: SubjectRecord;
  onBackHome: () => void;
  onOpenReadySubject?: (subjectId: string) => void;
}

export function SubjectErrorState({
  subject,
  requestedId,
  readySubject,
  onBackHome,
  onOpenReadySubject,
}: SubjectErrorStateProps) {
  const isNotFound = !subject;

  return (
    <section className="memphis-card error-card" role="alert" data-testid="subject-error-state">
      <span className="memphis-pill memphis-pill--solid-yellow">
        <AlertCircle size={13} aria-hidden="true" />
        <span>{isNotFound ? 'NOT FOUND' : 'MISSING MATERIAL'}</span>
      </span>

      <h1 style={{ fontSize: 'clamp(1.45rem, 3vw, 2rem)', marginTop: '0.8rem' }}>
        {isNotFound
          ? `Subject "${requestedId ?? 'unknown'}" was not found`
          : `${subject.shortName} has no study material yet`}
      </h1>

      <p style={{ marginTop: '0.5rem', color: 'var(--ink-muted)' }}>
        {isNotFound
          ? 'Select an available subject from Home.'
          : `Add PDFs to ${subject.folderName}/ and run npm run parse.`}
      </p>

      {!isNotFound && subject.parseWarnings.length > 0 && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>{subject.parseWarnings[0]}</p>
      )}

      <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button type="button" className="memphis-btn memphis-btn--yellow" onClick={onBackHome}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Home</span>
        </button>

        {readySubject && onOpenReadySubject && (
          <button
            type="button"
            className={`memphis-btn memphis-btn--${readySubject.accentColor}`}
            onClick={() => onOpenReadySubject(readySubject.id)}
          >
            <span>Open {readySubject.shortName}</span>
          </button>
        )}
      </div>
    </section>
  );
}
