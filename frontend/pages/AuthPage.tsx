import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import tricoLogo from '../assets/images/trico-logo.png';
import { Alert, AlertDescription } from '../components/ui/alert.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field.js';
import { Input } from '../components/ui/input.js';
import { Separator } from '../components/ui/separator.js';
import { Container } from '../design-system/layout.js';
import {
  confirmPasswordReset,
  login,
  register,
  requestPasswordReset,
  verifyEmail,
} from '../services/auth.js';

type AuthMode = 'login' | 'register' | 'request-reset' | 'confirm-reset' | 'verify';

const modeCopy: Record<AuthMode, { readonly title: string; readonly description: string }> = {
  login: {
    title: 'Editor sign in',
    description: 'Use your TriCo account to manage published content.',
  },
  register: {
    title: 'Create editor account',
    description: 'Set up your account to contribute to the TriCo site.',
  },
  'request-reset': {
    title: 'Reset your password',
    description: 'We will send a reset link to your email address.',
  },
  'confirm-reset': {
    title: 'Choose a new password',
    description: 'Enter a new password for your TriCo account.',
  },
  verify: {
    title: 'Verify your email',
    description: 'Confirm your email address to activate your account.',
  },
};

export function AuthPage({ mode }: { readonly mode: AuthMode }): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(
    () => new URLSearchParams(location.search).get('token') ?? '',
    [location.search],
  );
  const returnTo = useMemo(() => {
    const state = location.state;
    if (typeof state !== 'object' || state === null || !('returnTo' in state)) return '/';
    const candidate = state.returnTo;
    return typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
      ? candidate
      : '/';
  }, [location.state]);
  const resumeEditMode = useMemo(() => {
    const state = location.state;
    return (
      typeof state === 'object' &&
      state !== null &&
      'resumeEditMode' in state &&
      state.resumeEditMode === true
    );
  }, [location.state]);
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
              navigate(returnTo, {
                replace: true,
                state: resumeEditMode ? { resumeEditMode: true } : null,
              });
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
  const copy = modeCopy[mode];

  return (
    <main className="flex min-h-svh items-center bg-muted/40 py-12 text-foreground">
      <Container width="narrow" className="max-w-lg">
        <div className="mb-8 flex justify-center">
          <Link
            to="/"
            aria-label="TriCo home"
            className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <img src={tricoLogo} alt="TriCo" className="h-16 w-auto object-contain" />
          </Link>
        </div>
        <Card className="border border-border/70 bg-card shadow-xl">
          <CardHeader className="space-y-3 px-6 pt-6">
            <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.description}</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form className="space-y-6" onSubmit={submit}>
              <FieldGroup>
                {needsEmail ? (
                  <Field>
                    <FieldLabel htmlFor="auth-email">Email</FieldLabel>
                    <Input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className="h-10"
                    />
                  </Field>
                ) : null}
                {needsPassword ? (
                  <Field>
                    <FieldLabel htmlFor="auth-password">Password</FieldLabel>
                    <Input
                      id="auth-password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="h-10"
                    />
                    {mode === 'register' ? (
                      <FieldDescription>Use at least eight characters.</FieldDescription>
                    ) : null}
                  </Field>
                ) : null}
              </FieldGroup>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={busy || ((mode === 'verify' || mode === 'confirm-reset') && token === '')}
              >
                {busy ? 'Working…' : 'Continue'}
              </Button>
              {message === '' ? null : (
                <Alert role="status">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </form>
            <Separator className="my-6" />
            <nav aria-label="Account" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link className="text-primary hover:underline" to="/login">
                Sign in
              </Link>
              <Link className="text-primary hover:underline" to="/register">
                Register
              </Link>
              <Link className="text-primary hover:underline" to="/request-reset">
                Forgot password?
              </Link>
            </nav>
          </CardContent>
        </Card>
        <Button render={<Link to="/" />} variant="ghost" className="mt-6 w-full">
          <ArrowLeft aria-hidden="true" /> Back to TriCo
        </Button>
      </Container>
    </main>
  );
}
