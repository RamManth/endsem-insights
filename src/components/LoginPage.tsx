import { useState, useCallback, type FormEvent } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { validatePassword, setAuthenticated, CORRECT_PASSWORD } from '../lib/auth';
import { MemphisLogoMark, MemphisSquiggle, MemphisGeoBadge } from './MemphisDecor';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = password.trim();

      if (!trimmed) {
        setError('Please enter your portal password.');
        return;
      }

      if (!validatePassword(trimmed)) {
        setError('Incorrect password. Please verify and try again.');
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setAuthenticated(rememberMe);
      onLogin();
    },
    [password, rememberMe, onLogin]
  );

  const handleQuickFill = useCallback(() => {
    setPassword(CORRECT_PASSWORD);
    setError(null);
  }, []);

  return (
    <div className="login-page-container" data-testid="login-page">
      {/* Decorative Memphis floating icons in background */}
      <div className="login-floating-decor login-floating-decor--left" aria-hidden="true">
        <MemphisGeoBadge accent="pink" />
        <span className="memphis-pill memphis-pill--solid-yellow" style={{ fontSize: '0.72rem' }}>
          50M Blueprints
        </span>
      </div>
      <div className="login-floating-decor login-floating-decor--right" aria-hidden="true">
        <MemphisGeoBadge accent="teal" />
        <span className="memphis-pill memphis-pill--solid-pink" style={{ fontSize: '0.72rem' }}>
          1 AM Sprint
        </span>
      </div>

      <div className="login-card memphis-card">
        {/* Top Memphis stripe accent */}
        <div className="login-card__accent-bar" aria-hidden="true" />

        <div className="login-header">
          <div className="login-header__brand">
            <MemphisLogoMark />
            <div className="login-header__titles">
              <span className="login-portal-tag">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>RESTRICTED ACCESS</span>
              </span>
              <h1 className="login-title">Endsem Insights</h1>
            </div>
          </div>
          <p className="login-subtitle">
            Enter your access credentials to unlock syllabus blueprints, verified PYQ solutions, and sprint roadmaps.
          </p>
          <div className="login-squiggle-wrap" aria-hidden="true">
            <MemphisSquiggle />
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate aria-label="Portal Login Form">
          {error && (
            <div className="login-error-banner" role="alert" data-testid="login-error">
              <AlertCircle size={18} className="login-error-icon" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <label htmlFor="portal-password" className="login-label">
              <span>Portal Password</span>
              <span className="login-label-badge">Required</span>
            </label>

            <div className={`login-input-wrapper ${error ? 'login-input-wrapper--error' : ''}`}>
              <span className="login-input-icon" aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                id="portal-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password..."
                className="login-input"
                autoFocus
                autoComplete="current-password"
                data-testid="login-password-input"
                aria-required="true"
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="login-toggle-pw"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-options-row">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="login-checkbox"
                data-testid="login-remember-checkbox"
              />
              <span>Remember on this device</span>
            </label>
          </div>

          <button
            type="submit"
            className="memphis-btn memphis-btn--pink login-submit-btn"
            disabled={isSubmitting}
            data-testid="login-submit-btn"
          >
            <KeyRound size={18} aria-hidden="true" />
            <span>{isSubmitting ? 'Unlocking...' : 'Unlock Study Dashboard'}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>

        <div className="login-helper-box">
          <div className="login-helper-box__content">
            <Sparkles size={15} className="login-helper-icon" aria-hidden="true" />
            <span className="login-helper-text">
              Exam Access Key: <code>{CORRECT_PASSWORD}</code>
            </span>
          </div>
          <button
            type="button"
            className="login-quick-fill-btn"
            onClick={handleQuickFill}
            data-testid="login-quick-fill-btn"
            title="Auto-fill default access key"
          >
            Auto-fill
          </button>
        </div>
      </div>
    </div>
  );
}
