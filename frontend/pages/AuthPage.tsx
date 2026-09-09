import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  confirmPasswordReset,
  login,
  register,
  requestPasswordReset,
  verifyEmail,
} from '../services/auth.js';

type AuthMode = 'login' | 'register' | 'request-reset' | 'confirm-reset' | 'verify';

export function AuthPage({ mode }: { readonly mode: AuthMode }): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(
    () => new URLSearchParams(location.search).get('token') ?? '',
    [location.search],
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const operation =
      mode === 'register'
        ? register(email, password).then(() => 'Check Mailpit or your inbox to verify your email.')
        : mode === 'login'
          ? login(email, password).then(() => {
              navigate('/');
              return 'Signed in.';
            })
          : mode === 'request-reset'
            ? requestPasswordReset(email)
            : mode === 'confirm-reset'
              ? confirmPasswordReset(token, password)
              : verifyEmail(token);
    void operation
      .then(setMessage)
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : 'Authentication failed.'),
      )
      .finally(() => setBusy(false));
  };

  const needsEmail = mode === 'login' || mode === 'register' || mode === 'request-reset';
  const needsPassword = mode === 'login' || mode === 'register' || mode === 'confirm-reset';
  const title = (
    {
      login: 'Editor sign in',
      register: 'Create editor account',
      'request-reset': 'Reset your password',
      'confirm-reset': 'Choose a new password',
      verify: 'Verify your email',
    } as const
  )[mode];
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link to="/">← Back to TriCo</Link>
        <h1>{title}</h1>
        {needsEmail ? (
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
        ) : null}
        {needsPassword ? (
          <label>
            Password
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={busy || ((mode === 'verify' || mode === 'confirm-reset') && token === '')}
        >
          {busy ? 'Working…' : 'Continue'}
        </button>
        {message === '' ? null : <p role="status">{message}</p>}
        <nav>
          <Link to="/login">Sign in</Link>
          <Link to="/register">Register</Link>
          <Link to="/request-reset">Forgot password?</Link>
        </nav>
      </form>
    </main>
  );
}
