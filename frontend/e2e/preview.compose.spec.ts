import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  homeCoreValuesItemsSchema,
  homeJourneyTimelineSchema,
  homeNewsItemsSchema,
  homeV2SeedData,
  pendingChangesResponseSchema,
  type EditableValue,
  type PendingChange,
} from '@app/schemas';

const editorEmail = process.env.PREVIEW_EDITOR_EMAIL ?? 'editor@tricoinc.com';
const editorPassword = process.env.PREVIEW_EDITOR_PASSWORD ?? 'local-preview-password';
const applicationOrigin = new URL(process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088')
  .origin;
const mailpitAuthorization = `Basic ${Buffer.from(
  `${process.env.MAILPIT_USERNAME ?? 'local-editor'}:${process.env.MAILPIT_PASSWORD ?? 'local-mailpit-password'}`,
).toString('base64')}`;

test('friendly component form saves, previews, updates, and discards without exposing JSON', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Enter edit mode' }).click();

  const heading = page.getByRole('heading', { level: 1 });
  const publishedHeading = await heading.innerText();
  await heading.hover();
  await page.getByRole('button', { name: 'Edit Opening message' }).click();
  const editor = page.getByRole('dialog', { name: 'Opening message' });
  await expect(editor.getByLabel('Main heading')).toBeVisible();
  await expect(editor.getByLabel('Introduction')).toBeVisible();
  await expect(page.getByText('Complete entity JSON')).toHaveCount(0);

  const firstHeading = `Friendly preview ${String(Date.now())}`;
  await editor.getByLabel('Main heading').fill('');
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expect(editor.getByText('Enter main heading.')).toBeVisible();
  await editor.getByLabel('Main heading').fill(firstHeading);
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expect(heading).toHaveText(firstHeading);

  await page.getByRole('button', { name: 'View public' }).click();
  await expect(heading).toHaveText(publishedHeading);
  await page.getByRole('button', { name: 'View my changes' }).click();
  await expect(heading).toHaveText(firstHeading);

  await heading.hover();
  await page.getByRole('button', { name: 'Edit Opening message' }).click();
  const secondHeading = `${firstHeading} updated`;
  await page.getByLabel('Main heading').fill(secondHeading);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(heading).toHaveText(secondHeading);

  await page.getByRole('button', { name: 'Review and publish' }).click();
  const review = page.getByText('Review unpublished changes').locator('..').locator('..');
  await expect(review.getByText('Hero', { exact: true })).toBeVisible();
  await review.getByRole('button', { name: 'Discard' }).click();
  await expect(heading).toHaveText(publishedHeading);
});

test.describe('touch editor', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('keeps component controls visible and opens a full-screen editor with dirty-close protection', async ({
    page,
  }) => {
    await login(page);
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    const edit = page.getByRole('button', { name: 'Edit Opening message' });
    await expect(edit).toBeVisible();
    await edit.click();

    const dialog = page.getByRole('dialog', { name: 'Opening message' });
    const box = await dialog.boundingBox();
    expect(box?.x).toBe(0);
    expect(box?.width).toBe(390);
    const originalHeading = await page.getByRole('heading', { level: 1 }).innerText();
    await dialog.getByLabel('Main heading').fill('Unsaved mobile draft');
    page.once('dialog', (confirmation) => void confirmation.accept());
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(originalHeading);
  });
});

