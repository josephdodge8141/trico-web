import { expect, test } from '@playwright/test';

const publicPages = [
  { route: '/', heading: "Building Utah's Future" },
  { route: '/property-management', heading: 'Property management that performs' },
  { route: '/real-estate', heading: 'Find the right place for what comes next' },
  { route: '/construction', heading: 'Construction with purpose' },
  { route: '/storage', heading: 'Storage made simple' },
  { route: '/development', heading: 'Development with a long view' },
] as const;

for (const publicPage of publicPages) {
  test(`renders ${publicPage.route} with checked-in content when object storage is unavailable`, async ({
    page,
  }) => {
    await page.goto(publicPage.route);
    await expect(page.getByRole('heading', { name: publicPage.heading })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('checked-in site content');
    expect(await page.locator('[data-entity-id]').count()).toBeGreaterThanOrEqual(5);
  });
}

test('uses corrected real-estate and storage anchors', async ({ page }) => {
  await page.goto('/real-estate');
  await expect(page.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '#services');
  await page.goto('/storage');
  await expect(page.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '#features');
  await expect(page.locator('#features')).toBeVisible();
});

test('shows an honest empty construction category instead of fabricated project cards', async ({
  page,
}) => {
  await page.goto('/construction/current/multi-family');
  await expect(
    page.getByRole('heading', { name: 'No projects are published in this category.' }),
  ).toBeVisible();
  await expect(page.getByText('Address coming soon')).toHaveCount(0);
  await expect(page.getByText('Owner TBD')).toHaveCount(0);
});
