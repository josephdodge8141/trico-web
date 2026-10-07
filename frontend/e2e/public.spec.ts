import { expect, test, type Page } from '@playwright/test';

import { homeV2SeedData } from '@app/schemas';

const publicPages = [
  { route: '/', heading: "Building Utah's Future" },
  { route: '/property-management', heading: 'What to Expect with TriCo' },
  { route: '/real-estate', heading: 'Commercial Real Estate & Land Experts' },
  { route: '/construction', heading: 'Building The Future' },
  { route: '/storage', heading: 'Maximize Your Storage Facility Profitability' },
  { route: '/development', heading: 'Transforming Vision Into Reality' },
] as const;

async function mockEditorSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/csrf', (route) =>
    route.fulfill({
      json: { token: 'local-browser-csrf-token-is-at-least-thirty-two-characters' },
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        principal: {
          subject: 'local-browser-editor',
          email: 'editor@tricoinc.com',
          emailVerified: true,
        },
      },
    }),
  );
  await page.route('**/api/v1/changes?pageId=home', (route) =>
    route.fulfill({ json: { changes: [] } }),
  );
  await page.route('**/api/v1/preview/preferences', (route) =>
    route.fulfill({ json: { disabledEntityIds: [] } }),
  );
  await page.route('**/api/v1/pages/home/preview', (route) =>
    route.fulfill({ json: homeV2SeedData }),
  );
  await page.route('**/api/v1/publish-operations/state', (route) =>
    route.fulfill({ json: { blocked: false, failedOperation: null } }),
  );
}

test('keeps the active desktop editor toolbar compact', async ({ page }) => {
  await page.setViewportSize({ width: 1425, height: 1100 });
  await mockEditorSession(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  const toolbar = page.getByRole('complementary', { name: 'Content editor' });
  await expect(toolbar).toBeVisible();
  const box = await toolbar.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeLessThanOrEqual(80);
  await expect(toolbar.getByText('0 unpublished changes')).toBeVisible();
  for (const actionName of ['View public', 'Review and publish', 'History', 'Exit edit mode']) {
    await expect(toolbar.getByRole('button', { name: actionName })).toBeVisible();
  }
});

for (const publicPage of publicPages) {
  test(`renders ${publicPage.route} with checked-in content when object storage is unavailable`, async ({
    page,
  }) => {
    await page.goto(publicPage.route);
    await expect(page.getByRole('heading', { name: publicPage.heading })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /checked-in/i })).toBeVisible();
    expect(await page.locator('[data-entity-boundary="true"]').count()).toBeGreaterThanOrEqual(5);
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  });
}

test('uses corrected real-estate and storage anchors', async ({ page }) => {
  await page.goto('/real-estate');
  await expect(page.getByRole('link', { name: 'Services' }).first()).toHaveAttribute(
    'href',
    '#services',
  );
  await page.goto('/storage');
  await expect(page.getByRole('link', { name: 'Services' }).first()).toHaveAttribute(
    'href',
    '#services',
  );
  await expect(page.locator('#services')).toBeVisible();
});

test('validates the Storage consultation form and keeps mobile navigation usable', async ({
  page,
}) => {
  let cmsMutations = 0;
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/'))
      cmsMutations += 1;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/storage');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.locator('input[name="firstName"]')).toBeFocused();
  expect(cmsMutations).toBe(0);
});

test('keeps the Home resume form client-only and exposes friendly validation', async ({ page }) => {
  let cmsMutations = 0;
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/'))
      cmsMutations += 1;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Submit Resume' }).click();
  await expect(page.getByText('Please enter your name.')).toBeVisible();
  await expect(page.getByText('Please enter your email.')).toBeVisible();
  await expect(page.getByText('Please select a division.')).toBeVisible();
  await expect(page.getByText('Please attach your resume.')).toBeVisible();
  expect(cmsMutations).toBe(0);
});

test('keeps the Property Management analysis form validated without CMS mutation', async ({
  page,
}) => {
  let cmsMutations = 0;
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/'))
      cmsMutations += 1;
  });
  await page.goto('/property-management');
  await page.setViewportSize({ width: 1425, height: 1100 });
  const contact = page.locator('#contact');
  await expect
    .poll(async () => {
      const detailsBox = await contact.locator(':scope > div > div').first().boundingBox();
      const analysisBox = await contact.locator('[data-slot="card"]').boundingBox();
      expect(detailsBox).not.toBeNull();
      expect(analysisBox).not.toBeNull();
      if (!detailsBox || !analysisBox) return Number.POSITIVE_INFINITY;
      return Math.abs(
        detailsBox.y + detailsBox.height / 2 - (analysisBox.y + analysisBox.height / 2),
      );
    })
    .toBeLessThanOrEqual(4);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileDetailsBox = await contact.locator(':scope > div > div').first().boundingBox();
  const mobileAnalysisBox = await contact.locator('[data-slot="card"]').boundingBox();
  expect(mobileDetailsBox).not.toBeNull();
  expect(mobileAnalysisBox).not.toBeNull();
  if (mobileDetailsBox && mobileAnalysisBox) {
    expect(mobileAnalysisBox.y).toBeGreaterThanOrEqual(
      mobileDetailsBox.y + mobileDetailsBox.height,
    );
  }
  await expect(page.locator('#new-client form')).toHaveCount(0);
  await page.getByRole('button', { name: 'Get Free Analysis', exact: true }).last().click();
  await expect(page.getByText('Enter first name.')).toBeVisible();
  await expect(page.getByText('Enter last name.')).toBeVisible();
  await expect(page.getByText('Enter phone.')).toBeVisible();
  await expect(page.getByText('Enter area of interest.')).toBeVisible();
  expect(cmsMutations).toBe(0);
});

test('shows an honest empty construction category instead of fabricated project cards', async ({
  page,
}) => {
  await page.goto('/construction/current/multi-family');
  await expect(
    page.getByRole('heading', { name: 'No projects are published in this category.' }),
  ).toBeVisible();
  await expect(page.getByText('Address coming soon')).toHaveCount(0);
});
