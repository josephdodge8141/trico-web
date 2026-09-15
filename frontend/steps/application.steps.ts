import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  After,
  Before,
  BeforeAll,
  Given,
  Then,
  When,
  setDefaultTimeout,
  setWorldConstructor,
  World,
} from '@cucumber/cucumber';
import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  homeCareersOpenPositionsSchema,
  homeCoreValuesItemsSchema,
  homeJourneyTimelineSchema,
  homeNewsItemsSchema,
  homeV2SeedData,
  pendingChangesResponseSchema,
  previewPreferencesResponseSchema,
  type EditableValue,
  type PendingChange,
} from '@app/schemas';

const baseUrl = process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088';
const editorEmail = process.env.PREVIEW_EDITOR_EMAIL ?? 'editor@tricoinc.com';
const editorPassword = process.env.PREVIEW_EDITOR_PASSWORD ?? 'local-preview-password';
const applicationOrigin = new URL(baseUrl).origin;
const mailpitAuthorization = `Basic ${Buffer.from(
  `${process.env.MAILPIT_USERNAME ?? 'local-editor'}:${process.env.MAILPIT_PASSWORD ?? 'local-mailpit-password'}`,
).toString('base64')}`;
const headings: Readonly<Record<string, string>> = {
  '/': "Building Utah's Future",
  '/property-management': 'What to Expect with TriCo',
  '/real-estate': 'Commercial Real Estate & Land Experts',
  '/construction': 'Building The Future',
  '/storage': 'Maximize Your Storage Facility Profitability',
  '/development': 'Transforming Vision Into Reality',
};
setDefaultTimeout(30_000);