test('Home collection controls preserve hidden identity through add, edit, reorder, delete, and Undo', async ({
  page,
}) => {
  const entityId = 'home.core-values.items';
  await login(page);
  await discardOwned(page, entityId);
  try {
    await enterHomeEditMode(page);
    const starting = homeCoreValuesItemsSchema.parse(
      (
        (await (await page.request.get('/api/v1/pages/home/preview')).json()) as Record<
          string,
          unknown
        >
      )[entityId] ?? homeV2SeedData[entityId],
    );
    await page.getByRole('button', { name: '+ Add core value' }).click();
    const addSheet = page.getByRole('dialog', { name: 'Add core value' });
    await addSheet.getByLabel('Value name').fill('Playwright value');
    await addSheet.getByLabel('Description').fill('Added with friendly fields.');
    await addSheet.getByRole('button', { name: 'Save changes' }).click();
    const added = page.getByRole('heading', { name: 'Playwright value' });
    await expect(added).toBeVisible();
    const item = added.locator('xpath=ancestor::div[contains(@class,"editable-item")]');
    await item.hover();
    await item.getByRole('button', { name: 'Edit Playwright value' }).click();
    await page.getByLabel('Value name').fill('Playwright value edited');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const editedItem = page
      .getByRole('heading', { name: 'Playwright value edited' })
      .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
    await editedItem.hover();
    await editedItem.getByRole('button', { name: 'Move Playwright value edited up' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Order updated.' })).toBeVisible();
    await editedItem.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await editedItem.hover();
    page.once('dialog', async (dialog) => dialog.accept());
    await editedItem.getByRole('button', { name: 'Delete Playwright value edited' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Playwright value edited deleted.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Playwright value edited' })).toBeVisible();
    const pending = await pendingFor(page, entityId);
    expect(pending).toBeDefined();
    const final = homeCoreValuesItemsSchema.parse(pending?.replacementValue);
    const addedRecord = final.find(({ title }) => title === 'Playwright value edited');
    expect(addedRecord?.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(final.map(({ id }) => id)).toEqual(expect.arrayContaining(starting.map(({ id }) => id)));
    await expect(page.getByText(addedRecord?.id ?? '', { exact: true })).toHaveCount(0);
  } finally {
    await discardOwned(page, entityId);
  }
});

test('an empty Home collection exposes Add and hydrates its first saved item', async ({ page }) => {
  const entityId = 'home.careers.open-positions';
  await login(page);
  await discardOwned(page, entityId);
  try {
    await saveReplacement(page, entityId, []);
    await enterHomeEditMode(page);
    await expect(page.locator('.home-careers .editable-item')).toHaveCount(0);
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

test("another editor's Home collection is rendered read-only without exposing ownership IDs", async ({
  browser,
  page,
}) => {
  const entityId = 'home.news.items';
  const secondary = await createVerifiedEditor(browser);
  const ownerPage = await secondary.newPage();
  await login(ownerPage, secondary.editorEmail);
  try {
    await discardOwned(ownerPage, entityId);
    const items = homeNewsItemsSchema.parse(homeV2SeedData[entityId]);
    const first = items[0];
    expect(first).toBeDefined();
    await saveReplacement(ownerPage, entityId, [
      { ...first, title: 'Owned in another Playwright session' },
      ...items.slice(1),
    ]);
    const session = (await (await ownerPage.request.get('/api/v1/auth/me')).json()) as {
      principal: { subject: string };
    };
    await login(page);
    await enterHomeEditMode(page);
    const collection = page.locator('.home-news .editable-collection');
    await expect(
      page.getByRole('heading', { name: 'Owned in another Playwright session' }),
    ).toBeVisible();
    await expect(collection.getByText('Another editor is updating this section.')).toBeVisible();
    await expect(collection.getByRole('button', { name: /Edit / }).first()).toBeDisabled();
    expect((await page.locator('body').innerText()).includes(session.principal.subject)).toBe(
      false,
    );
  } finally {
    await discardOwned(ownerPage, entityId);
    await secondary.close();
  }
});

test('stale Home item drafts survive conflict and can reload the latest revision', async ({
  page,
}) => {
  const entityId = 'home.journey.timeline';
  await login(page);
  await discardOwned(page, entityId);
  try {
    const timeline = homeJourneyTimelineSchema.parse(homeV2SeedData[entityId]);
    await saveReplacement(page, entityId, timeline);
    await enterHomeEditMode(page);
    const first = timeline[0];
    expect(first).toBeDefined();
    const item = page
      .getByText(first?.year ?? '', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
    await item.hover();
    await item.getByRole('button', { name: `Edit ${first?.year ?? ''}` }).click();
    await page.getByLabel('Milestone').fill('Playwright draft retained');
    const current = await pendingFor(page, entityId);
    expect(current).toBeDefined();
    const saved = homeJourneyTimelineSchema.parse(current?.replacementValue);
    const savedFirst = saved[0];
    expect(savedFirst).toBeDefined();
    await saveReplacement(
      page,
      entityId,
      [{ ...savedFirst, event: 'Latest Playwright value' }, ...saved.slice(1)],
      current?.revision,
    );
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByLabel('Milestone')).toHaveValue('Playwright draft retained');
    await expect(page.getByText('This section changed while you were editing.')).toBeVisible();
    await page.getByRole('button', { name: 'Reload latest' }).click();
    await expect(page.getByLabel('Milestone')).toHaveValue('Latest Playwright value');
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  } finally {
    await discardOwned(page, entityId);
  }
});

test('entering edit mode hydrates an earlier pending Home value and its marker', async ({
  page,
}) => {
  const entityId = 'home.divisions.header';
  await login(page);
  await discardOwned(page, entityId);
  try {
    await saveReplacement(page, entityId, {
      heading: 'Hydrated by Playwright',
      description: 'Saved before edit mode started.',
    });
    await page.goto('/');
    await enterHomeEditMode(page);
    const heading = page.getByRole('heading', { name: 'Hydrated by Playwright' });
    await expect(heading).toBeVisible();
    const boundary = heading.locator('xpath=ancestor::div[contains(@class,"editable-boundary")]');
    await expect(boundary.getByText('Unpublished change', { exact: true })).toBeVisible();
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

async function createVerifiedEditor(browser: Browser): Promise<ReturnTypeWithEmail> {
  const context = await browser.newContext({
    baseURL: process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088',
  });
  const email = `playwright-owner-${String(Date.now())}@tricoinc.com`;
  const page = await context.newPage();
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  let verifyUrl: string | undefined;
  await expect
    .poll(async () => {
      const response = await page.request.get('/__mailpit/api/v1/messages', {
        headers: { Authorization: mailpitAuthorization },
      });
      const body = (await response.json()) as {
        messages: readonly {
          To: readonly { Address: string }[];
          Subject: string;
          Snippet: string;
        }[];
      };
      verifyUrl = body.messages.find(
        (message) =>
          message.Subject === 'Verify your TriCo website account' &&
          message.To.some((recipient) => recipient.Address === email),
      )?.Snippet;
      return verifyUrl;
    })
    .toMatch(/^https?:\/\/[^/]+\//);
  if (verifyUrl === undefined) throw new Error('Verification email was not found.');
  const parsed = new URL(verifyUrl);
  await page.goto(`${parsed.pathname}${parsed.search}`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.close();
  return Object.assign(context, { editorEmail: email });
}

type ReturnTypeWithEmail = Awaited<ReturnType<Browser['newContext']>> & {
  readonly editorEmail: string;
};
