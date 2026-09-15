import { expect, test, type Page } from '@playwright/test';

import { homeV2SeedData } from '@app/schemas';

type Rgb = readonly [number, number, number];

const relativeLuminance = ([red, green, blue]: Rgb) => {
  const channelLuminance = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
};

const contrastRatio = (foreground: Rgb, background: Rgb) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

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

test('keeps the active desktop editor toolbar at the compact 64px target', async ({ page }) => {
  await page.setViewportSize({ width: 1425, height: 1100 });
  await mockEditorSession(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  const toolbar = page.getByRole('complementary', { name: 'Content editor' });
  await expect(toolbar).toBeVisible();
  await expect.poll(async () => (await toolbar.boundingBox())?.height).toBe(64);
  await expect(toolbar.getByText('Edit mode', { exact: true })).toBeVisible();
  await expect(toolbar.getByText('0 unpublished changes', { exact: true })).toBeVisible();
  for (const actionName of ['View public', 'Review and publish', 'History', 'Exit edit mode']) {
    const action = toolbar.getByRole('button', { name: actionName });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(1100);
    if (await action.isEnabled()) {
      await action.focus();
      await expect(action).toBeFocused();
    }
  }
});

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

test('self-hosts the intended public-site typefaces', async ({ page }) => {
  await page.goto('/property-management');
  const registeredFamilies = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].map(({ family }) => family.replaceAll('"', ''));
  });

  expect(registeredFamilies).toContain('Open Sans');
  expect(registeredFamilies).toContain('Lato');
  await expect(page.locator('.pm-page')).toHaveCSS('font-family', /Open Sans/);
  await expect(page.getByRole('heading', { name: 'What to Expect with TriCo' })).toHaveCSS(
    'font-family',
    /Lato/,
  );
});

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
  await expect(page.locator('#features')).toBeVisible();
});

test('keeps division calls to action readable and the mobile edit launcher clear of them', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/real-estate', '/development'] as const) {
    await page.goto(route);
    const callToAction = page.getByRole('link', {
      name: route === '/real-estate' ? 'Start Your Journey' : 'View Our Projects',
    });
    await expect(callToAction).toBeVisible();
    const colors = await callToAction.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return { foreground: styles.color, background: styles.backgroundColor };
    });
    expect(colors.foreground).toBe(
      route === '/real-estate' ? 'rgb(0, 10, 77)' : 'rgb(255, 255, 255)',
    );
    expect(colors.background).toBe(
      route === '/real-estate' ? 'rgb(255, 255, 255)' : 'rgb(0, 18, 138)',
    );
  }

  for (const route of ['/construction', '/storage'] as const) {
    await page.goto(route);
    const launcher = page.getByRole('button', { name: 'Enter edit mode' });
    const protectedControl = page.getByRole(route === '/storage' ? 'link' : 'heading', {
      name: route === '/storage' ? 'Our Services' : 'Building The Future',
      exact: true,
    });
    const [launcherBox, protectedBox] = await Promise.all([
      launcher.boundingBox(),
      protectedControl.boundingBox(),
    ]);
    expect(launcherBox).not.toBeNull();
    expect(protectedBox).not.toBeNull();
    const overlaps =
      (launcherBox?.x ?? 0) < (protectedBox?.x ?? 0) + (protectedBox?.width ?? 0) &&
      (launcherBox?.x ?? 0) + (launcherBox?.width ?? 0) > (protectedBox?.x ?? 0) &&
      (launcherBox?.y ?? 0) < (protectedBox?.y ?? 0) + (protectedBox?.height ?? 0) &&
      (launcherBox?.y ?? 0) + (launcherBox?.height ?? 0) > (protectedBox?.y ?? 0);
    expect(overlaps).toBe(false);
  }
});

