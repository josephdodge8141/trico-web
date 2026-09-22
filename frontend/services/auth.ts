import {
  authSessionSchema,
  csrfResponseSchema,
  messageResponseSchema,
  registerResponseSchema,
  type AuthSession,
  type RegisterResponse,
} from '@app/schemas';

const defaultSessionEndpoint = '/api/v1/auth/me';
const defaultLogoutEndpoint = '/api/v1/auth/logout';

export interface AuthRequestOptions {
  readonly endpoint?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

const jsonRequest = async (
  endpoint: string,
  body: unknown,
  options: AuthRequestOptions = {},
): Promise<unknown> => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (fetchImpl === undefined) throw new Error('Fetch is unavailable in this environment');
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal ?? null,
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as
      { readonly error?: { readonly message?: unknown } } | undefined;
    throw new Error(
      typeof problem?.error?.message === 'string'
        ? problem.error.message
        : `Authentication request failed (${response.status})`,
    );
  }
  return response.json();
};

export const register = async (
  email: string,
  password: string,
  options: AuthRequestOptions = {},
): Promise<RegisterResponse> =>
  registerResponseSchema.parse(
    await jsonRequest('/api/v1/auth/register', { email, password }, options),
  );

export const login = async (
  email: string,
  password: string,
  options: AuthRequestOptions = {},
): Promise<AuthSession> =>
  authSessionSchema.parse(await jsonRequest('/api/v1/auth/login', { email, password }, options));

export const verifyEmail = async (
  token: string,
  options: AuthRequestOptions = {},
): Promise<string> =>
  messageResponseSchema.parse(await jsonRequest('/api/v1/auth/verify-email', { token }, options))
    .message;

export const requestPasswordReset = async (
  email: string,
  options: AuthRequestOptions = {},
): Promise<string> =>
  messageResponseSchema.parse(await jsonRequest('/api/v1/auth/request-reset', { email }, options))
    .message;

export const confirmPasswordReset = async (
  token: string,
  password: string,
  options: AuthRequestOptions = {},
): Promise<string> =>
  messageResponseSchema.parse(
    await jsonRequest('/api/v1/auth/confirm-reset', { token, password }, options),
  ).message;

export async function fetchAuthSession(options: AuthRequestOptions = {}): Promise<AuthSession> {
  const response = await request(options, options.endpoint ?? defaultSessionEndpoint, 'GET');
  if (!response.ok) {
    throw new Error(`Session request failed (${response.status})`);
  }
  return authSessionSchema.parse(await response.json());
}

export async function logout(options: AuthRequestOptions = {}): Promise<void> {
  const csrf = csrfResponseSchema.parse(
    await (await request(options, '/api/v1/auth/csrf', 'GET')).json(),
  ).token;
  const response = await request(options, options.endpoint ?? defaultLogoutEndpoint, 'POST', csrf);
  if (response.status !== 204) {
    throw new Error(`Logout request failed (${response.status})`);
  }
}

async function request(
  options: AuthRequestOptions,
  endpoint: string,
  method: 'GET' | 'POST',
  csrfToken?: string,
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (fetchImpl === undefined) {
    throw new Error('Fetch is unavailable in this environment');
  }
  return fetchImpl(endpoint, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(csrfToken === undefined ? {} : { 'X-CSRF-Token': csrfToken }),
    },
    signal: options.signal ?? null,
  });
}
