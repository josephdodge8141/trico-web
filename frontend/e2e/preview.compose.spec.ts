import { expect, test, type Page } from '@playwright/test';

const editorEmail = process.env.PREVIEW_EDITOR_EMAIL ?? 'editor@tricoinc.com';
const editorPassword = process.env.PREVIEW_EDITOR_PASSWORD ?? 'local-preview-password';

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

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(editorEmail);
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/$/);
}