BeforeAll(async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/api/v1/health`)).ok) return;
    } catch {
      /* bounded startup retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`TriCo did not become healthy at ${baseUrl}.`);
});

class FrontendWorld extends World {
  browser: Browser | undefined;
  context: BrowserContext | undefined;
  page: Page | undefined;
  route = '/';
  manifest: Record<string, unknown> | undefined;
  pageDocument: unknown;
  responseStatus: number | undefined;
  responseBody: unknown;
  originalHeading = '';
  editedHeading = '';
  cleanup: { readonly page: Page; readonly entityId: string; readonly pageId?: string }[] = [];
  secondaryContext: BrowserContext | undefined;
  originalItemIds: readonly string[] = [];
  finalItemIds: readonly string[] = [];
  addedItemId = '';
  collectionValue: readonly EditableValue[] = [];
  noviceValue = '';
  otherEditorId = '';
  touchLayout: { readonly width: number; readonly height: number } | undefined;
  propertyHeaderLabel = '';
  propertyHeroHeading = '';
  propertyEditedHeaderLabel = '';
  propertyEditedHeroHeading = '';
  remainingDivisionEntityId = '';
  remainingDivisionPageId = '';
  remainingDivisionEditor = '';
  remainingDivisionValue = '';
  mediaFriendlyName = '';
  mediaAltText = '';
  reorderedItemLabel = '';
  iconEditorItemLabel = '';
  homePublicHeroGeometry:
    | {
        readonly sectionX: number;
        readonly sectionWidth: number;
        readonly textCenterX: number;
      }
    | undefined;
  currentPage(): Page {
    assert.ok(this.page);
    return this.page;
  }
}

Given(
  'I am signed in and editing a Home collection with icon fields',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await discardPendingOwnedByCurrentUser(page, 'home.core-values.items');
    this.cleanup.push({ page, entityId: 'home.core-values.items' });
    await enterHomeEditMode(page);
    this.iconEditorItemLabel = 'Integrity';
  },
);

When("I open an item's icon chooser", async function (this: FrontendWorld) {
  const page = this.currentPage();
  const item = page
    .getByRole('heading', { name: this.iconEditorItemLabel, exact: true })
    .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
  await item.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await item.hover();
  await item.getByRole('button', { name: `Edit ${this.iconEditorItemLabel}` }).click();
});

Then(
  'the chooser offers the complete public icon library with graphical previews',
  async function (this: FrontendWorld) {
    const dialog = this.currentPage().getByRole('dialog', {
      name: `Edit ${this.iconEditorItemLabel}`,
    });
    const search = dialog.getByRole('searchbox', { name: 'Search icons' });
    await expect(search).toBeVisible();
    await search.fill('tractor');
    const tractor = dialog.getByRole('radio', { name: 'Tractor' });
    await expect(tractor).toBeVisible();
    await expect(dialog.locator('svg[data-lucide-icon="Tractor"]')).toBeVisible();
  },
);

Then('I can search the icon library by its friendly name', async function (this: FrontendWorld) {
  const dialog = this.currentPage().getByRole('dialog', {
    name: `Edit ${this.iconEditorItemLabel}`,
  });
  await expect(dialog.getByRole('radio', { name: 'Tractor' })).toHaveCount(1);
  await expect(dialog.getByRole('radio', { name: 'Heart' })).toHaveCount(0);
});

When(
  'I choose the {string} icon and save the item',
  async function (this: FrontendWorld, iconName: string) {
    const dialog = this.currentPage().getByRole('dialog', {
      name: `Edit ${this.iconEditorItemLabel}`,
    });
    await dialog.getByRole('radio', { name: iconName, exact: true }).check();
    await dialog.getByRole('button', { name: 'Save changes' }).click();
  },
);

Then(
  'the selected {string} icon renders in my private preview without a fallback symbol',
  async function (this: FrontendWorld, iconName: string) {
    const item = this.currentPage()
      .getByRole('heading', { name: this.iconEditorItemLabel, exact: true })
      .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
    await expect(item.locator(`svg.lucide-${iconName.toLocaleLowerCase()}`)).toBeVisible();
    await expect(item.getByText('◇', { exact: true })).toHaveCount(0);
  },
);
setWorldConstructor(FrontendWorld);

Before(async function (this: FrontendWorld, { pickle }) {
  this.browser = await chromium.launch();
  this.context = await this.browser.newContext({
    baseURL: baseUrl,
    ...(pickle.tags.some(({ name }) => name === '@touch')
      ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
      : {}),
  });
  this.page = await this.context.newPage();
});
After(async function (this: FrontendWorld) {
  for (const target of this.cleanup.toReversed()) {
    await discardPendingOwnedByCurrentUser(
      target.page,
      target.entityId,
      target.pageId ?? 'home',
    ).catch(() => undefined);
  }
  await this.secondaryContext?.close();
  await this.context?.close();
  await this.browser?.close();
});

async function loginEditor(
  page: Page,
  email = editorEmail,
  password = editorPassword,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function csrfHeaders(page: Page): Promise<Readonly<Record<string, string>>> {
  const response = await page.request.get('/api/v1/auth/csrf');
  assert.equal(response.status(), 200);
  const body = (await response.json()) as { readonly token?: unknown };
  assert.equal(typeof body.token, 'string');
  return { Origin: applicationOrigin, 'X-CSRF-Token': String(body.token) };
}

async function pendingFor(
  page: Page,
  entityId: string,
  pageId = 'home',
): Promise<PendingChange | undefined> {
  const response = await page.request.get(`/api/v1/changes?pageId=${encodeURIComponent(pageId)}`);
  assert.equal(response.status(), 200);
  return pendingChangesResponseSchema
    .parse(await response.json())
    .changes.find((change) => change.entityId === entityId);
}

async function saveReplacement(
  page: Page,
  entityId: string,
  replacementValue: EditableValue,
  expectedRevision?: number,
): Promise<PendingChange> {
  const headers = await csrfHeaders(page);
  const response = await page.request.fetch(
    `/api/v1/entities/${encodeURIComponent(entityId)}/changes`,
    {
      method: expectedRevision === undefined ? 'POST' : 'PUT',
      headers,
      data:
        expectedRevision === undefined
          ? { replacementValue }
          : { replacementValue, expectedRevision },
    },
  );
  assert.ok(response.status() === 200 || response.status() === 201);
  return (await response.json()) as PendingChange;
}

async function discardPendingOwnedByCurrentUser(
  page: Page,
  entityId: string,
  pageId = 'home',
): Promise<void> {
  const sessionResponse = await page.request.get('/api/v1/auth/me');
  if (!sessionResponse.ok()) return;
  const session = (await sessionResponse.json()) as {
    readonly authenticated?: unknown;
    readonly principal?: { readonly subject?: unknown } | null;
  };
  if (session.authenticated !== true || typeof session.principal?.subject !== 'string') return;
  const pending = await pendingFor(page, entityId, pageId);
  if (pending === undefined || pending.authorId !== session.principal.subject) return;
  const response = await page.request.delete(
    `/api/v1/entities/${encodeURIComponent(entityId)}/changes`,
    {
      headers: await csrfHeaders(page),
      data: { expectedRevision: pending.revision },
    },
  );
  assert.equal(response.status(), 204);
}

async function enterHomeEditMode(page: Page): Promise<void> {
  if (!page.url().endsWith('/')) await page.goto('/');
  const preview = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/api/v1/pages/home/preview'),
  );
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  await preview;
  await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
}

async function waitForMailLink(page: Page, email: string, subject: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const response = await page.request.get('/__mailpit/api/v1/messages', {
        headers: { Authorization: mailpitAuthorization },
      });
      const body = (await response.json()) as {
        readonly messages: readonly {
          readonly To: readonly { readonly Address: string }[];
          readonly Subject: string;
          readonly Snippet: string;
        }[];
      };
      link = body.messages.find(
        (message) =>
          message.Subject === subject &&
          message.To.some((recipient) => recipient.Address === email),
      )?.Snippet;
      return link;
    })
    .toMatch(/^https?:\/\/[^/]+\//);
  if (link === undefined) throw new Error('Verification email was not found.');
  return link;
}

async function createVerifiedEditor(world: FrontendWorld): Promise<Page> {
  assert.ok(world.browser);
  world.secondaryContext = await world.browser.newContext({ baseURL: baseUrl });
  const page = await world.secondaryContext.newPage();
  const email = `ownership-${String(Date.now())}@tricoinc.com`;
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  const verifyUrl = await waitForMailLink(page, email, 'Verify your TriCo website account');
  const parsed = new URL(verifyUrl);
  await page.goto(`${parsed.pathname}${parsed.search}`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await loginEditor(page, email);
  const session = (await (await page.request.get('/api/v1/auth/me')).json()) as {
    readonly principal?: { readonly subject?: unknown } | null;
  };
  assert.equal(typeof session.principal?.subject, 'string');
  world.otherEditorId = String(session.principal?.subject);
  return page;
}

Given('I have no authenticated editor session', async function (this: FrontendWorld) {
  await this.context?.clearCookies();
});
Given('I sign in as the preview editor', async function (this: FrontendWorld) {
  await loginEditor(this.currentPage());
});
Given('I opened the property management page', async function (this: FrontendWorld) {
  await this.currentPage().goto('/property-management');
});
When('I enter edit mode', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Enter edit mode' }).click();
});
When('I enter edit mode and reload that page', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
  await page.reload();
});
Then('I am sent to editor sign in', async function (this: FrontendWorld) {
  await expect(this.currentPage()).toHaveURL(/\/login$/);
  await expect(this.currentPage().getByRole('heading', { name: 'Editor sign in' })).toBeVisible();
});
Then(
  'successful sign in returns me to the property management page',
  async function (this: FrontendWorld) {
    await this.currentPage().getByLabel('Email').fill(editorEmail);
    await this.currentPage().getByLabel('Password').fill(editorPassword);
    await this.currentPage().getByRole('button', { name: 'Continue' }).click();
    await expect(this.currentPage()).toHaveURL(/\/property-management$/);
  },
);
Then('edit mode is already active', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('complementary', { name: 'Content editor' }),
  ).toBeVisible();
  await expect(this.currentPage().getByText('Edit mode is active')).toBeVisible();
});
Then('the content editor returns without a blank side bar', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('complementary', { name: 'Content editor' }),
  ).toBeVisible();
  await expect(this.currentPage().locator('.editor-sheet-layer')).toHaveCount(0);
  await expect(this.currentPage().locator('body')).not.toHaveCSS('overflow', 'hidden');
});
Then(
  'the edit mode launcher does not disappear between states',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().getByRole('button', { name: 'Enter edit mode' })).toHaveCount(
      0,
    );
  },
);
When('I open the TriCo site', async function (this: FrontendWorld) {
  await this.currentPage().goto('/');
});
Then('I can browse every public division page', async function (this: FrontendWorld) {
  for (const [route, heading] of Object.entries(headings)) {
    await this.currentPage().goto(route);
    await expect(this.currentPage().getByRole('heading', { name: heading })).toBeVisible();
  }
});
Then('editing controls are not shown', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('complementary', { name: 'Content editor' }),
  ).toHaveCount(0);
});

Given('the current content manifest is available', async function (this: FrontendWorld) {
  const response = await this.currentPage().request.get('/content/manifest.json');
  assert.equal(response.status(), 200);
  this.manifest = (await response.json()) as Record<string, unknown>;
});
When('I open {string}', async function (this: FrontendWorld, route: string) {
  this.route = route;
  await this.currentPage().goto(route);
  const manifest = this.manifest as { pages?: Record<string, { url?: string }> } | undefined;
  const pageId = route === '/' ? 'home' : route.slice(1);
  const pageUrl = manifest?.pages?.[pageId]?.url;
  if (pageUrl) {
    const response = await this.currentPage().request.get(pageUrl);
    assert.equal(response.status(), 200);
    this.pageDocument = await response.json();
  }
});
Then(
  'the {string} published content is rendered',
  async function (this: FrontendWorld, pageId: string) {
    const heading = headings[this.route];
    assert.ok(heading);
    await expect(this.currentPage().getByRole('heading', { name: heading })).toBeVisible();
    assert.ok((this.manifest as { pages?: Record<string, unknown> }).pages?.[pageId]);
  },
);
Then('no CMS metadata is present in the page document', function (this: FrontendWorld) {
  const serialized = JSON.stringify(this.pageDocument);
  for (const forbidden of ['pendingOwner', 'pendingRevision', 'userId', 'operationStatus'])
    assert.equal(serialized.includes(forbidden), false);
});

Given('a visitor loaded the current manifest', async function (this: FrontendWorld) {
  const response = await this.currentPage().request.get('/content/manifest.json');
  assert.equal(response.status(), 200);
  this.manifest = (await response.json()) as Record<string, unknown>;
});
When('a replacement release has not completed', function () {
  /* retain the loaded immutable manifest */
});
Then(
  'every manifest page still resolves to the previous complete release',
  async function (this: FrontendWorld) {
    const pages = (this.manifest as { pages: Record<string, { url: string }> }).pages;
    assert.equal(Object.keys(pages).length, 6);
    for (const page of Object.values(pages))
      assert.equal((await this.currentPage().request.get(page.url)).status(), 200);
  },
);

Then(
  'the Home page presents every mounted section in its intended order',
  async function (this: FrontendWorld) {
    const expectedHeadings = [
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
    const positions: number[] = [];
    for (const heading of expectedHeadings) {
      const locator = this.currentPage().getByRole('heading', { name: heading, exact: true });
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      assert.ok(box);
      positions.push(box.y + (await this.currentPage().evaluate(() => window.scrollY)));
    }
    assert.deepEqual(
      positions,
      [...positions].sort((left, right) => left - right),
    );
  },
);
Then(
  'all {int} Home entities have an editable visual boundary',
  async function (this: FrontendWorld, count: number) {
    await expect(this.currentPage().locator('[data-home-entity-boundary="true"]')).toHaveCount(
      count,
    );
  },
);
Then(
  'every Home division card uses the approved blue text border icon and action treatment',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const cards = page.locator('.home-division-card');
    await expect(cards).toHaveCount(5);
    for (let index = 0; index < (await cards.count()); index += 1) {
      const card = cards.nth(index);
      await expect
        .poll(async () => {
          await card.hover();
          return card.evaluate((element) => {
            const heading = element.querySelector('h3');
            const icon = element.querySelector('.home-card-icon');
            const action = element.querySelector('.home-card-link');
            if (heading === null || icon === null || action === null) return null;
            return {
              hovered: element.matches(':hover'),
              heading: window.getComputedStyle(heading).color,
              icon: window.getComputedStyle(icon).color,
              action: window.getComputedStyle(action).color,
              border: window.getComputedStyle(element).borderColor,
            };
          });
        })
        .toEqual({
          hovered: true,
          heading: 'rgb(94, 133, 186)',
          icon: 'rgb(94, 133, 186)',
          action: 'rgb(94, 133, 186)',
          border: 'rgba(94, 133, 186, 0.5)',
        });
    }
  },
);
Then(
  'one shared semantic palette defines action highlight stat rating and brand accent roles',
  async function (this: FrontendWorld) {
    const roles = await this.currentPage().evaluate(() => {
      const styles = window.getComputedStyle(document.documentElement);
      return {
        dark: styles.getPropertyValue('--trico-color-dark').trim(),
        deep: styles.getPropertyValue('--trico-color-deep').trim(),
        light: styles.getPropertyValue('--trico-color-light').trim(),
        gold: styles.getPropertyValue('--trico-color-gold').trim(),
        action: styles.getPropertyValue('--trico-color-action').trim(),
        highlight: styles.getPropertyValue('--trico-color-highlight').trim(),
        stat: styles.getPropertyValue('--trico-color-stat').trim(),
        rating: styles.getPropertyValue('--trico-color-rating').trim(),
        brandAccent: styles.getPropertyValue('--trico-color-brand-accent').trim(),
      };
    });
    assert.deepEqual(roles, {
      dark: '#00128a',
      deep: '#000a4d',
      light: '#5e85ba',
      gold: '#86622d',
      action: '#00128a',
      highlight: '#5e85ba',
      stat: '#5e85ba',
      rating: '#5e85ba',
      brandAccent: '#86622d',
    });
  },
);
Then(
  'all page stylesheets source their colors exclusively from the global palette',
  async function () {
    const pageStyles = [
      'home.css',
      'property-management.css',
      'real-estate.css',
      'construction.css',
      'storage.css',
      'development.css',
    ] as const;
    const violations: string[] = [];
    for (const fileName of pageStyles) {
      const source = await readFile(new URL(`../pages/${fileName}`, import.meta.url), 'utf8');
      const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
      if (/#[\da-f]{3,8}\b/i.test(withoutComments)) violations.push(`${fileName}: hex literal`);
      if (/\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color)\(/i.test(withoutComments))
        violations.push(`${fileName}: color function`);
      if (/(?<![-\w])(?:white|black|transparent)(?![-\w])/i.test(withoutComments))
        violations.push(`${fileName}: named color`);
      if (
        /--(?:home|pm|re|co|sp|storage|dev)-(?:primary|navy|gold|blue|muted|tint|border)\b/.test(
          withoutComments,
        )
      )
        violations.push(`${fileName}: page-local color alias`);
    }
    assert.deepEqual(violations, []);
  },
);
Then(
  'Home Property Management Real Estate Construction Storage and Development use the shared blue highlight role',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const samples = [
      { route: '/', selector: '.home-card-icon' },
      { route: '/property-management', selector: '.pm-section-heading > span' },
      { route: '/real-estate', selector: '.re-service-grid .re-card > svg:first-child' },
      { route: '/construction', selector: '.co-heading > span' },
      { route: '/storage', selector: '.storage-section-heading > span' },
      { route: '/development', selector: '.dev-pill' },
    ] as const;
    for (const sample of samples) {
      await page.goto(sample.route);
      const target = page.locator(sample.selector).first();
      await expect(target).toBeAttached();
      await expect(target).toHaveCSS('color', 'rgb(94, 133, 186)');
    }
  },
);
Then(
  'division statistics use the shared blue stat role while intentional brand accents remain gold',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const statSamples = [
      { route: '/property-management', selector: '.pm-stat strong' },
      { route: '/real-estate', selector: '.re-hero-stats strong' },
      { route: '/construction', selector: '.co-pro-stats strong' },
      { route: '/storage', selector: '.storage-stat strong' },
      { route: '/development', selector: '.dev-stats strong' },
    ] as const;
    for (const sample of statSamples) {
      await page.goto(sample.route);
      const target = page.locator(sample.selector).first();
      await expect(target).toBeAttached();
      await expect(target).toHaveCSS('color', 'rgb(94, 133, 186)');
    }

    await page.goto('/property-management');
    await expect(page.locator('.pm-stars svg').first()).toHaveCSS('color', 'rgb(94, 133, 186)');

    for (const action of [
      { route: '/real-estate', selector: '.re-careers .re-button-gold' },
      { route: '/construction', selector: '.co-button-gold' },
    ] as const) {
      await page.goto(action.route);
      await expect(page.locator(action.selector).first()).toHaveCSS(
        'background-color',
        'rgb(0, 18, 138)',
      );
    }

    await page.goto('/development');
    await expect(page.locator('.dev-brand strong')).toHaveCSS('color', 'rgb(134, 98, 45)');
  },
);

const reviewPlatformSamples = [
  { route: '/real-estate', grid: '.re-review-grid' },
  { route: '/property-management', grid: '.pm-reviews' },
  { route: '/construction', grid: '.co-review-grid' },
  { route: '/storage', grid: '.storage-reviews' },
  { route: '/development', grid: '.dev-review-grid' },
] as const;

Then(
  'Real Estate Property Management Construction Storage and Development use one review platform card contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of reviewPlatformSamples) {
      await page.goto(sample.route);
      const grid = page.locator(sample.grid);
      await expect(grid).toBeVisible();
      const cards = grid.locator('[data-review-platform-card="true"]');
      await expect(cards).toHaveCount(3);
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS('display', 'flex');
        await expect(card).toHaveCSS('text-align', 'center');
      }
    }
  },
);

Then(
  'Google Facebook and Yelp use accessible platform-specific brand treatments',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const expected = {
      google: 'rgb(66, 133, 244)',
      facebook: 'rgb(24, 119, 242)',
      yelp: 'rgb(211, 35, 35)',
    } as const;
    for (const sample of reviewPlatformSamples) {
      await page.goto(sample.route);
      for (const [platform, color] of Object.entries(expected)) {
        const mark = page.locator(
          `${sample.grid} [data-review-platform="${platform}"] [data-review-platform-mark="true"]`,
        );
        await expect(mark).toHaveCount(1);
        await expect(mark).toHaveCSS('color', color);
        await expect(mark).toHaveAttribute('aria-hidden', 'true');
      }
    }
  },
);

Then('review ratings use the shared blue rating role', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const expectedColor = 'rgb(94, 133, 186)';
  for (const sample of reviewPlatformSamples) {
    await page.goto(sample.route);
    const rating = page.locator('[data-review-rating="true"]').first();
    await expect(rating).toBeVisible();
    await expect(rating).toHaveCSS('color', expectedColor);
    await expect(rating).toHaveAttribute('aria-label', '5 out of 5 stars');
  }
});

Then(
  'review platform cards remain balanced at desktop and compact on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of reviewPlatformSamples) {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.goto(sample.route);
      const desktopCards = page.locator(`${sample.grid} [data-review-platform-card="true"]`);
      const heights = await desktopCards.evaluateAll((cards) =>
        cards.map((card) => card.getBoundingClientRect().height),
      );
      assert.equal(heights.length, 3);
      assert.ok(Math.max(...heights) - Math.min(...heights) <= 1);
      assert.ok(Math.min(...heights) >= 240);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(sample.route);
      const mobileCard = page.locator(`${sample.grid} [data-review-platform-card="true"]`).first();
      await expect(mobileCard).toBeVisible();
      const mobileBox = await mobileCard.boundingBox();
      assert.ok(mobileBox);
      assert.ok(mobileBox.width >= 330);
      assert.ok(mobileBox.height < 320);
    }
  },
);

const profileCardSamples = [
  { route: '/real-estate', count: 9, available: 6, unavailable: 3 },
  { route: '/property-management', count: 4, available: 2, unavailable: 2 },
  { route: '/development', count: 3, available: 3, unavailable: 0 },
] as const;

Then(
  'Real Estate Property Management and Development expose one shared profile card contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    for (const sample of profileCardSamples) {
      await page.goto(sample.route);
      const cards = page.locator('[data-profile-card="true"]');
      await expect(cards).toHaveCount(sample.count);
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS('display', 'flex');
        await expect(card).toHaveCSS('flex-direction', 'column');
      }
    }
  },
);

Then(
  'available portraits crop consistently while unavailable portraits use one neutral accessible fallback',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of profileCardSamples) {
      await page.goto(sample.route);
      const available = page.locator(
        '[data-profile-card="true"] [data-profile-media-state="available"]',
      );
      const unavailable = page.locator(
        '[data-profile-card="true"] [data-profile-media-state="unavailable"]',
      );
      await expect(available).toHaveCount(sample.available);
      await expect(unavailable).toHaveCount(sample.unavailable);
      for (const media of await available.all()) {
        const box = await media.boundingBox();
        assert.ok(box);
        assert.ok(Math.abs(box.width - box.height) <= 1);
        const portrait = media.locator('img');
        await expect(portrait).toHaveCSS('object-fit', 'cover');
        assert.ok(
          (await portrait.evaluate((element) =>
            element instanceof HTMLImageElement ? element.naturalWidth : 0,
          )) > 0,
        );
      }
      for (const media of await unavailable.all()) {
        await expect(media).toHaveAttribute('role', 'img');
        await expect(media).toHaveAttribute('aria-label', /Portrait unavailable for .+/);
        await expect(media.locator('img')).toHaveCount(0);
        await expect(media).not.toContainText('media/');
      }
    }
  },
);

Then(
  'profile cards remain balanced at desktop and mobile widths and retain their geometry in edit mode',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of profileCardSamples) {
      await page.setViewportSize({ width: 1425, height: 1100 });
      await page.goto(sample.route);
      const desktopCards = page.locator('[data-profile-card="true"]');
      const firstRow = await desktopCards.evaluateAll((cards) => {
        const firstTop = cards[0]?.getBoundingClientRect().top;
        return cards
          .map((card) => card.getBoundingClientRect())
          .filter((box) => firstTop !== undefined && Math.abs(box.top - firstTop) <= 1)
          .map((box) => ({ width: box.width, height: box.height }));
      });
      assert.ok(firstRow.length >= 2);
      assert.ok(firstRow.every(({ width }) => width >= 300));
      assert.ok(
        Math.max(...firstRow.map(({ height }) => height)) -
          Math.min(...firstRow.map(({ height }) => height)) <=
          1,
      );

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(sample.route);
      const mobileCards = page.locator('[data-profile-card="true"]');
      const firstMobileBox = await mobileCards.first().boundingBox();
      assert.ok(firstMobileBox);
      assert.ok(firstMobileBox.width >= 350);
      const mobileColumns = await mobileCards.evaluateAll(
        (cards) => new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size,
      );
      assert.equal(mobileColumns, 1);
    }

    await page.setViewportSize({ width: 1425, height: 1100 });
    await loginEditor(page);
    await page.goto('/real-estate');
    const publicWidth = await page
      .locator('[data-profile-card="true"]')
      .first()
      .evaluate((card) => card.getBoundingClientRect().width);
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    const editWidth = await page
      .locator('[data-profile-card="true"]')
      .first()
      .evaluate((card) => card.getBoundingClientRect().width);
    assert.ok(Math.abs(editWidth - publicWidth) <= 2);
  },
);

const divisionHeroMediaSamples = [
  { route: '/property-management', state: 'unavailable' },
  { route: '/real-estate', state: 'unavailable' },
  { route: '/construction', state: 'available' },
  { route: '/storage', state: 'available' },
] as const;

Then(
  'Property Management Real Estate Construction and Storage expose one shared hero media contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const sample of divisionHeroMediaSamples) {
      await page.goto(sample.route);
      const media = page.locator('[data-division-hero-media="true"]');
      await expect(media).toHaveCount(1);
      await expect(media).toBeVisible();
      await expect(media).toHaveAttribute('data-media-state', sample.state);
      await expect(media).toHaveCSS('border-radius', '16px');
      await expect(media).toHaveCSS('overflow', 'hidden');
      await expect(media).toHaveCSS('box-shadow', 'rgba(15, 23, 41, 0.18) 0px 24px 55px 0px');
      const box = await media.boundingBox();
      assert.ok(box);
      assert.ok(Math.abs(box.width / box.height - 4 / 3) <= 0.01);
      assert.ok(box.x >= 720);
    }
  },
);

Then(
  'Real Estate Property Management and Development use one shared section rhythm contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const expectations = [
      {
        route: '/real-estate',
        page: '.re-page',
        section: '.re-section',
        heading: '.re-section-heading',
      },
      {
        route: '/property-management',
        page: '.pm-page',
        section: '.pm-section',
        heading: '.pm-section-heading',
      },
      {
        route: '/development',
        page: '.dev-page',
        section: '.dev-section',
        heading: '.dev-heading',
      },
    ] as const;

    for (const expectation of expectations) {
      await page.goto(expectation.route);
      const contract = await page.locator(expectation.page).evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          sectionSpacing: styles.getPropertyValue('--trico-section-spacing').trim(),
          headingGap: styles.getPropertyValue('--trico-section-heading-gap').trim(),
          cardPadding: styles.getPropertyValue('--trico-card-padding').trim(),
          cardMinHeight: styles.getPropertyValue('--trico-card-min-height').trim(),
          copyMeasure: styles.getPropertyValue('--trico-card-copy-measure').trim(),
        };
      });
      assert.deepEqual(contract, {
        sectionSpacing: '6rem',
        headingGap: '4rem',
        cardPadding: '2rem',
        cardMinHeight: '15rem',
        copyMeasure: '42ch',
      });

      const section = page.locator(expectation.section).first();
      const heading = page.locator(expectation.heading).first();
      await expect(section).toBeVisible();
      await expect(heading).toBeVisible();
      const sectionStyles = await section.evaluate((element) => getComputedStyle(element));
      const headingStyles = await heading.evaluate((element) => getComputedStyle(element));
      assert.equal(sectionStyles.paddingTop, '96px');
      assert.equal(sectionStyles.paddingBottom, '96px');
      assert.equal(headingStyles.marginBottom, '64px');
    }
  },
);

Then(
  'representative service cards use the shared vertical density and readable copy measure',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const expectations = [
      { route: '/real-estate', card: '#services .re-card' },
      { route: '/property-management', card: '#services .pm-card' },
      { route: '/development', card: '#projects .dev-card' },
    ] as const;

    for (const expectation of expectations) {
      await page.goto(expectation.route);
      await page.setViewportSize({ width: 1440, height: 1100 });
      const card = page.locator(expectation.card).first();
      await expect(card).toBeVisible();
      const geometry = await card.evaluate((element) => {
        const cardStyles = getComputedStyle(element);
        const copy = element.querySelector('p');
        if (!(copy instanceof HTMLElement)) return null;
        const copyStyles = getComputedStyle(copy);
        return {
          minHeight: cardStyles.minHeight,
          paddingTop: cardStyles.paddingTop,
          paddingRight: cardStyles.paddingRight,
          paddingBottom: cardStyles.paddingBottom,
          paddingLeft: cardStyles.paddingLeft,
          copyMaxWidth: copyStyles.maxWidth,
          copyLineHeight: Number.parseFloat(copyStyles.lineHeight),
        };
      });
      assert.ok(geometry);
      assert.deepEqual(
        {
          minHeight: geometry.minHeight,
          paddingTop: geometry.paddingTop,
          paddingRight: geometry.paddingRight,
          paddingBottom: geometry.paddingBottom,
          paddingLeft: geometry.paddingLeft,
        },
        {
          minHeight: '240px',
          paddingTop: '32px',
          paddingRight: '32px',
          paddingBottom: '32px',
          paddingLeft: '32px',
        },
      );
      const copyMaxWidth = Number.parseFloat(geometry.copyMaxWidth);
      assert.ok(copyMaxWidth >= 300 && copyMaxWidth <= 390);
      assert.ok(geometry.copyLineHeight >= 24);
    }
  },
);

Then(
  'shared section rhythm remains balanced at desktop and tablet widths',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const viewport of [
      { width: 1440, height: 1100, expectedPadding: '96px', expectedHeadingGap: '64px' },
      { width: 767, height: 1024, expectedPadding: '72px', expectedHeadingGap: '40px' },
    ] as const) {
      await page.setViewportSize(viewport);
      for (const expectation of [
        { route: '/real-estate', section: '.re-section', heading: '.re-section-heading' },
        { route: '/property-management', section: '.pm-section', heading: '.pm-section-heading' },
        { route: '/development', section: '.dev-section', heading: '.dev-heading' },
      ] as const) {
        await page.goto(expectation.route);
        const sectionStyles = await page
          .locator(expectation.section)
          .first()
          .evaluate((element) => getComputedStyle(element));
        const headingStyles = await page
          .locator(expectation.heading)
          .first()
          .evaluate((element) => getComputedStyle(element));
        assert.equal(sectionStyles.paddingTop, viewport.expectedPadding);
        assert.equal(sectionStyles.paddingBottom, viewport.expectedPadding);
        assert.equal(headingStyles.marginBottom, viewport.expectedHeadingGap);
      }
    }
  },
);

Then(
  'available division hero images crop consistently while missing images use one neutral fallback',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of divisionHeroMediaSamples) {
      await page.goto(sample.route);
      const media = page.locator('[data-division-hero-media="true"]');
      if (sample.state === 'available') {
        const image = media.locator('img');
        await expect(image).toHaveCount(1);
        await expect(image).toHaveCSS('object-fit', 'cover');
        const mediaBox = await media.boundingBox();
        const imageBox = await image.boundingBox();
        assert.ok(mediaBox);
        assert.ok(imageBox);
        assert.ok(Math.abs(mediaBox.width - imageBox.width) <= 2);
        assert.ok(Math.abs(mediaBox.height - imageBox.height) <= 2);
      } else {
        await expect(media.locator('img')).toHaveCount(0);
        const fallback = media.locator('.division-hero-media-placeholder');
        await expect(fallback).toBeVisible();
        await expect(fallback).toContainText('Photo coming soon');
        await expect(fallback).not.toContainText('media/');
      }
    }
  },
);

Then(
  'division hero media remains visible at desktop width and yields to the content below {int} pixels',
  async function (this: FrontendWorld, breakpoint: number) {
    const page = this.currentPage();
    for (const sample of divisionHeroMediaSamples) {
      await page.setViewportSize({ width: breakpoint, height: 1100 });
      await page.goto(sample.route);
      await expect(page.locator('[data-division-hero-media="true"]')).toBeVisible();
      await page.setViewportSize({ width: breakpoint - 1, height: 1100 });
      await expect(page.locator('[data-division-hero-media="true"]')).toBeHidden();
    }
  },
);
Then(
  'the Home resume form validates locally without creating a CMS entity',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    let entityMutationCount = 0;
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/'))
        entityMutationCount += 1;
    });
    await page.getByRole('button', { name: 'Submit Resume' }).click();
    await expect(page.getByText('Please enter your name.')).toBeVisible();
    await expect(page.getByText('Please enter your email.')).toBeVisible();
    await expect(page.getByText('Please select a division.')).toBeVisible();
    await expect(page.getByText('Please attach your resume.')).toBeVisible();
    assert.equal(entityMutationCount, 0);
  },
);

Then(
  'the Property Management page presents every mounted section in its intended order',
  async function (this: FrontendWorld) {
    const expectedHeadings = [
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
    ];
    const positions: number[] = [];
    for (const heading of expectedHeadings) {
      const locator = this.currentPage().getByRole('heading', { name: heading, exact: true });
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      assert.ok(box);
      positions.push(box.y + (await this.currentPage().evaluate(() => window.scrollY)));
    }
    assert.deepEqual(
      positions,
      [...positions].sort((left, right) => left - right),
    );
  },
);
Then(
  'all {int} Property Management entities have an editable visual boundary',
  async function (this: FrontendWorld, count: number) {
    await expect(
      this.currentPage().locator('[data-property-management-entity-boundary="true"]'),
    ).toHaveCount(count);
  },
);
Then(
  'the Property Management hero presents an accessible primary and secondary action hierarchy',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const primary = page.locator('.pm-hero .pm-actions a').nth(0);
    const secondary = page.locator('.pm-hero .pm-actions a').nth(1);
    await expect(primary).toHaveAttribute('href', '#contact');
    await expect(secondary).toHaveAttribute('href', '#services');
    await expect(primary).toHaveCSS('background-color', 'rgb(134, 98, 45)');
    await expect(primary).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(secondary).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(secondary).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(secondary).toHaveCSS('border-color', 'rgba(255, 255, 255, 0.3)');

    await primary.hover();
    await expect(primary).toHaveCSS('background-color', 'rgb(134, 98, 45)');
    await secondary.hover();
    await expect(secondary).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.1)');
    await primary.focus();
    await expect(primary).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
    await expect(primary).toHaveCSS('outline-style', 'solid');
  },
);
Then(
  'the Property Management hero actions stack at full content width on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/property-management');
    const actions = page.locator('.pm-hero .pm-actions a');
    const heroBox = await page.locator('.pm-hero').boundingBox();
    const primaryBox = await actions.nth(0).boundingBox();
    const secondaryBox = await actions.nth(1).boundingBox();
    assert.ok(heroBox);
    assert.ok(primaryBox);
    assert.ok(secondaryBox);
    assert.equal(heroBox.height, 844);
    assert.equal(primaryBox.x, 16);
    assert.equal(secondaryBox.x, 16);
    assert.equal(primaryBox.width, 358);
    assert.equal(secondaryBox.width, 358);
    assert.ok(primaryBox.height >= 43 && primaryBox.height <= 45);
    assert.ok(secondaryBox.height >= 43 && secondaryBox.height <= 45);
    assert.ok(secondaryBox.y >= primaryBox.y + primaryBox.height + 11);
    assert.ok(secondaryBox.y <= primaryBox.y + primaryBox.height + 13);
  },
);
Then(
  'Property Management cards and team portraits retain the intended responsive geometry',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    await page.goto('/property-management');
    const desktopPortraits = page.locator('.pm-team [data-profile-media-state="available"] img');
    await expect(desktopPortraits).toHaveCount(2);
    for (const portrait of await desktopPortraits.all()) {
      const box = await portrait.boundingBox();
      assert.ok(box);
      assert.ok(box.width >= 429 && box.width <= 431);
      assert.equal(box.height, box.width);
      await expect(portrait).toHaveCSS('object-fit', 'cover');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const mobileServiceCardContentWidth = await page
      .locator('#services .pm-card')
      .first()
      .evaluate((element) => element.clientWidth);
    assert.ok(mobileServiceCardContentWidth >= 355 && mobileServiceCardContentWidth <= 357);
    const mobilePortraits = page.locator('.pm-team [data-profile-media-state="available"] img');
    for (const portrait of await mobilePortraits.all()) {
      const box = await portrait.boundingBox();
      assert.ok(box);
      assert.ok(box.width >= 355 && box.width <= 357);
      assert.equal(box.height, box.width);
    }
  },
);
Then(
  'Real Estate services team and testimonials use centered three-column desktop grids',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    await page.reload();

    const assertThreeColumnGeometry = async (
      collectionSelector: string,
      cardSelector: string,
      expectedCount: number,
      expectedMinimumWidth: number,
      expectedMaximumWidth: number,
    ): Promise<void> => {
      const collection = page.locator(collectionSelector).first();
      const items = collection.locator(':scope > div > .editable-collection-items');
      const collectionBox = await collection.boundingBox();
      const itemsBox = await items.boundingBox();
      assert.ok(collectionBox);
      assert.ok(itemsBox);
      assert.ok(collectionBox.width >= expectedMinimumWidth);
      assert.ok(collectionBox.width <= expectedMaximumWidth);
      assert.ok(Math.abs(itemsBox.x - collectionBox.x) <= 1);
      assert.ok(Math.abs(itemsBox.width - collectionBox.width) <= 1);

      const cards = items.locator(cardSelector);
      await expect(cards).toHaveCount(expectedCount);
      const boxes = await Promise.all(
        (await cards.all()).map(async (card) => {
          const box = await card.boundingBox();
          assert.ok(box);
          return box;
        }),
      );
      assert.ok(boxes.every((box) => box.width >= expectedMinimumWidth / 3 - 25));
      const [first, second, third] = boxes;
      assert.ok(first);
      assert.ok(second);
      assert.ok(third);
      assert.ok(second.x > first.x + first.width);
      assert.ok(third.x > second.x + second.width);
    };

    await assertThreeColumnGeometry('.re-service-grid', '.re-card', 5, 1392, 1394);
    await assertThreeColumnGeometry('.re-person-grid', '[data-profile-card="true"]', 3, 1151, 1153);
    await assertThreeColumnGeometry('.re-testimonial-grid', '.re-card', 3, 1392, 1394);
  },
);
Then(
  'entering edit mode preserves the Real Estate card grid geometry',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await page.goto('/real-estate');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();

    for (const selector of ['.re-service-grid', '.re-person-grid', '.re-testimonial-grid']) {
      const collection = page.locator(selector).first();
      const items = collection.locator(
        ':scope > .editable-collection > .editable-collection-items',
      );
      const collectionBox = await collection.boundingBox();
      const itemsBox = await items.boundingBox();
      assert.ok(collectionBox);
      assert.ok(itemsBox);
      assert.ok(Math.abs(itemsBox.x - collectionBox.x) <= 1);
      assert.ok(Math.abs(itemsBox.width - collectionBox.width) <= 1);
    }
  },
);
Then(
  'the Property Management hero uses the approved neutral unavailable-image treatment',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const heroMedia = page.locator('.pm-hero-image');
    await expect(heroMedia.locator('[data-neutral-placeholder="true"]')).toBeVisible();
    await expect(heroMedia.locator('img')).toHaveCount(0);
    await expect(heroMedia).not.toContainText('media/seed/');
  },
);
Then(
  'supplied Property Management portfolio images load while unavailable images use the neutral placeholder',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const images = page.locator('.pm-property-card img');
    await expect(images).toHaveCount(10);
    for (const image of await images.all()) {
      await expect(image).toBeVisible();
      assert.ok(
        (await image.evaluate((element) =>
          element instanceof HTMLImageElement ? element.naturalWidth : 0,
        )) > 0,
      );
      assert.ok(
        (await image.evaluate((element) =>
          element instanceof HTMLImageElement ? element.naturalHeight : 0,
        )) > 0,
      );
    }
    await expect(page.locator('.pm-property-card [data-neutral-placeholder="true"]')).toHaveCount(
      2,
    );
  },
);
Then(
  'the Property Management client-only forms validate locally without creating CMS entities',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    let entityMutationCount = 0;
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/')) {
        entityMutationCount += 1;
      }
    });
    await page.getByRole('button', { name: 'Submit Inquiry', exact: true }).click();
    await expect(page.getByText('Enter full name.')).toBeVisible();
    await expect(page.getByText('Enter email.').first()).toBeVisible();
    await expect(page.getByText('Enter area of interest.')).toBeVisible();
    await page.getByRole('button', { name: 'Get Free Analysis', exact: true }).last().click();
    await expect(page.getByText('Enter first name.')).toBeVisible();
    await expect(page.getByText('Enter last name.')).toBeVisible();
    await expect(page.getByText('Enter phone.')).toBeVisible();
    assert.equal(entityMutationCount, 0);
  },
);
Then(
  'the Property Management contact details use labeled icon rows and remain visible after anchor navigation',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
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

    for (const viewport of [
      { width: 1425, height: 1100 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/property-management');
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
  },
);
Then(
  'the Property Management license decoration has no visible or accessible text fallback',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const licenseRow = page.locator('.pm-contact-detail').filter({
      has: page.getByRole('heading', { name: 'Licenses', exact: true }),
    });
    await expect(licenseRow.getByText('LIC', { exact: true })).toHaveCount(0);
    await expect(
      licenseRow.locator('.pm-contact-license-icon[aria-hidden="true"] svg'),
    ).toHaveCount(1);
  },
);

Then(
  'Storage presents facility management for owners rather than consumer unit shopping',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await expect(
      page.getByRole('heading', { name: 'Maximize Your Storage Facility Profitability' }),
    ).toBeVisible();
    await expect(page.getByText(/choose your unit|rent a unit/i)).toHaveCount(0);
  },
);
Then(
  'all 18 Storage entities have an editable visual boundary',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().locator('[data-storage-entity-boundary="true"]')).toHaveCount(
      18,
    );
  },
);
Then(
  'the Storage hero, services, team, Our Why, reviews, contact, and footer render in order',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const selectors = [
      '.storage-hero',
      '#services',
      '#team',
      '#about',
      '#reviews',
      '#contact',
      '.storage-footer',
    ];
    const positions: number[] = [];
    for (const selector of selectors) {
      await expect(page.locator(selector)).toBeVisible();
      positions.push(
        await page
          .locator(selector)
          .evaluate((element) => (element instanceof HTMLElement ? element.offsetTop : -1)),
      );
    }
    assert.deepEqual(
      positions,
      [...positions].sort((left, right) => left - right),
    );
  },
);
Then(
  'the Storage contact form validates locally without creating a CMS entity',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    let mutations = 0;
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/')) mutations += 1;
    });
    await page.getByRole('button', { name: 'Get Started' }).click();
    assert.equal(
      await page
        .locator('input[name="firstName"]')
        .evaluate((element) => element instanceof HTMLInputElement && !element.checkValidity()),
      true,
    );
    assert.equal(mutations, 0);
  },
);
Then(
  'Storage navigation remains usable at desktop and mobile widths',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('navigation', { name: 'Mobile storage navigation' })).toBeVisible();
  },
);

Then(
  'the dedicated {string} composition renders with {int} editable entity boundaries',
  async function (this: FrontendWorld, division: string, entityCount: number) {
    const page = this.currentPage();
    const expectations: Readonly<
      Record<
        string,
        {
          readonly selector: string;
          readonly heading: string;
          readonly sections: readonly string[];
        }
      >
    > = {
      'Real Estate': {
        selector: '[data-real-estate-entity-boundary="true"]',
        heading: 'Commercial Real Estate & Land Experts',
        sections: ['#listings', '#services', '#process', '#about', '#team', '#faq', '#contact'],
      },
      Construction: {
        selector: '[data-entity-boundary="true"]',
        heading: 'Building The Future',
        sections: ['#services', '#projects', '#plan-room', '#team', '#about', '#bid', '#contact'],
      },
      Development: {
        selector: '[data-development-entity-boundary="true"]',
        heading: 'Transforming Vision Into Reality',
        sections: ['#services', '#projects', '#team', '#about', '#reviews', '#contact'],
      },
    };
    const expectation = expectations[division];
    assert.ok(expectation, `Unexpected dedicated division ${division}`);
    await expect(
      page.getByRole('heading', { name: expectation.heading, exact: true }),
    ).toBeVisible();
    await expect(page.locator(expectation.selector)).toHaveCount(entityCount);
    for (const selector of expectation.sections) await expect(page.locator(selector)).toBeVisible();
  },
);

interface CollectionGridExpectation {
  readonly container: string;
  readonly items: string;
  readonly columns: number;
  readonly index?: number;
}

const constructionCollectionGrids: readonly CollectionGridExpectation[] = [
  {
    container: '.co-card-grid',
    items: '.co-card-grid .editable-collection-items',
    columns: 3,
  },
  {
    container: '.co-plan-grid',
    items: '.co-plan-grid .editable-collection-items',
    columns: 2,
  },
  {
    container: '.co-card-grid',
    items: '.co-card-grid .editable-collection-items',
    columns: 3,
    index: 1,
  },
  {
    container: '.co-review-grid',
    items: '.co-review-grid .editable-collection-items',
    columns: 3,
  },
];

async function expectCollectionGridGeometry(
  page: Page,
  expectation: CollectionGridExpectation,
): Promise<void> {
  const index = expectation.index ?? 0;
  const container = page.locator(expectation.container).nth(index);
  const items = page.locator(expectation.items).nth(index);
  await expect(container).toBeVisible();
  await expect(items).toBeVisible();
  const containerBox = await container.boundingBox();
  const itemsBox = await items.boundingBox();
  assert.ok(containerBox);
  assert.ok(itemsBox);
  const columns = await items.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
  );
  assert.ok(
    Math.abs(itemsBox.x - containerBox.x) <= 1,
    `${expectation.items} must align with its collection container`,
  );
  assert.ok(
    Math.abs(itemsBox.width - containerBox.width) <= 1,
    `${expectation.items} must fill its ${String(containerBox.width)}px collection container; received ${String(itemsBox.width)}px`,
  );
  assert.equal(columns, expectation.columns);
}

async function expectAllConstructionCollectionGrids(page: Page): Promise<void> {
  for (const expectation of constructionCollectionGrids)
    await expectCollectionGridGeometry(page, expectation);
}

Then(
  'Construction services plans pros and reviews fill their centered desktop grids',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const width of [1425, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      await expectAllConstructionCollectionGrids(page);
    }
  },
);

Then(
  'Construction collection grids retain their responsive column templates',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const breakpoint of [
      { width: 1023, columns: [2, 2, 2, 3] },
      { width: 767, columns: [1, 1, 1, 1] },
    ]) {
      await page.setViewportSize({ width: breakpoint.width, height: 1100 });
      for (const [index, expectation] of constructionCollectionGrids.entries()) {
        const expectedColumns = breakpoint.columns[index];
        assert.ok(expectedColumns !== undefined);
        await expectCollectionGridGeometry(page, { ...expectation, columns: expectedColumns });
      }
    }
  },
);

Then(
  'entering edit mode preserves the Construction collection grid geometry',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await page.goto('/construction');
    const preview = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/v1/pages/construction/preview'),
    );
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await preview;
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    for (const width of [1425, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      await expectAllConstructionCollectionGrids(page);
    }
  },
);

Then(
  'shared collection sizing preserves Real Estate and Property Management service grids',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/real-estate');
    await expectCollectionGridGeometry(page, {
      container: '.re-service-grid',
      items: '.re-service-grid .editable-collection-items',
      columns: 3,
    });
    await page.goto('/property-management');
    const propertyServices = page.locator('#services .editable-collection-items');
    await expect(propertyServices).toBeVisible();
    const propertyBox = await propertyServices.boundingBox();
    assert.ok(propertyBox);
    assert.ok(propertyBox.width >= 1300);
    assert.ok(Math.abs(propertyBox.x + propertyBox.width / 2 - 720) <= 1);
    assert.equal(
      await propertyServices.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
      ),
      3,
    );
  },
);

Then(
  'the Real Estate listing gallery is centered and constrained at desktop width',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    const gallery = page.locator('.re-listings-gallery');
    const items = gallery.locator('.editable-collection-items');
    await expect(gallery).toBeVisible();
    await expect(items).toBeVisible();
    const galleryBox = await gallery.boundingBox();
    const itemsBox = await items.boundingBox();
    assert.ok(galleryBox);
    assert.ok(itemsBox);
    assert.ok(galleryBox.width >= 960 && galleryBox.width <= 1152);
    assert.ok(Math.abs(galleryBox.x + galleryBox.width / 2 - 720) <= 1);
    assert.ok(Math.abs(itemsBox.x - galleryBox.x) <= 1);
    assert.ok(Math.abs(itemsBox.width - galleryBox.width) <= 1);
    assert.equal(
      await items.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
      ),
      3,
    );
  },
);

Then(
  'listing cards preserve their intended image ratio at desktop and mobile widths',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const viewport of [
      { width: 1440, height: 1100 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const photo = page.locator('.re-listing-photo').first();
      await expect(photo).toBeVisible();
      const box = await photo.boundingBox();
      assert.ok(box);
      assert.ok(Math.abs(box.width / box.height - 4 / 3) <= 0.02);
    }
  },
);

Then(
  'listing tabs show the active and sold counts in a light segmented control',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const tabs = page.getByRole('tablist', { name: 'Property listing status' });
    await expect(tabs.getByRole('tab', { name: 'Active Listings (5)', exact: true })).toBeVisible();
    await expect(tabs.getByRole('tab', { name: 'Sold (5)', exact: true })).toBeVisible();
    const presentation = await tabs.evaluate((element) => {
      const selected = element.querySelector('[role="tab"][aria-selected="true"]');
      if (!(selected instanceof HTMLElement)) throw new Error('Selected listing tab is missing.');
      return {
        width: element.getBoundingClientRect().width,
        background: getComputedStyle(element).backgroundColor,
        selectedBackground: getComputedStyle(selected).backgroundColor,
        selectedColor: getComputedStyle(selected).color,
      };
    });
    assert.ok(presentation.width < 400);
    assert.equal(presentation.background, 'rgb(243, 244, 246)');
    assert.equal(presentation.selectedBackground, 'rgb(255, 255, 255)');
    assert.equal(presentation.selectedColor, 'rgb(0, 18, 138)');
  },
);

Then(
  'each available external listing action remains accessible but visually subordinate',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const actions = page.locator('.re-listing-action');
    await expect(actions).toHaveCount(5);
    for (const action of await actions.all()) {
      await expect(action).toHaveAttribute('target', '_blank');
      await expect(action).toHaveAttribute('rel', 'noreferrer');
      const presentation = await action.evaluate((element) => ({
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        background: getComputedStyle(element).backgroundColor,
      }));
      assert.ok(presentation.fontSize <= 14);
      assert.equal(presentation.background, 'rgba(0, 0, 0, 0)');
    }
  },
);

Given('a construction project category has no published projects', function () {});
When('I open that project category', async function (this: FrontendWorld) {
  await this.currentPage().goto('/construction/current/multi-family');
});
Then('I see an empty state', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('heading', {
      name: 'No projects are published in this category.',
    }),
  ).toBeVisible();
});
Then('fabricated project cards are not shown', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByText('Address coming soon')).toHaveCount(0);
  await expect(this.currentPage().getByText('Owner TBD')).toHaveCount(0);
});

Given(
  'I am signed in and editing a component with a semantic contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/login');
    await page.getByLabel('Email').fill(editorEmail);
    await page.getByLabel('Password').fill(editorPassword);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/$/);
    await discardPendingOwnedByCurrentUser(page, 'home.hero');
    this.cleanup.push({ page, entityId: 'home.hero' });
    const previewResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/v1/pages/home/preview'),
    );
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await previewResponse;
    const heading = page.getByRole('heading', { level: 1 });
    this.originalHeading = await heading.innerText();
    await heading.hover();
  },
);
When("I open that component's edit control", async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Edit Opening message' }).click();
});
Then('a friendly labeled form opens beside the page', async function (this: FrontendWorld) {
  const dialog = this.currentPage().getByRole('dialog', { name: 'Opening message' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Main heading')).toBeVisible();
  await expect(dialog.getByLabel('Introduction')).toBeVisible();
  const box = await dialog.boundingBox();
  assert.ok(box);
  assert.ok(box.x > 0);
});
Then('no technical content representation is shown', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await expect(page.getByText('Complete entity JSON')).toHaveCount(0);
  await expect(page.getByText('home.hero', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/revision \d+/i)).toHaveCount(0);
  await expect(page.locator('pre, code')).toHaveCount(0);
});
When('I change a field and cancel', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByLabel('Main heading').fill('This draft must not appear');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Cancel' }).click();
});
Then('the saved preview remains unchanged', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('heading', { level: 1 })).toHaveText(
    this.originalHeading,
  );
});
When('I change a field and save', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('heading', { level: 1 }).hover();
  await page.getByRole('button', { name: 'Edit Opening message' }).click();
  this.editedHeading = `Friendly editor ${String(Date.now())}`;
  await page.getByLabel('Main heading').fill(this.editedHeading);
  await page.getByRole('button', { name: 'Save changes' }).click();
});
Then('the validated value appears in my private preview', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('heading', { level: 1 })).toHaveText(
    this.editedHeading,
  );
});

async function enterPropertyManagementEditMode(page: Page): Promise<void> {
  await loginEditor(page);
  await page.goto('/property-management');
  const preview = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/api/v1/pages/property-management/preview'),
  );
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  await preview;
  await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
}

Given(
  'I am signed in and editing Property Management on desktop',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await enterPropertyManagementEditMode(page);
    await discardPendingOwnedByCurrentUser(
      page,
      'property-management.header',
      'property-management',
    );
    await discardPendingOwnedByCurrentUser(page, 'property-management.hero', 'property-management');
    this.cleanup.push(
      { page, entityId: 'property-management.header', pageId: 'property-management' },
      { page, entityId: 'property-management.hero', pageId: 'property-management' },
    );
    this.propertyHeaderLabel = (await page.locator('.pm-brand strong').textContent()) ?? '';
    this.propertyHeroHeading = await page.getByRole('heading', { level: 1 }).innerText();
  },
);

Given(
  'I am signed in and editing Property Management on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await enterPropertyManagementEditMode(page);
    await discardPendingOwnedByCurrentUser(page, 'property-management.hero', 'property-management');
    this.cleanup.push({
      page,
      entityId: 'property-management.hero',
      pageId: 'property-management',
    });
    this.propertyHeaderLabel = (await page.locator('.pm-brand strong').textContent()) ?? '';
    this.propertyHeroHeading = await page.getByRole('heading', { level: 1 }).innerText();
  },
);

When('I open the Page header editor', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.locator('.pm-header').hover();
  await page.getByRole('button', { name: 'Edit Page header' }).click();
});

When('I open the Opening section editor', async function (this: FrontendWorld) {
  const page = this.currentPage();
  if ((page.viewportSize()?.width ?? 0) > 800) await page.locator('.pm-hero').hover();
  await page.getByRole('button', { name: 'Edit Opening section' }).click();
});

Then(
  'the Page header friendly form opens without technical representations',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const dialog = page.getByRole('dialog', { name: 'Page header' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Division label')).toBeVisible();
    await expect(dialog.getByLabel('Phone')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add navigation link' })).toBeVisible();
    await expect(page.locator('pre, code')).toHaveCount(0);
    await expect(page.getByText('property-management.header', { exact: true })).toHaveCount(0);
  },
);

Then(
  'the Opening section friendly form opens without technical representations',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const dialog = page.getByRole('dialog', { name: 'Opening section' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Main heading')).toBeVisible();
    await expect(dialog.getByLabel('Introduction')).toBeVisible();
    await expect(page.locator('pre, code')).toHaveCount(0);
    await expect(page.getByText('property-management.hero', { exact: true })).toHaveCount(0);
  },
);

Then(
  'the Opening section friendly form fills the mobile viewport',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const dialog = page.getByRole('dialog', { name: 'Opening section' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    assert.ok(box);
    assert.equal(box.x, 0);
    assert.equal(box.width, 390);
    await expect(dialog.getByLabel('Main heading')).toBeVisible();
  },
);

const remainingDivisionTargets: Readonly<
  Record<string, { readonly route: string; readonly pageId: string; readonly entityId: string }>
> = {
  'Real Estate': {
    route: '/real-estate',
    pageId: 'real-estate',
    entityId: 'real-estate.hero',
  },
  Construction: {
    route: '/construction',
    pageId: 'construction',
    entityId: 'construction.hero',
  },
  Storage: {
    route: '/storage',
    pageId: 'storage',
    entityId: 'storage.hero',
  },
  Development: {
    route: '/development',
    pageId: 'development',
    entityId: 'development.hero',
  },
};

Given(
  'I am signed in and editing the {string} division',
  async function (this: FrontendWorld, division: string) {
    const target = remainingDivisionTargets[division];
    assert.ok(target, `Unknown remaining division: ${division}`);
    const page = this.currentPage();
    await loginEditor(page);
    await discardPendingOwnedByCurrentUser(page, target.entityId, target.pageId);
    await page.goto(target.route);
    const preview = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes(`/api/v1/pages/${target.pageId}/preview`),
    );
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await preview;
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    this.remainingDivisionEntityId = target.entityId;
    this.remainingDivisionPageId = target.pageId;
    this.cleanup.push({ page, entityId: target.entityId, pageId: target.pageId });
  },
);

When(
  'I open the {string} editor from its visible section',
  async function (this: FrontendWorld, editor: string) {
    const page = this.currentPage();
    await page.getByRole('heading', { level: 1 }).hover();
    await page.getByRole('button', { name: `Edit ${editor}`, exact: true }).click();
    await expect(page.getByRole('dialog', { name: editor })).toBeVisible();
    this.remainingDivisionEditor = editor;
  },
);

Then(
  'the {string} friendly field is shown without technical representations',
  async function (this: FrontendWorld, field: string) {
    const page = this.currentPage();
    const dialog = page.getByRole('dialog', { name: this.remainingDivisionEditor });
    await expect(dialog.getByRole('textbox', { name: field, exact: true })).toBeVisible();
    await expect(page.locator('pre, code')).toHaveCount(0);
    await expect(page.getByText(this.remainingDivisionEntityId, { exact: true })).toHaveCount(0);
    await expect(dialog.getByText(/revision\s+\d+/i)).toHaveCount(0);
  },
);

When(
  'I save a new value in the {string} friendly field',
  async function (this: FrontendWorld, field: string) {
    const page = this.currentPage();
    this.remainingDivisionValue = `Friendly ${this.remainingDivisionPageId} ${String(Date.now())}`;
    const dialog = page.getByRole('dialog', { name: this.remainingDivisionEditor });
    await dialog
      .getByRole('textbox', { name: field, exact: true })
      .fill(this.remainingDivisionValue);
    await dialog.getByRole('button', { name: 'Save changes' }).click();
  },
);

Then(
  'the saved remaining-division value appears in my private preview',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().getByRole('heading', { level: 1 })).toContainText(
      this.remainingDivisionValue,
    );
  },
);

Then(
  'I can cancel the Page header editor without changing the page',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page
      .getByRole('dialog', { name: 'Page header' })
      .getByLabel('Division label')
      .fill('Unsaved division label');
    page.once('dialog', (confirmation) => void confirmation.accept());
    await page
      .getByRole('dialog', { name: 'Page header' })
      .getByRole('button', { name: 'Cancel' })
      .click();
    await expect(page.locator('.pm-brand strong')).toHaveText(this.propertyHeaderLabel);
  },
);

Then(
  'I can cancel the Opening section editor without changing the page',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page
      .getByRole('dialog', { name: 'Opening section' })
      .getByLabel('Main heading')
      .fill('Unsaved opening heading');
    page.once('dialog', (confirmation) => void confirmation.accept());
    await page
      .getByRole('dialog', { name: 'Opening section' })
      .getByRole('button', { name: 'Cancel' })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(this.propertyHeroHeading);
  },
);

When('I reopen and save a friendly Page header change', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.locator('.pm-header').hover();
  await page.getByRole('button', { name: 'Edit Page header' }).click();
  const dialog = page.getByRole('dialog', { name: 'Page header' });
  this.propertyEditedHeaderLabel = `Property Management ${String(Date.now())}`;
  await dialog.getByLabel('Division label').fill(this.propertyEditedHeaderLabel);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
});

Then(
  'the saved Page header value appears in my private preview',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().locator('.pm-brand strong')).toHaveText(
      this.propertyEditedHeaderLabel,
    );
  },
);

When('I reopen and save a friendly Opening section change', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.locator('.pm-hero').hover();
  await page.getByRole('button', { name: 'Edit Opening section' }).click();
  const dialog = page.getByRole('dialog', { name: 'Opening section' });
  this.propertyEditedHeroHeading = `Friendly opening ${String(Date.now())}`;
  await dialog.getByLabel('Main heading').fill(this.propertyEditedHeroHeading);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
});

Then(
  'the saved Opening section value appears in my private preview',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().getByRole('heading', { level: 1 })).toHaveText(
      this.propertyEditedHeroHeading,
    );
  },
);

Given(
  'I am signed in and editing a Home collection with UUID-backed items',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await discardPendingOwnedByCurrentUser(page, 'home.core-values.items');
    this.cleanup.push({ page, entityId: 'home.core-values.items' });
    await enterHomeEditMode(page);
    const value = homeCoreValuesItemsSchema.parse(
      (
        (await (await page.request.get('/api/v1/pages/home/preview')).json()) as Record<
          string,
          unknown
        >
      )['home.core-values.items'] ?? homeV2SeedData['home.core-values.items'],
    );
    this.originalItemIds = value.map(({ id }) => id);
  },
);

Given('I own a pending Home collection reorder', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const entityId = 'home.core-values.items';
  await loginEditor(page);
  await discardPendingOwnedByCurrentUser(page, entityId);
  this.cleanup.push({ page, entityId });
  await enterHomeEditMode(page);
  const value = homeCoreValuesItemsSchema.parse(
    (
      (await (await page.request.get('/api/v1/pages/home/preview')).json()) as Record<
        string,
        unknown
      >
    )[entityId] ?? homeV2SeedData[entityId],
  );
  const first = value[0];
  assert.ok(first !== undefined);
  this.originalItemIds = value.map(({ id }) => id);
  this.reorderedItemLabel = first.title;
  const item = page
    .getByRole('heading', { name: first.title, exact: true })
    .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
  await item.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await item.hover();
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes(`/api/v1/entities/${entityId}/changes`),
  );
  await item.getByRole('button', { name: `Move ${first.title} down` }).click();
  assert.equal((await saved).status(), 201);
  assert.ok(await pendingFor(page, entityId));
});

Given('that reorder is hidden from my persisted preview', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const entityId = 'home.core-values.items';
  const response = await page.request.put(
    `/api/v1/preview/disabled/${encodeURIComponent(entityId)}`,
    { headers: await csrfHeaders(page) },
  );
  assert.equal(response.status(), 204);
  const preferences = await page.request.get('/api/v1/preview/preferences');
  assert.equal(preferences.status(), 200);
  assert.ok(
    previewPreferencesResponseSchema
      .parse(await preferences.json())
      .disabledEntityIds.includes(entityId),
  );
});

When(
  'I save the collection in its original published order at the expected revision',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const entityId = 'home.core-values.items';
    const item = page
      .getByRole('heading', { name: this.reorderedItemLabel, exact: true })
      .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
    await item.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await item.hover();
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(`/api/v1/entities/${entityId}/changes`),
    );
    await item.getByRole('button', { name: `Move ${this.reorderedItemLabel} up` }).click();
    const response = await saved;
    assert.ok(response.status() === 200 || response.status() === 204);
  },
);

Then('the JSON-equivalent pending change is removed', async function (this: FrontendWorld) {
  const page = this.currentPage();
  assert.equal(await pendingFor(page, 'home.core-values.items'), undefined);
  await expect(page.locator('.home-values .collection-pending')).toHaveCount(0);
});

Then('its persisted preview exclusion is removed', async function (this: FrontendWorld) {
  const preferences = await this.currentPage().request.get('/api/v1/preview/preferences');
  assert.equal(preferences.status(), 200);
  assert.equal(
    previewPreferencesResponseSchema
      .parse(await preferences.json())
      .disabledEntityIds.includes('home.core-values.items'),
    false,
  );
});

Then('the published collection remains unchanged', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const publicPage = (await (await page.request.get('/api/v1/pages/home')).json()) as Record<
    string,
    unknown
  >;
  const published = homeCoreValuesItemsSchema.parse(publicPage['home.core-values.items']);
  assert.deepEqual(
    published.map(({ id }) => id),
    this.originalItemIds,
  );
});
When('I add and edit an item with friendly fields', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('button', { name: '+ Add core value' }).click();
  const addSheet = page.getByRole('dialog', { name: 'Add core value' });
  await addSheet.getByLabel('Value name').fill('Browser-added value');
  await addSheet.getByLabel('Description').fill('Added through the friendly collection form.');
  await addSheet.getByRole('radio', { name: 'Heart' }).check();
  await addSheet.getByRole('button', { name: 'Save changes' }).click();
  const addedHeading = page.getByRole('heading', { name: 'Browser-added value' });
  await expect(addedHeading).toBeVisible();
  const addedItem = addedHeading.locator('xpath=ancestor::div[contains(@class,"editable-item")]');
  await addedItem.hover();
  await addedItem.getByRole('button', { name: 'Edit Browser-added value' }).click();
  const editSheet = page.getByRole('dialog', { name: 'Edit Browser-added value' });
  await editSheet.getByLabel('Value name').fill('Browser-edited value');
  await editSheet.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Browser-edited value' })).toBeVisible();
  const pending = await pendingFor(page, 'home.core-values.items');
  assert.ok(pending);
  const list = homeCoreValuesItemsSchema.parse(pending.replacementValue);
  const added = list.find(({ title }) => title === 'Browser-edited value');
  assert.ok(added);
  this.addedItemId = added.id;
  this.collectionValue = list;
});
When('I reorder it with keyboard controls', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const item = page
    .getByRole('heading', { name: 'Browser-edited value' })
    .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
  await item.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await item.hover();
  const response = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === 'PUT' &&
      candidate.url().includes('/api/v1/entities/home.core-values.items/changes'),
  );
  const preview = page.waitForResponse((candidate) =>
    candidate.url().includes('/api/v1/pages/home/preview'),
  );
  await item.getByRole('button', { name: 'Move Browser-edited value up' }).focus();
  await page.keyboard.press('Enter');
  assert.equal((await response).status(), 200);
  assert.equal((await preview).status(), 200);
  await expect(page.getByRole('status').filter({ hasText: 'Order updated.' })).toBeVisible();
});
When('I delete and undo the deletion', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const item = page
    .getByRole('heading', { name: 'Browser-edited value' })
    .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
  await item.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await item.hover();
  page.once('dialog', async (dialog) => dialog.accept());
  const deletion = page
    .waitForResponse(
      (candidate) =>
        candidate.request().method() === 'PUT' &&
        candidate.url().includes('/api/v1/entities/home.core-values.items/changes'),
      { timeout: 5_000 },
    )
    .catch(() => undefined);
  const deleteButton = item.getByRole('button', { name: 'Delete Browser-edited value' });
  assert.equal(await deleteButton.isEnabled(), true, 'Delete remained disabled after reorder.');
  await deleteButton.click();
  const deletionResponse = await deletion;
  const operationErrors = await page.locator('.home-values .editor-error').allTextContents();
  assert.equal(deletionResponse?.status(), 204, operationErrors.join(' '));
  assert.equal(await pendingFor(page, 'home.core-values.items'), undefined);
  await expect(
    page.getByRole('status').filter({ hasText: 'Browser-edited value deleted.' }),
  ).toBeVisible();
  const undo = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === 'POST' &&
      candidate.url().includes('/api/v1/entities/home.core-values.items/changes'),
  );
  const undoPreview = page.waitForResponse((candidate) =>
    candidate.url().includes('/api/v1/pages/home/preview'),
  );
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal((await undo).status(), 201);
  assert.equal((await undoPreview).status(), 200);
  await expect(page.getByRole('heading', { name: 'Browser-edited value' })).toBeVisible();
  const pending = await pendingFor(page, 'home.core-values.items');
  assert.ok(pending);
  const list = homeCoreValuesItemsSchema.parse(pending.replacementValue);
  this.finalItemIds = list.map(({ id }) => id);
  this.collectionValue = list;
});
Then('retained items keep their UUIDs', function (this: FrontendWorld) {
  for (const id of this.originalItemIds) assert.ok(this.finalItemIds.includes(id));
});
Then('new items receive UUIDs', function (this: FrontendWorld) {
  assert.match(
    this.addedItemId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.equal(this.originalItemIds.includes(this.addedItemId), false);
  assert.ok(this.finalItemIds.includes(this.addedItemId));
});
Then('the complete replacement list passes its registered schema', function (this: FrontendWorld) {
  assert.equal(homeCoreValuesItemsSchema.safeParse(this.collectionValue).success, true);
});
Then('no item UUID is shown to me', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByText(this.addedItemId, { exact: true })).toHaveCount(0);
  assert.equal(
    (await this.currentPage().locator('body').innerText()).includes(this.addedItemId),
    false,
  );
});

Given(
  'I am signed in and previewing an empty Home collection',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await discardPendingOwnedByCurrentUser(page, 'home.careers.open-positions');
    this.cleanup.push({ page, entityId: 'home.careers.open-positions' });
    await saveReplacement(page, 'home.careers.open-positions', []);
    await enterHomeEditMode(page);
    await expect(page.locator('.home-careers .editable-item')).toHaveCount(0);
  },
);
When('I use its add control and save the first item', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('button', { name: '+ Add position' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add position' });
  this.noviceValue = `First browser position ${String(Date.now())}`;
  await sheet.getByLabel('Position title').fill(this.noviceValue);
  await sheet.getByLabel('Division').selectOption('Construction');
  await sheet.getByLabel('Employment type').selectOption('Part-time');
  await sheet.getByRole('button', { name: 'Save changes' }).click();
});
Then('the new item appears in my private preview', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('heading', { name: this.noviceValue })).toBeVisible();
  const pending = await pendingFor(this.currentPage(), 'home.careers.open-positions');
  assert.ok(pending);
  const list = homeCareersOpenPositionsSchema.parse(pending.replacementValue);
  assert.equal(list.length, 1);
  assert.equal(list[0]?.title, this.noviceValue);
  this.addedItemId = list[0]?.id ?? '';
});
Then('its generated identity remains hidden', async function (this: FrontendWorld) {
  assert.notEqual(this.addedItemId, '');
  assert.equal(
    (await this.currentPage().locator('body').innerText()).includes(this.addedItemId),
    false,
  );
});

Given(
  'another editor has a pending change for a Home collection',
  async function (this: FrontendWorld) {
    const secondary = await createVerifiedEditor(this);
    await discardPendingOwnedByCurrentUser(secondary, 'home.news.items');
    const items = homeNewsItemsSchema.parse(homeV2SeedData['home.news.items']);
    const first = items[0];
    assert.ok(first);
    this.noviceValue = `Another editor update ${String(Date.now())}`;
    await saveReplacement(secondary, 'home.news.items', [
      { ...first, title: this.noviceValue },
      ...items.slice(1),
    ]);
    this.cleanup.push({ page: secondary, entityId: 'home.news.items' });
    await loginEditor(this.currentPage());
  },
);
When('I enter edit mode on Home', async function (this: FrontendWorld) {
  await enterHomeEditMode(this.currentPage());
});
Then("that collection renders the other editor's change", async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('heading', { name: this.noviceValue })).toBeVisible();
});
Then(
  'its item controls are disabled with a plain-language ownership message',
  async function (this: FrontendWorld) {
    const collection = this.currentPage().locator('.home-news .editable-collection');
    await expect(collection.getByText('Another editor is updating this section.')).toBeVisible();
    await expect(collection.getByRole('button', { name: /Edit / }).first()).toBeDisabled();
    await expect(collection.getByRole('button', { name: /Delete / }).first()).toBeDisabled();
    await expect(collection.getByRole('button', { name: '+ Add news item' })).toHaveCount(0);
  },
);
Then('no owner identifier is shown to me', async function (this: FrontendWorld) {
  assert.notEqual(this.otherEditorId, '');
  assert.equal(
    (await this.currentPage().locator('body').innerText()).includes(this.otherEditorId),
    false,
  );
});

Given('I am signed in and editing a semantic image field', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await loginEditor(page);
  await discardPendingOwnedByCurrentUser(page, 'home.header.brand');
  this.cleanup.push({ page, entityId: 'home.header.brand' });
  await enterHomeEditMode(page);
  const boundary = page.locator('.home-header-shell [data-entity-boundary="true"]');
  await boundary.hover();
  await boundary.getByRole('button', { name: 'Edit Header logo' }).click();
  await expect(page.getByRole('dialog', { name: 'Header logo' })).toBeVisible();
});

When(
  'I upload and select an image from the managed media library',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    this.mediaFriendlyName = `Browser managed image ${String(Date.now())}`;
    this.mediaAltText = 'A friendly browser-uploaded TriCo logo';
    await page.getByRole('button', { name: 'Open media library' }).click();
    const library = page.getByRole('dialog', { name: 'Media library' });
    await expect(library).toBeVisible();
    await library
      .getByLabel('Image file')
      .setInputFiles(fileURLToPath(new URL('../assets/images/trico-logo.png', import.meta.url)));
    await library.getByLabel('Image name').fill(this.mediaFriendlyName);
    await library.getByLabel('Image description').fill(this.mediaAltText);
    await library.getByRole('button', { name: 'Upload image' }).click();
    await expect(library).toBeHidden();
  },
);

Then(
  'its friendly name and preview are shown without storage details',
  async function (this: FrontendWorld) {
    const sheet = this.currentPage().getByRole('dialog', { name: 'Header logo' });
    await expect(sheet.locator('figcaption', { hasText: this.mediaFriendlyName })).toBeVisible();
    await expect(sheet.locator('.editor-media-picker img')).toBeVisible();
    await expect(sheet.getByLabel('Logo description')).toHaveValue(this.mediaAltText);
    const visibleText = await sheet.innerText();
    assert.equal(visibleText.includes('media/'), false);
    assert.equal(visibleText.includes('object key'), false);
    assert.equal(visibleText.includes('bucket'), false);
  },
);

Then(
  'saving the form updates the private image and its description',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/v1/entities/home.header.brand/changes'),
    );
    await page.getByRole('button', { name: 'Save changes' }).click();
    assert.equal((await saved).status(), 201);
    const logo = page.locator('.home-header img');
    await expect(logo).toHaveAttribute('alt', this.mediaAltText);
    await expect(logo).toHaveAttribute('src', /^\/media\//);
  },
);

Given('I am editing one of my pending Home collection items', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await loginEditor(page);
  await discardPendingOwnedByCurrentUser(page, 'home.journey.timeline');
  this.cleanup.push({ page, entityId: 'home.journey.timeline' });
  const timeline = homeJourneyTimelineSchema.parse(homeV2SeedData['home.journey.timeline']);
  await saveReplacement(page, 'home.journey.timeline', timeline);
  await enterHomeEditMode(page);
  const first = timeline[0];
  assert.ok(first);
  const item = page
    .getByText(first.year, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"editable-item")]');
  await item.hover();
  await item.getByRole('button', { name: `Edit ${first.year}` }).click();
  this.noviceValue = `Draft retained ${String(Date.now())}`;
  await page.getByLabel('Milestone').fill(this.noviceValue);
});
When('that pending change advances before I save my draft', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const current = await pendingFor(page, 'home.journey.timeline');
  assert.ok(current);
  const timeline = homeJourneyTimelineSchema.parse(current.replacementValue);
  const first = timeline[0];
  assert.ok(first);
  await saveReplacement(
    page,
    'home.journey.timeline',
    [{ ...first, event: 'Latest saved milestone' }, ...timeline.slice(1)],
    current.revision,
  );
  const conflict = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes('/api/v1/entities/home.journey.timeline/changes'),
  );
  await page.getByRole('button', { name: 'Save changes' }).click();
  assert.equal((await conflict).status(), 409);
});
Then('my draft remains in the editor', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByLabel('Milestone')).toHaveValue(this.noviceValue);
  await expect(
    this.currentPage().getByText('This section changed while you were editing.'),
  ).toBeVisible();
});
Then('I can reload the latest saved value or cancel', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await page.getByRole('button', { name: 'Reload latest' }).click();
  await expect(page.getByLabel('Milestone')).toHaveValue('Latest saved milestone');
});

Given(
  'I have a saved pending Home change from an earlier visit',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await discardPendingOwnedByCurrentUser(page, 'home.divisions.header');
    this.cleanup.push({ page, entityId: 'home.divisions.header' });
    this.noviceValue = `Hydrated divisions ${String(Date.now())}`;
    await saveReplacement(page, 'home.divisions.header', {
      heading: this.noviceValue,
      description: 'This pending value was saved before edit mode started.',
    });
    await page.goto('/');
  },
);
Then('my pending value is rendered without another save', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('heading', { name: this.noviceValue })).toBeVisible();
});
Then('it is marked as an unpublished change', async function (this: FrontendWorld) {
  const boundary = this.currentPage()
    .getByRole('heading', { name: this.noviceValue })
    .locator('xpath=ancestor::div[contains(@class,"editable-boundary")]');
  await expect(boundary.getByText('Unpublished change', { exact: true })).toBeVisible();
});

Given(
  'I am signed in and editing Home at a {int} by {int} touch viewport',
  async function (this: FrontendWorld, width: number, height: number) {
    const page = this.currentPage();
    await page.setViewportSize({ width, height });
    await loginEditor(page);
    const initial = await page.locator('.home-values').boundingBox();
    assert.ok(initial);
    this.touchLayout = { width: initial.width, height: initial.height };
    const preview = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/v1/pages/home/preview'),
    );
    await page.getByRole('button', { name: 'Enter edit mode' }).focus();
    await page.keyboard.press('Enter');
    await preview;
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
  },
);

Then(
  'component and collection item actions remain visibly labeled and unclipped',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const item = page.locator('.home-values .editable-item').first();
    const actions = [
      page.getByRole('button', { name: 'Edit Opening message' }),
      item.getByRole('button', { name: /^Edit / }),
      item.getByRole('button', { name: /^Delete / }),
      item.getByRole('button', { name: /^Drag .* to reorder$/ }),
      item.getByRole('button', { name: /^Move .* down$/ }),
      page.getByRole('button', { name: '+ Add core value' }),
    ];
    for (const action of actions) {
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      assert.ok(box);
      assert.ok(box.x >= 0 && box.x + box.width <= 390, 'An editing action is clipped.');
      const text = (await action.innerText()).trim();
      assert.match(text, /[A-Za-z]{3,}/, 'An editing action uses an unlabeled icon square.');
      await action.focus();
      await expect(action).toBeFocused();
    }
  },
);

Then('touch editing actions meet their minimum target size', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const item = page.locator('.home-values .editable-item').first();
  const actions = [
    page.getByRole('button', { name: 'Edit Opening message' }),
    item.getByRole('button', { name: /^Edit / }),
    item.getByRole('button', { name: /^Delete / }),
    item.getByRole('button', { name: /^Drag .* to reorder$/ }),
    item.getByRole('button', { name: /^Move .* down$/ }),
    page.getByRole('button', { name: '+ Add core value' }),
  ];
  for (const action of actions) {
    const box = await action.boundingBox();
    assert.ok(box);
    assert.ok(box.height >= 44, `Touch target height was ${String(box.height)}px.`);
    assert.ok(box.width >= 44, `Touch target width was ${String(box.width)}px.`);
  }
});

When('I operate the visible item controls with the keyboard', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const edit = page
    .locator('.home-values .editable-item')
    .first()
    .getByRole('button', {
      name: /^Edit /,
    });
  await edit.focus();
  await page.keyboard.press('Enter');
});

Then(
  'the friendly item editor opens and the saved page layout remains unchanged',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await expect(page.getByRole('dialog', { name: /^Edit / })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Editor actions' }).click();
    await page.getByRole('button', { name: 'Exit edit mode' }).click();
    await expect(page.locator('.editable-boundary-controls')).toHaveCount(0);
    await expect(page.locator('.editable-item-controls')).toHaveCount(0);
    const final = await page.locator('.home-values').boundingBox();
    assert.ok(final);
    assert.deepEqual(
      { width: final.width, height: final.height },
      this.touchLayout,
      'Edit controls changed the public section dimensions after edit mode was closed.',
    );
  },
);

Given(
  'I am signed in on Home at a {int} by {int} touch viewport',
  async function (this: FrontendWorld, width: number, height: number) {
    const page = this.currentPage();
    await page.setViewportSize({ width, height });
    await loginEditor(page);
  },
);

Given(
  'I am signed in on Home at a {int} by {int} desktop viewport',
  async function (this: FrontendWorld, width: number, height: number) {
    const page = this.currentPage();
    await page.setViewportSize({ width, height });
    await loginEditor(page);
  },
);

When('I enter edit mode from the desktop launcher', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
  await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
});

Then(
  'the desktop editor toolbar is exactly {int} pixels tall',
  async function (this: FrontendWorld, expectedHeight: number) {
    const toolbar = this.currentPage().getByRole('complementary', { name: 'Content editor' });
    const box = await toolbar.boundingBox();
    assert.ok(box);
    assert.equal(box.height, expectedHeight);
  },
);

Then(
  'every desktop editor action remains visible and available actions are keyboard reachable',
  async function (this: FrontendWorld) {
    const toolbar = this.currentPage().getByRole('complementary', { name: 'Content editor' });
    await expect(toolbar.getByText('Edit mode', { exact: true })).toBeVisible();
    await expect(toolbar.getByText(/unpublished change/)).toBeVisible();
    for (const actionName of ['View public', 'Review and publish', 'History', 'Exit edit mode']) {
      const action = toolbar.getByRole('button', { name: actionName });
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      assert.ok(box);
      assert.ok(box.height >= 44, `Desktop action ${actionName} was ${String(box.height)}px tall.`);
      if (await action.isEnabled()) {
        await action.focus();
        await expect(action).toBeFocused();
      }
    }
  },
);

Given('I have one unpublished Home change to review', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await loginEditor(page);
  await discardPendingOwnedByCurrentUser(page, 'home.hero');
  const replacement = {
    ...(homeV2SeedData['home.hero'] as Record<string, EditableValue>),
    heading: `Review-ready heading ${String(Date.now())}`,
  };
  await saveReplacement(page, 'home.hero', replacement);
  this.cleanup.push({ page, entityId: 'home.hero' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter edit mode' }).click();
});

When('I open the review and publish panel', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Review and publish' }).click();
});

Then(
  "the publish action is the panel's visually prominent primary action",
  async function (this: FrontendWorld) {
    const panel = this.currentPage().getByRole('dialog', { name: 'Review unpublished changes' });
    const publish = panel.getByRole('button', { name: 'Publish change' });
    await expect(publish).toBeVisible();
    await expect(publish).toHaveCSS('background-color', 'rgb(0, 18, 138)');
    await expect(publish).toHaveCSS('color', 'rgb(255, 255, 255)');
    const panelBox = await panel.boundingBox();
    const publishBox = await publish.boundingBox();
    assert.ok(panelBox);
    assert.ok(publishBox);
    const panelInsets = await panel.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return (
        Number.parseFloat(style.paddingLeft) +
        Number.parseFloat(style.paddingRight) +
        Number.parseFloat(style.borderLeftWidth) +
        Number.parseFloat(style.borderRightWidth)
      );
    });
    assert.ok(publishBox.height >= 48, 'The final publish action is smaller than 48px.');
    assert.ok(
      publishBox.width >= panelBox.width - panelInsets,
      'The final publish action does not span the review panel.',
    );
  },
);

Then(
  'the publish action explains that it makes the reviewed change public',
  async function (this: FrontendWorld) {
    const panel = this.currentPage().getByRole('dialog', { name: 'Review unpublished changes' });
    const publish = panel.getByRole('button', { name: 'Publish change' });
    const descriptionId = await publish.getAttribute('aria-describedby');
    assert.ok(descriptionId, 'The publish action has no accessible description.');
    await expect(panel.locator(`#${descriptionId}`)).toContainText(
      /makes (?:this change|these changes) visible on the public website/,
    );
  },
);

