import { expect, test, type Page } from '@playwright/test';

const editorEmail = process.env.PREVIEW_EDITOR_EMAIL ?? 'editor@tricoinc.com';
const editorPassword = process.env.PREVIEW_EDITOR_PASSWORD ?? 'local-preview-password';

test('saved and updated changes follow the editor preview preference', async ({ page }) => {
  await login(page);
  await page.goto('/property-management');
  await page.getByRole('button', { name: 'Enter edit mode' }).click();

  const hero = page.locator('[data-entity-id="property-management.hero"]');
  const publishedTitle = await hero.getByRole('heading', { level: 1 }).textContent();
  expect(publishedTitle).not.toBeNull();

  await hero.getByRole('button', { name: 'Edit' }).click();
  const editor = hero.getByLabel('Complete entity JSON');
  const firstValue = JSON.parse(await editor.inputValue()) as Record<string, unknown>;
  const firstTitle = `Preview regression ${Date.now()}`;
  await editor.fill(JSON.stringify({ ...firstValue, title: firstTitle }, null, 2));
  await hero.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(firstTitle);

  await hero.getByRole('button', { name: 'Hide from preview' }).click();
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(publishedTitle ?? '');
  await hero.getByRole('button', { name: 'Show in preview' }).click();
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(firstTitle);

  await hero.getByRole('button', { name: 'Update edit' }).click();
  const updatedValue = JSON.parse(await editor.inputValue()) as Record<string, unknown>;
  const secondTitle = `${firstTitle} updated`;
  await editor.fill(JSON.stringify({ ...updatedValue, title: secondTitle }, null, 2));
  await hero.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(secondTitle);

  await hero.getByRole('button', { name: 'Discard' }).click();
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(publishedTitle ?? '');
});

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(editorEmail);
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/$/);
}
