import { expect, test, type Page } from '@playwright/test';
import {
  homeHeroSchema,
  pendingChangesResponseSchema,
  type EditableValue,
  type PendingChange,
  type Publication,
} from '@app/schemas';

const editorEmail = process.env.PREVIEW_EDITOR_EMAIL ?? 'editor@tricoinc.com';
const editorPassword = process.env.PREVIEW_EDITOR_PASSWORD ?? 'local-preview-password';
const applicationOrigin = new URL(process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088')
  .origin;

test('edit mode publishes a reviewed change and restores it from publication history', async ({
  page,
}) => {
  const entityId = 'home.hero';
  await login(page);
  await discardOwned(page, entityId);
  const initialHistory = (await (await page.request.get('/api/v1/publications/home')).json()) as {
    publications: readonly Publication[];
  };
  const baselinePublication = initialHistory.publications[0];
  expect(baselinePublication).toBeDefined();
  const baselineHero = homeHeroSchema.parse(
    baselinePublication?.snapshot.find(
      ({ entityId: snapshotEntityId }) => snapshotEntityId === entityId,
    )?.value,
  );
  let restored = false;

  try {
    await enterHomeEditMode(page);
    const heading = page.getByRole('heading', { level: 1 });
    const originalHeading = await heading.innerText();
    expect(originalHeading).toBe(baselineHero.heading);
    const publishedHeading = `Published through edit mode ${String(Date.now())}`;

    await heading.hover();
    await page.getByRole('button', { name: 'Edit Opening message' }).click();
    await page
      .getByRole('dialog', { name: 'Opening message' })
      .getByLabel('Main heading')
      .fill(publishedHeading);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(heading).toHaveText(publishedHeading);

    await page.getByRole('button', { name: 'View public' }).click();
    await expect(heading).toHaveText(originalHeading);
    await page.getByRole('button', { name: 'View my changes' }).click();
    await expect(heading).toHaveText(publishedHeading);

    await page.getByRole('button', { name: 'Review and publish' }).click();
    const review = page.getByRole('dialog', { name: 'Review unpublished changes' });
    await expect(review.getByText('Hero', { exact: true })).toBeVisible();
    const publishResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/v1/publish'),
    );
    await review.getByRole('button', { name: 'Publish change' }).click();
    expect((await publishResponse).status()).toBe(202);
    await expect(
      page
        .getByRole('complementary', { name: 'Content editor' })
        .getByText('0 unpublished changes'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Exit edit mode' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(publishedHeading);

    await enterHomeEditMode(page);
    await page.getByRole('button', { name: 'History' }).click();
    const historyPanel = page.getByText('Publication history').locator('..').locator('..');
    const updatedHistory = (await (await page.request.get('/api/v1/publications/home')).json()) as {
      publications: readonly Publication[];
    };
    const baselineIndex = updatedHistory.publications.findIndex(
      ({ id }) => id === baselinePublication?.id,
    );
    expect(baselineIndex).toBeGreaterThanOrEqual(1);
    await expect(historyPanel.getByRole('button', { name: 'Restore' })).toHaveCount(
      updatedHistory.publications.length,
    );
    page.once('dialog', (dialog) => void dialog.accept());
    const rollbackResponse = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes('/rollback'),
    );
    await historyPanel.getByRole('button', { name: 'Restore' }).nth(baselineIndex).click();
    expect((await rollbackResponse).status()).toBe(202);
    await historyPanel.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Exit edit mode' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(originalHeading);
    restored = true;
  } finally {
    await discardOwned(page, entityId).catch(() => undefined);
    if (!restored && baselinePublication !== undefined) {
      await page.request
        .post(`/api/v1/publications/${encodeURIComponent(baselinePublication.id)}/rollback`, {
          headers: await csrfHeaders(page),
          data: { publicationId: baselinePublication.id },
        })
        .catch(() => undefined);
    }
  }
});

test('an empty Home collection exposes Add and hydrates its first saved item', async ({ page }) => {
  const entityId = 'home.careers.open-positions';
  await login(page);
  await discardOwned(page, entityId);
  try {
    await saveReplacement(page, entityId, []);
    await enterHomeEditMode(page);
    await expect(page.locator('.ui-shared-careers .editable-item')).toHaveCount(0);
    await page.getByRole('button', { name: '+ Add position' }).click();
    const sheet = page.getByRole('dialog', { name: 'Add position' });
    await sheet.getByLabel('Position title').fill('First Playwright position');
    await sheet.getByLabel('Division').selectOption('Corporate');
    await sheet.getByLabel('Employment type').selectOption('Full-time');
    await sheet.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: 'First Playwright position' })).toBeVisible();
  } finally {
    await discardOwned(page, entityId);
  }
});

async function login(page: Page, email = editorEmail): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function enterHomeEditMode(page: Page): Promise<void> {
  const preview = page.waitForResponse((response) =>
    response.url().includes('/api/v1/pages/home/preview'),
  );
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  await preview;
}

async function pendingFor(page: Page, entityId: string): Promise<PendingChange | undefined> {
  const response = await page.request.get('/api/v1/changes?pageId=home');
  expect(response.status()).toBe(200);
  return pendingChangesResponseSchema
    .parse(await response.json())
    .changes.find((change) => change.entityId === entityId);
}

async function csrfHeaders(page: Page): Promise<Readonly<Record<string, string>>> {
  const response = await page.request.get('/api/v1/auth/csrf');
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { token: string };
  return { Origin: applicationOrigin, 'X-CSRF-Token': body.token };
}

async function saveReplacement(
  page: Page,
  entityId: string,
  replacementValue: EditableValue,
  expectedRevision?: number,
): Promise<PendingChange> {
  const url = `/api/v1/entities/${encodeURIComponent(entityId)}/changes`;
  const headers = await csrfHeaders(page);
  const response =
    expectedRevision === undefined
      ? await page.request.post(url, { headers, data: { replacementValue } })
      : await page.request.put(url, {
          headers,
          data: { replacementValue, expectedRevision },
        });
  expect([200, 201]).toContain(response.status());
  return (await response.json()) as PendingChange;
}

async function discardOwned(page: Page, entityId: string): Promise<void> {
  const session = (await (await page.request.get('/api/v1/auth/me')).json()) as {
    authenticated: boolean;
    principal: { subject: string } | null;
  };
  if (!session.authenticated || session.principal === null) return;
  const pending = await pendingFor(page, entityId);
  if (pending === undefined || pending.authorId !== session.principal.subject) return;
  const response = await page.request.delete(
    `/api/v1/entities/${encodeURIComponent(entityId)}/changes`,
    {
      headers: await csrfHeaders(page),
      data: { expectedRevision: pending.revision },
    },
  );
  expect(response.status()).toBe(204);
}