Then(
  'editor feedback does not appear to the right of the edit-mode buttons',
  async function (this: FrontendWorld) {
    const toolbar = this.currentPage().getByRole('complementary', { name: 'Content editor' });
    const actions = toolbar.locator('.toolbar-actions');
    const feedback = toolbar.getByRole('status');
    await expect(feedback).toBeVisible();
    const actionsBox = await actions.boundingBox();
    const feedbackBox = await feedback.boundingBox();
    assert.ok(actionsBox);
    assert.ok(feedbackBox);
    assert.ok(
      feedbackBox.x + feedbackBox.width <= actionsBox.x,
      'Editor feedback rendered after the edit-mode action buttons.',
    );
  },
);

When('I tap the edit mode launcher', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const launcher = page.getByRole('button', { name: 'Enter edit mode' });
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
});

Then(
  'the compact editor status does not cover the page content',
  async function (this: FrontendWorld) {
    const toolbar = this.currentPage().getByRole('complementary', { name: 'Content editor' });
    const box = await toolbar.boundingBox();
    assert.ok(box);
    assert.ok(box.height <= 72, `The compact mobile toolbar was ${String(box.height)}px tall.`);
    assert.ok(box.y + box.height <= 844, 'The compact mobile toolbar extended below the viewport.');
  },
);