test('renders the complete owner-focused Storage composition with 18 semantic boundaries', async ({
  page,
}) => {
  await page.goto('/storage');
  await expect(page.locator('[data-storage-entity-boundary="true"]')).toHaveCount(18);
  for (const heading of [
    'Maximize Your Storage Facility Profitability',
    'Complete Storage Management',
    'Your Management Team',
    'Our Why',
    'Leave Us a Review',
    "Ready to Maximize Your Facility's Potential?",
    'Request a Consultation',
  ]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.locator('.storage-service-card')).toHaveCount(12);
  await expect(page.locator('.storage-team-card')).toHaveCount(4);
  await expect(page.getByText('Storage made simple')).toHaveCount(0);
  await expect(page.getByText(/choose your unit/i)).toHaveCount(0);
  for (const image of await page.locator('.storage-page img').all()) {
    await expect(image).toBeVisible();
    expect(
      await image.evaluate((element) =>
        element instanceof HTMLImageElement ? element.naturalWidth : 0,
      ),
    ).toBeGreaterThan(0);
  }
});

test('keeps the Storage consultation form client-only and mobile navigation usable', async ({
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
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Mobile storage navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.locator('input[name="firstName"]')).toBeFocused();
  expect(
    await page
      .locator('input[name="firstName"]')
      .evaluate((element) => element instanceof HTMLInputElement && !element.checkValidity()),
  ).toBe(true);
  expect(cmsMutations).toBe(0);
});

