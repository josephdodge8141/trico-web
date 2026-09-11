import { expect, test } from '@playwright/test';

const publicPages = [
  { route: '/', heading: "Building Utah's Future" },
  { route: '/property-management', heading: 'What to Expect with TriCo' },
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

test('renders the complete Property Management composition with all semantic boundaries', async ({
  page,
}) => {
  await page.goto('/property-management');
  await expect(page.locator('[data-property-management-entity-boundary="true"]')).toHaveCount(35);
  for (const heading of [
    'What to Expect with TriCo',
    'The TriCo Experience',
    'Take a Look at Our Process',
    'Properties We Currently Manage',
    'Commercial Owners Associations',
    'Homeowners Associations',
    'Tenant Portal',
    'Meet Our Property Management Experts',
    'Property Management Done Right',
    'What Our Clients Say',
    'Frequently Asked Questions',
    'Join Our Team',
    'New Client Inquiry',
    'Leave Us a Review',
    'Get Your Free Property Analysis',
  ]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.locator('.pm-property-card')).toHaveCount(12);
  const portfolioImages = page.locator('.pm-property-card img');
  await expect(portfolioImages).toHaveCount(10);
  for (const image of await portfolioImages.all()) {
    await expect(image).toBeVisible();
    expect(
      await image.evaluate((element) =>
        element instanceof HTMLImageElement ? element.naturalWidth : 0,
      ),
    ).toBeGreaterThan(0);
    expect(
      await image.evaluate((element) =>
        element instanceof HTMLImageElement ? element.naturalHeight : 0,
      ),
    ).toBeGreaterThan(0);
  }
  await expect(page.locator('.pm-property-card [data-neutral-placeholder="true"]')).toHaveCount(2);
  await expect(page.getByText('Property 7')).toHaveCount(0);
});

test('keeps both Property Management forms client-only with friendly validation', async ({
  page,
}) => {
  let cmsMutations = 0;
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/')) {
      cmsMutations += 1;
    }
  });
  await page.goto('/property-management');
  await page.getByRole('button', { name: 'Submit Inquiry', exact: true }).click();
  await expect(page.getByText('Enter full name.')).toBeVisible();
  await expect(page.getByText('Enter area of interest.')).toBeVisible();
  await page.getByRole('button', { name: 'Get Free Analysis', exact: true }).last().click();
  await expect(page.getByText('Enter first name.')).toBeVisible();
  await expect(page.getByText('Enter last name.')).toBeVisible();
  await expect(page.getByText('Enter phone.')).toBeVisible();
  expect(cmsMutations).toBe(0);
});

test('uses the Property Management mobile navigation below the desktop breakpoint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/property-management');
  const menu = page.getByRole('button', { name: 'Toggle menu' });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
});

test('preserves the Property Management visual scale and desktop split geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1425, height: 1100 });
  await page.goto('/property-management');
  const hero = await page.locator('.pm-hero').boundingBox();
  const heroCopy = await page.locator('.pm-hero-grid > div').first().boundingBox();
  expect(hero?.height).toBeGreaterThanOrEqual(1100);
  expect(heroCopy?.x).toBeGreaterThanOrEqual(28);
  expect(heroCopy?.x).toBeLessThanOrEqual(36);
  await expect(page.locator('.pm-brand img')).toHaveCSS('height', '64px');
  await expect(page.locator('.pm-hero h1')).toHaveCSS('font-size', '60px');
  await expect(page.locator('#services .pm-section-heading h2')).toHaveCSS('font-size', '48px');
  await expect(page.locator('#services .pm-card p').first()).toHaveCSS('font-size', '16px');

  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.reload();
  await expect(page.locator('.pm-hero-image')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle menu' })).toBeHidden();
  const managedCards = page.locator(
    '#managed-properties > .pm-container > .pm-entity-slot:nth-of-type(2) .pm-property-card',
  );
  const firstManagedCard = await managedCards.nth(0).boundingBox();
  const thirdManagedCard = await managedCards.nth(2).boundingBox();
  const fourthManagedCard = await managedCards.nth(3).boundingBox();
  expect(thirdManagedCard?.y).toBe(firstManagedCard?.y);
  expect(fourthManagedCard?.y).toBeGreaterThan(
    (firstManagedCard?.y ?? 0) + (firstManagedCard?.height ?? 0),
  );
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