Then(
  'every approved editor action is reachable from the compact toolbar',
  async function (this: FrontendWorld) {
    const toolbar = this.currentPage().getByRole('complementary', { name: 'Content editor' });
    const menu = toolbar.getByRole('button', { name: 'Editor actions' });
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    for (const actionName of [
      /View (public|my changes)/,
      'Review and publish',
      'History',
      'Exit edit mode',
    ]) {
      const action = toolbar.getByRole('button', { name: actionName });
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      assert.ok(box);
      assert.ok(box.x >= 0 && box.x + box.width <= 390, `${String(actionName)} was clipped.`);
      assert.ok(box.y >= 0 && box.y + box.height <= 844, `${String(actionName)} was unreachable.`);
    }
  },
);

When('I open a long semantic editor on mobile', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('button', { name: 'Editor actions' }).click();
  const edit = page.getByRole('button', { name: 'Edit Corporate contact' });
  await edit.scrollIntoViewIfNeeded();
  await edit.click();
  await expect(page.getByRole('dialog', { name: 'Corporate contact' })).toBeVisible();
});

Then(
  'I can scroll every field above the Save and Cancel actions',
  async function (this: FrontendWorld) {
    const dialog = this.currentPage().getByRole('dialog', { name: 'Corporate contact' });
    const lastField = dialog.getByRole('button', { name: 'Add license' });
    await lastField.scrollIntoViewIfNeeded();
    await expect(lastField).toBeVisible();
    const fieldBox = await lastField.boundingBox();
    const saveBox = await dialog.getByRole('button', { name: 'Save changes' }).boundingBox();
    assert.ok(fieldBox);
    assert.ok(saveBox);
    assert.ok(
      fieldBox.y + fieldBox.height <= saveBox.y,
      'The Save and Cancel region covered the final field.',
    );
  },
);