for (const division of [
  {
    name: 'Real Estate',
    route: '/real-estate',
    selector: '[data-real-estate-entity-boundary="true"]',
    count: 31,
    sections: ['#listings', '#services', '#process', '#about', '#team', '#faq', '#contact'],
  },
  {
    name: 'Construction',
    route: '/construction',
    selector: '[data-entity-boundary="true"]',
    count: 49,
    sections: ['#services', '#projects', '#plan-room', '#team', '#about', '#bid', '#contact'],
  },
  {
    name: 'Development',
    route: '/development',
    selector: '[data-development-entity-boundary="true"]',
    count: 28,
    sections: ['#services', '#projects', '#team', '#about', '#reviews', '#contact'],
  },
] as const) {
  test(`renders the complete dedicated ${division.name} composition`, async ({ page }) => {
    await page.goto(division.route);
    await expect(page.locator(division.selector)).toHaveCount(division.count);
    for (const selector of division.sections) await expect(page.locator(selector)).toBeVisible();
  });
}

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
  const heroMedia = page.locator('.pm-hero-image');
  await expect(heroMedia.locator('[data-neutral-placeholder="true"]')).toBeVisible();
  await expect(heroMedia.locator('img')).toHaveCount(0);
  await expect(heroMedia).not.toContainText('media/seed/');
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
  const logo = await page.locator('.pm-brand img').boundingBox();
  expect(logo?.width).toBeGreaterThanOrEqual(230);
  expect(logo?.width).toBeLessThanOrEqual(236);
  expect(logo?.height).toBe(56);
  const menu = page.getByRole('button', { name: 'Toggle menu' });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();

  await page.setViewportSize({ width: 1023, height: 1366 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Toggle menu' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
  await expect(page.locator('.pm-hero-image')).toBeHidden();
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
  const logo = await page.locator('.pm-brand img').boundingBox();
  expect(logo?.width).toBeGreaterThanOrEqual(265);
  expect(logo?.width).toBeLessThanOrEqual(269);
  expect(logo?.height).toBe(64);
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

test('matches the frozen Property Management header and hero geometry at each breakpoint', async ({
  page,
}) => {
  for (const expectation of [
    {
      viewport: { width: 1440, height: 1100 },
      logoX: [35, 37],
      headingWidth: [610, 614],
      copyX: [35, 37],
      copyWidth: [659, 661],
    },
    {
      viewport: { width: 1024, height: 1366 },
      logoX: [15, 17],
      headingWidth: [423, 425],
      copyX: [15, 17],
      copyWidth: [471, 473],
    },
    {
      viewport: { width: 390, height: 844 },
      logoX: [15, 17],
      headingWidth: [357, 359],
      copyX: [15, 17],
      copyWidth: [357, 359],
    },
  ] as const) {
    await page.setViewportSize(expectation.viewport);
    await page.goto('/property-management');

    const banner = await page.locator('.pm-anniversary').boundingBox();
    const header = await page.locator('.pm-header').boundingBox();
    const logo = await page.locator('.pm-brand img').boundingBox();
    const heading = await page.locator('.pm-hero h1').boundingBox();
    const copy = await page.locator('.pm-hero-grid > div').first().boundingBox();
    expect(banner?.y).toBe(0);
    expect(header?.y).toBe(52);
    expect(logo?.x).toBeGreaterThanOrEqual(expectation.logoX[0]);
    expect(logo?.x).toBeLessThanOrEqual(expectation.logoX[1]);
    expect(heading?.x).toBeGreaterThanOrEqual(expectation.copyX[0]);
    expect(heading?.x).toBeLessThanOrEqual(expectation.copyX[1]);
    expect(heading?.width).toBeGreaterThanOrEqual(expectation.headingWidth[0]);
    expect(heading?.width).toBeLessThanOrEqual(expectation.headingWidth[1]);
    expect(copy?.x).toBeGreaterThanOrEqual(expectation.copyX[0]);
    expect(copy?.x).toBeLessThanOrEqual(expectation.copyX[1]);
    expect(copy?.width).toBeGreaterThanOrEqual(expectation.copyWidth[0]);
    expect(copy?.width).toBeLessThanOrEqual(expectation.copyWidth[1]);

    if (expectation.viewport.width >= 1024) {
      await expect(page.locator('.pm-hero h1')).toHaveCSS('line-height', '60px');
      await expect(page.locator('.pm-hero-grid > div:first-child > p')).toHaveCSS(
        'line-height',
        '28px',
      );
      expect(heading?.height).toBeGreaterThanOrEqual(119);
      expect(heading?.height).toBeLessThanOrEqual(121);
    }

    if (expectation.viewport.width === 1024) {
      expect(logo?.width).toBeGreaterThanOrEqual(199);
      expect(logo?.width).toBeLessThanOrEqual(203);
      expect(logo?.height).toBe(64);
    }
  }
});

test('preserves square Property Management team portraits and mobile content width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1425, height: 1100 });
  await page.goto('/property-management');
  const desktopPortraits = page.locator('.pm-team [data-profile-media-state="available"] img');
  await expect(desktopPortraits).toHaveCount(2);
  for (const portrait of await desktopPortraits.all()) {
    const box = await portrait.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(429);
    expect(box?.width).toBeLessThanOrEqual(431);
    expect(box?.height).toBe(box?.width);
    await expect(portrait).toHaveCSS('object-fit', 'cover');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileServiceCardContentWidth = await page
    .locator('#services .pm-card')
    .first()
    .evaluate((element) => element.clientWidth);
  expect(mobileServiceCardContentWidth).toBeGreaterThanOrEqual(355);
  expect(mobileServiceCardContentWidth).toBeLessThanOrEqual(357);
  const mobilePortraits = page.locator('.pm-team [data-profile-media-state="available"] img');
  for (const portrait of await mobilePortraits.all()) {
    const box = await portrait.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(355);
    expect(box?.width).toBeLessThanOrEqual(357);
    expect(box?.height).toBe(box?.width);
  }
});

test('gives the Property Management hero actions an accessible visual hierarchy', async ({
  page,
}) => {
  const primary = page.locator('.pm-hero .pm-actions a').nth(0);
  const secondary = page.locator('.pm-hero .pm-actions a').nth(1);

  for (const viewport of [
    { width: 1440, height: 1100 },
    { width: 1024, height: 1366 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/property-management');
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const primaryBox = await primary.boundingBox();
    const secondaryBox = await secondary.boundingBox();
    expect(primaryBox?.width).toBeGreaterThanOrEqual(201);
    expect(primaryBox?.width).toBeLessThanOrEqual(203);
    expect(primaryBox?.height).toBe(44);
    expect(secondaryBox?.width).toBeGreaterThanOrEqual(148);
    expect(secondaryBox?.width).toBeLessThanOrEqual(150);
    expect(secondaryBox?.height).toBe(44);
    expect(secondaryBox?.x).toBeGreaterThan((primaryBox?.x ?? 0) + (primaryBox?.width ?? 0));
    expect(secondaryBox?.y).toBe(primaryBox?.y);
    await expect(primary).toHaveCSS('border-radius', '6px');
    await expect(primary).toHaveCSS('font-weight', '500');
    await expect(secondary).toHaveCSS('border-radius', '6px');
    await expect(secondary).toHaveCSS('font-weight', '500');
  }

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/property-management');

  await expect(primary).toHaveAttribute('href', '#contact');
  await expect(secondary).toHaveAttribute('href', '#services');
  await expect(primary).toHaveCSS('background-color', 'rgb(134, 98, 45)');
  await expect(primary).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(secondary).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(secondary).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(secondary).toHaveCSS('border-color', 'rgba(255, 255, 255, 0.3)');
  expect(contrastRatio([255, 255, 255], [134, 98, 45])).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio([255, 255, 255], [0, 18, 138])).toBeGreaterThanOrEqual(4.5);

  await primary.hover();
  await expect(primary).toHaveCSS('background-color', 'rgb(134, 98, 45)');
  await secondary.hover();
  await expect(secondary).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.1)');
  await primary.focus();
  await expect(primary).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
  await expect(primary).toHaveCSS('outline-style', 'solid');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileHeroBox = await page.locator('.pm-hero').boundingBox();
  const mobilePrimaryBox = await primary.boundingBox();
  const mobileSecondaryBox = await secondary.boundingBox();
  expect(mobileHeroBox?.height).toBe(844);
  expect(mobilePrimaryBox?.x).toBe(16);
  expect(mobileSecondaryBox?.x).toBe(16);
  expect(mobilePrimaryBox?.width).toBe(358);
  expect(mobileSecondaryBox?.width).toBe(358);
  expect(mobilePrimaryBox?.height).toBeGreaterThanOrEqual(43);
  expect(mobilePrimaryBox?.height).toBeLessThanOrEqual(45);
  expect(mobileSecondaryBox?.height).toBeGreaterThanOrEqual(43);
  expect(mobileSecondaryBox?.height).toBeLessThanOrEqual(45);
  expect(mobileSecondaryBox?.y).toBeGreaterThanOrEqual(
    (mobilePrimaryBox?.y ?? 0) + (mobilePrimaryBox?.height ?? 0) + 11,
  );
  expect(mobileSecondaryBox?.y).toBeLessThanOrEqual(
    (mobilePrimaryBox?.y ?? 0) + (mobilePrimaryBox?.height ?? 0) + 13,
  );
});

test('restores labeled Property Management contact rows and clears the sticky header anchor', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1425, height: 1100 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/property-management');
    const detailRows = page.locator('.pm-contact-detail');
    await expect(detailRows).toHaveCount(5);
    await expect(detailRows.locator('.pm-contact-icon')).toHaveCount(5);
    await expect(detailRows.locator('h3')).toHaveText([
      'Office Location',
      'Phone',
      'Email',
      'Licenses',
      'Office Hours',
    ]);
    await expect(detailRows.nth(3).locator('p')).toHaveCount(3);
    await expect(detailRows.nth(3).getByText('LIC', { exact: true })).toHaveCount(0);
    await expect(
      detailRows.nth(3).locator('.pm-contact-license-icon[aria-hidden="true"] svg'),
    ).toHaveCount(1);

    await page.locator('.pm-hero .pm-actions a[href="#contact"]').click();
    await expect(page).toHaveURL(/#contact$/);
    await expect
      .poll(async () => {
        const headerBottom = await page
          .locator('.pm-header')
          .evaluate((element) => element.getBoundingClientRect().bottom);
        const titleTop = await page
          .getByRole('heading', { name: 'Get Your Free Property Analysis', exact: true })
          .evaluate((element) => element.getBoundingClientRect().top);
        const formTop = await page
          .getByRole('heading', { name: 'Request Your Free Analysis', exact: true })
          .evaluate((element) => element.getBoundingClientRect().top);
        return (
          titleTop >= headerBottom + 16 &&
          formTop >= headerBottom + 16 &&
          titleTop < viewport.height &&
          (viewport.width < 768 ? formTop > titleTop : formTop < viewport.height)
        );
      })
      .toBe(true);
  }
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
