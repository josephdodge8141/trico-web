import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const editorEmail = process.env.PREVIEW_EDITOR_EMAIL ?? 'editor@tricoinc.com';
const editorPassword = process.env.PREVIEW_EDITOR_PASSWORD ?? 'local-preview-password';
const replacementPassword = 'replacement password 123';
const applicationOrigin = new URL(process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088')
  .origin;
const mailpitAuthorization = `Basic ${Buffer.from(
  `${process.env.MAILPIT_USERNAME ?? 'local-editor'}:${process.env.MAILPIT_PASSWORD ?? 'local-mailpit-password'}`,
).toString('base64')}`;

test('the seeded reviewer can authenticate, edit in-page, and end the opaque session', async ({
  page,
}) => {
  await login(page, editorEmail, editorPassword);
  expect(await (await page.request.get('/api/v1/auth/me')).json()).toEqual({
    authenticated: true,
    principal: expect.objectContaining({ email: editorEmail, emailVerified: true }),
  });
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
  await expect(page.getByText('Edit mode is active')).toBeVisible();
  const csrf = (await (await page.request.get('/api/v1/auth/csrf')).json()) as { token: string };
  expect(
    (
      await page.request.post('/api/v1/auth/logout', {
        headers: { Origin: applicationOrigin, 'X-CSRF-Token': csrf.token },
      })
    ).status(),
  ).toBe(204);
  expect(await (await page.request.get('/api/v1/auth/me')).json()).toEqual({
    authenticated: false,
    principal: null,
  });
});

test('registration verification and single-use reset complete through Mailpit', async ({
  page,
  request,
}) => {
  const email = `playwright-${Date.now()}@tricoinc.com`;
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('status')).toContainText('verify your email');
  const verifyUrl = await waitForMessage(request, email, 'Verify your TriCo website account');
  await page.goto(new URL(verifyUrl).pathname + new URL(verifyUrl).search);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('status')).toContainText('Email verified');
  await login(page, email, editorPassword);
  await page.goto('/request-reset');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('status')).toContainText('reset email');
  const resetUrl = await waitForMessage(request, email, 'Reset your TriCo website password');
  await page.goto(new URL(resetUrl).pathname + new URL(resetUrl).search);
  await page.getByLabel('Password').fill(replacementPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('status')).toContainText('Password reset complete');
  await login(page, email, replacementPassword);
  expect((await page.request.get('/api/v1/auth/me')).status()).toBe(200);
});

test('invalid credentials use the same nondisclosing error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`unknown-${Date.now()}@tricoinc.com`);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('status')).toHaveText('Email or password is incorrect');
  expect(await (await page.request.get('/api/v1/auth/me')).json()).toEqual({
    authenticated: false,
    principal: null,
  });
});

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function waitForMessage(
  request: APIRequestContext,
  email: string,
  subject: string,
): Promise<string> {
  let matching: string | undefined;
  await expect
    .poll(async () => {
      const response = await request.get('/__mailpit/api/v1/messages', {
        headers: { Authorization: mailpitAuthorization },
      });
      const body = (await response.json()) as {
        messages: readonly {
          To: readonly { Address: string }[];
          Subject: string;
          Snippet: string;
        }[];
      };
      matching = body.messages.find(
        (message) =>
          message.Subject === subject &&
          message.To.some((recipient) => recipient.Address === email),
      )?.Snippet;
      return matching;
    })
    .toMatch(/^https?:\/\/[^/]+\//);
  if (matching === undefined) throw new Error('Mailpit message was not found');
  return matching;
}