Then(
  'keyboard focus stays within the editor until I close it',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const dialog = page.getByRole('dialog', { name: 'Corporate contact' });
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    await cancel.focus();
    await page.keyboard.press('Tab');
    const focusRemainsInside = await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    );
    assert.equal(focusRemainsInside, true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  },
);

async function homeOpeningGeometry(page: Page): Promise<{
  readonly sectionX: number;
  readonly sectionWidth: number;
  readonly textCenterX: number;
}> {
  return page.locator('.home-hero').evaluate((section) => {
    const heading = section.querySelector('h1');
    if (heading === null) throw new Error('The Home opening heading was missing.');
    const text = heading.firstChild;
    if (text === null) throw new Error('The Home opening heading text was missing.');
    const range = document.createRange();
    range.selectNodeContents(text);
    const sectionRect = section.getBoundingClientRect();
    const textRect = range.getBoundingClientRect();
    return {
      sectionX: sectionRect.x,
      sectionWidth: sectionRect.width,
      textCenterX: textRect.x + textRect.width / 2,
    };
  });
}

Given(
  'I have canonical Home opening content with no saved draft',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    await loginEditor(page);
    await discardPendingOwnedByCurrentUser(page, 'home.hero');
    this.cleanup.push({ page, entityId: 'home.hero' });
  },
);

