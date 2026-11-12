import type { MemphisAccent } from '../types/study';

export function getAccentHex(accent: MemphisAccent | 'black'): string {
  switch (accent) {
    case 'pink':
      return '#FF4D8D';
    case 'teal':
      return '#00C2B8';
    case 'yellow':
      return '#FFD600';
    default:
      return '#111111';
  }
}

export function getAccentSoftHex(accent: MemphisAccent): string {
  switch (accent) {
    case 'pink':
      return '#FFE4EE';
    case 'teal':
      return '#DCFAF7';
    case 'yellow':
      return '#FFF6C2';
  }
}

export function MemphisLogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <rect x="3" y="3" width="30" height="30" rx="7" fill="#FFD600" stroke="#111111" strokeWidth="2.8" />
      <circle cx="13" cy="14" r="5" fill="#FF4D8D" stroke="#111111" strokeWidth="2.2" />
      <polygon points="18,28 29,28 23.5,17" fill="#00C2B8" stroke="#111111" strokeWidth="2.2" />
    </svg>
  );
}

export function MemphisSquiggle({ className = '' }: { className?: string }) {
  return (
    <svg
      width="84"
      height="16"
      viewBox="0 0 84 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 11L11 4L19 11L27 4L35 11L43 4L51 11L59 4L67 11L75 4L81 10"
        stroke="#111111"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MemphisGeoBadge({ accent }: { accent: MemphisAccent }) {
  if (accent === 'pink') {
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="22" cy="22" r="14" fill="#FF4D8D" stroke="#111111" strokeWidth="2.8" />
        <rect x="5" y="5" width="14" height="14" rx="3" fill="#FFD600" stroke="#111111" strokeWidth="2.5" />
      </svg>
    );
  }
  if (accent === 'teal') {
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
        <polygon points="21,4 38,36 4,36" fill="#00C2B8" stroke="#111111" strokeWidth="2.8" />
        <circle cx="31" cy="12" r="6" fill="#FF4D8D" stroke="#111111" strokeWidth="2.2" />
      </svg>
    );
  }
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
      <rect x="6" y="10" width="24" height="24" rx="5" fill="#FFD600" stroke="#111111" strokeWidth="2.8" />
      <circle cx="30" cy="13" r="7" fill="#00C2B8" stroke="#111111" strokeWidth="2.5" />
    </svg>
  );
}

