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
    expect(await page.locator('[data-entity-boundary="true"]').count()).toBeGreaterThanOrEqual(5);
  });
}

test('uses corrected real-estate and storage anchors', async ({ page }) => {
  await page.goto('/real-estate');
  await expect(page.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '#services');
  await page.goto('/storage');
  await expect(page.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '#features');
  await expect(page.locator('#features')).toBeVisible();
});

test('renders the complete Home composition with all semantic visual boundaries', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-home-entity-boundary="true"]')).toHaveCount(18);
  const headings = [
    "Building Utah's Future",
    'Our Divisions',
    'Our Core Values',
    'Our Journey',
    'Leadership Team',
    'News & Updates',
    'Join Our Team',
    'Submit Your Resume',
    'Get In Touch',
  ];
  for (const heading of headings)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await expect(page.locator('.home-division-card')).toHaveCount(5);
  await expect(page.locator('.home-timeline-card')).toHaveCount(8);
  await expect(page.locator('.home-leader-card img')).toHaveCount(4);
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

test('preserves the intended Home composition on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const divisionCards = page.locator('.home-division-card');
  const firstDivision = await divisionCards.nth(0).boundingBox();
  const secondDivision = await divisionCards.nth(1).boundingBox();
  expect(firstDivision).not.toBeNull();
  expect(secondDivision).not.toBeNull();
  expect(secondDivision?.y).toBeGreaterThan((firstDivision?.y ?? 0) + (firstDivision?.height ?? 0));
  await expect(page.locator('.home-header img')).toHaveCSS('height', '48px');
  await expect(page.getByRole('button', { name: 'Submit Resume' })).toBeVisible();
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