When('I open the public Home page at desktop width', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(homeV2SeedData['home.hero'].heading);
  this.homePublicHeroGeometry = await homeOpeningGeometry(page);
});

Then(
  'the canonical Home opening heading is horizontally centered',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const geometry = await homeOpeningGeometry(page);
    const viewportCenter = 1425 / 2;
    assert.ok(
      Math.abs(geometry.textCenterX - viewportCenter) <= 2,
      `Home opening text center ${String(geometry.textCenterX)} differed from viewport center ${String(viewportCenter)}.`,
    );
    await expect(page.locator('.home-hero h1')).toHaveCSS('text-align', 'center');
  },
);

When(
  'I enter edit mode with the canonical Home opening content',
  async function (this: FrontendWorld) {
    await enterHomeEditMode(this.currentPage());
  },
);

Then(
  'the canonical Home opening heading remains horizontally centered',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      homeV2SeedData['home.hero'].heading,
    );
    const geometry = await homeOpeningGeometry(page);
    assert.ok(Math.abs(geometry.textCenterX - 1425 / 2) <= 2);
  },
);

Then(
  'the editor wrapper does not change the Home opening geometry',
  async function (this: FrontendWorld) {
    const publicGeometry = this.homePublicHeroGeometry;
    assert.ok(publicGeometry);
    const editGeometry = await homeOpeningGeometry(this.currentPage());
    assert.ok(Math.abs(editGeometry.sectionX - publicGeometry.sectionX) <= 2);
    assert.ok(Math.abs(editGeometry.sectionWidth - publicGeometry.sectionWidth) <= 2);
    assert.ok(Math.abs(editGeometry.textCenterX - publicGeometry.textCenterX) <= 2);
  },
);

Given('I am not signed in', async function (this: FrontendWorld) {
  await this.context?.clearCookies();
});
When('I request the public health endpoint', async function (this: FrontendWorld) {
  const response = await this.currentPage().request.get('/api/v1/health');
  this.responseStatus = response.status();
  this.responseBody = await response.json();
});
Then('the response status is {int}', function (this: FrontendWorld, status: number) {
  assert.equal(this.responseStatus, status);
});
Then('the response body is exactly:', function (this: FrontendWorld, body: string) {
  assert.deepEqual(this.responseBody, JSON.parse(body) as unknown);
});
