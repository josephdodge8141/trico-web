import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchAuthSession, logout } from './auth.js';

test('auth service validates session responses and sends same-origin credentials', async () => {
  let requestedUrl: string | undefined;
  let credentials: RequestCredentials | undefined;
  const session = await fetchAuthSession({
    fetchImpl: async (input, init) => {
      requestedUrl = String(input);
      credentials = init?.credentials;
      return new Response(
        JSON.stringify({
          authenticated: true,
          principal: {
            subject: 'preview-user',
            email: 'person@example.test',
            emailVerified: false,
          },
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(requestedUrl, '/api/v1/auth/me');
  assert.equal(credentials, 'same-origin');
  assert.equal(session.authenticated, true);

  await assert.rejects(
    fetchAuthSession({
      fetchImpl: async () => new Response(JSON.stringify({ authenticated: true }), { status: 200 }),
    }),
  );
});

test('logout accepts only the no-content response', async () => {
  const requests: { url: string; method: string | undefined; csrf: string | null }[] = [];
  await logout({
    fetchImpl: async (input, init) => {
      requests.push({
        url: String(input),
        method: init?.method,
        csrf: new Headers(init?.headers).get('X-CSRF-Token'),
      });
      return String(input).endsWith('/csrf')
        ? new Response(JSON.stringify({ token: 'c'.repeat(32) }), { status: 200 })
        : new Response(null, { status: 204 });
    },
  });
  assert.deepEqual(requests, [
    { url: '/api/v1/auth/csrf', method: 'GET', csrf: null },
    { url: '/api/v1/auth/logout', method: 'POST', csrf: 'c'.repeat(32) },
  ]);

  await assert.rejects(
    logout({
      fetchImpl: async (input) =>
        String(input).endsWith('/csrf')
          ? new Response(JSON.stringify({ token: 'c'.repeat(32) }), { status: 200 })
          : new Response(null, { status: 200 }),
    }),
    /Logout request failed \(200\)/,
  );
});
