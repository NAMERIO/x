import type { AuthUser } from '@x/shared';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import {
  ApiError,
  getAuthProviders,
  getCurrentUser,
  getOAuthUrl,
  login,
  logout,
  register,
} from './lib/api';

type AuthMode = 'login' | 'register';

const oauthErrorMessages: Record<string, string> = {
  invalid_oauth_callback:
    'The OAuth response was incomplete. Please try again.',
  invalid_oauth_state: 'The OAuth request expired. Please try again.',
  oauth_login_failed: 'The provider could not sign you in. Please try again.',
  oauth_not_configured: 'That OAuth provider has not been configured yet.',
};

function Brand() {
  return (
    <img
      className="brand-logo"
      src="/god-thirsty-generation-logo.png"
      alt="God Thirsty Generation"
    />
  );
}

function Showcase() {
  return (
    <aside className="showcase-panel">
      <Brand />
      <div className="showcase-copy">
        <p className="showcase-eyebrow">Welcome to</p>
        <h1>
          God Thirsty
          <span>Generation</span>
        </h1>
      </div>
      <footer className="showcase-footer">
        <p>© 2026 God Thirsty Generation</p>
        <div>
          <span>Terms of Service</span>
          <i>•</i>
          <span>Privacy Policy</span>
          <i>•</i>
          <span>Help</span>
        </div>
      </footer>
    </aside>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.7" />
      {hidden && <path d="M4 4l16 16" />}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="provider-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#ffc107"
        d="M43.61 20H42V20H24v8h11.3C33.66 32.66 29.22 36 24 36c-6.63 0-12-5.37-12-12 0-2.05.52-3.98 1.43-5.67l-6.55-5.08A19.9 19.9 0 0 0 4 24c0 11.05 8.95 20 20 20s20-8.95 20-20c0-1.34-.14-2.65-.39-4Z"
      />
      <path
        fill="#ff3d00"
        d="m6.31 14.69 6.57 4.82C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4c-7.68 0-14.34 4.34-17.69 10.69Z"
      />
      <path
        fill="#4caf50"
        d="M24 44c5.17 0 9.86-1.98 13.41-5.19l-6.19-5.24A11.9 11.9 0 0 1 24 36c-5.2 0-9.62-3.32-11.28-7.95L6.2 33.08C9.51 39.56 16.23 44 24 44Z"
      />
      <path
        fill="#1976d2"
        d="M43.61 20H42V20H24v8h11.3a12.03 12.03 0 0 1-4.08 5.57l6.19 5.24C36.97 39.2 44 34 44 24c0-1.34-.14-2.65-.39-4Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="provider-icon" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#fff" />
      <path
        fill="#1877f2"
        d="M26.8 39V25.3h4.6l.7-5.35h-5.3v-3.42c0-1.55.43-2.6 2.65-2.6h2.83V9.15a38 38 0 0 0-4.13-.2c-4.08 0-6.88 2.5-6.88 7.08v3.92h-4.62v5.35h4.62V39h5.53Z"
      />
    </svg>
  );
}

function PageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <Showcase />
      <section className="form-panel">
        <img
          className="mobile-brand-logo"
          src="/god-thirsty-generation-logo.png"
          alt="God Thirsty Generation"
        />
        {children}
      </section>
    </main>
  );
}

export function App() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [providers, setProviders] = useState({
    google: false,
    facebook: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const code = new URLSearchParams(window.location.search).get('auth_error');
    return code ? (oauthErrorMessages[code] ?? 'OAuth login failed.') : null;
  });

  useEffect(() => {
    let active = true;

    void Promise.all([getCurrentUser(), getAuthProviders()])
      .then(([currentUser, availability]) => {
        if (!active) return;
        setUser(currentUser);
        setProviders(availability.providers);
      })
      .catch(() => {
        if (active)
          setErrorMessage('The authentication server is unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const authenticatedUser =
        mode === 'register'
          ? await register({ displayName, email, password })
          : await login({ email, password });
      setUser(authenticatedUser);
      setPassword('');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await logout();
      setUser(null);
    } catch {
      setErrorMessage('Could not sign out. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage(null);
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="loading-state" role="status">
          <span className="loading-spinner" />
          Loading your community…
        </div>
      </PageLayout>
    );
  }

  if (user) {
    return (
      <PageLayout>
        <div className="auth-content signed-in-content">
          <span className="success-mark">✓</span>
          <p className="signed-in-label">Signed in</p>
          <h2>Welcome, {user.displayName}</h2>
          <p className="form-subtitle">
            Your account is ready. Communication features will be added later.
          </p>
          {user.isOwner && (
            <span className="owner-badge">Application owner</span>
          )}
          {errorMessage && <div className="error-message">{errorMessage}</div>}
          <button
            className="secondary-button"
            type="button"
            disabled={submitting}
            onClick={() => void handleLogout()}
          >
            {submitting ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </PageLayout>
    );
  }

  const isLogin = mode === 'login';

  return (
    <PageLayout>
      <div className="auth-content">
        <header className="form-header">
          <h2 id="auth-title">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="form-subtitle">
            {isLogin
              ? 'Sign in to continue to your community.'
              : 'Join your community and start connecting.'}
          </p>
        </header>

        <div
          className="mode-switch"
          role="tablist"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={isLogin ? 'active' : ''}
            onClick={() => changeMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={!isLogin ? 'active' : ''}
            onClick={() => changeMode('register')}
          >
            Register
          </button>
        </div>

        <form
          className="auth-form"
          aria-labelledby="auth-title"
          onSubmit={(event) => void handleSubmit(event)}
        >
          {mode === 'register' && (
            <label>
              <span>Display name</span>
              <div className="input-shell">
                <input
                  name="displayName"
                  autoComplete="name"
                  minLength={2}
                  maxLength={64}
                  required
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            </label>
          )}

          <label>
            <span>Email</span>
            <div className="input-shell">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="input-shell">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? 1 : 12}
                maxLength={128}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
            {!isLogin && (
              <small className="field-hint">Use at least 12 characters.</small>
            )}
          </label>

          {errorMessage && <div className="error-message">{errorMessage}</div>}

          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            <span>
              {submitting
                ? 'Please wait…'
                : isLogin
                  ? 'Log in'
                  : 'Create account'}
            </span>
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="oauth-actions">
          <button
            type="button"
            className="oauth-button google-button"
            disabled={!providers.google}
            title={
              !providers.google ? 'Google OAuth is not configured' : undefined
            }
            onClick={() => window.location.assign(getOAuthUrl('google'))}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            className="oauth-button facebook-button"
            disabled={!providers.facebook}
            title={
              !providers.facebook
                ? 'Facebook OAuth is not configured'
                : undefined
            }
            onClick={() => window.location.assign(getOAuthUrl('facebook'))}
          >
            <FacebookIcon />
            Continue with Facebook
          </button>
        </div>

        {(!providers.google || !providers.facebook) && (
          <p className="provider-note">
            OAuth becomes available when provider credentials are configured.
          </p>
        )}

        <p className="alternate-mode">
          {isLogin ? 'Don’t have an account?' : 'Already have an account?'}
          <button
            type="button"
            onClick={() => changeMode(isLogin ? 'register' : 'login')}
          >
            {isLogin ? 'Create account' : 'Log in'}
          </button>
        </p>
      </div>
    </PageLayout>
  );
}
