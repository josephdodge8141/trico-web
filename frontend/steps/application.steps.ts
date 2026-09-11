import assert from 'node:assert/strict';
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
  '/real-estate': 'Find the right place for what comes next',
  '/construction': 'Construction with purpose',
  '/storage': 'Storage made simple',
  '/development': 'Development with a long view',
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
  currentPage(): Page {
    assert.ok(this.page);
    return this.page;
  }
}
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
Given('I opened the property management page', async function (this: FrontendWorld) {
  await this.currentPage().goto('/property-management');
});
When('I enter edit mode', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Enter edit mode' }).click();
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
    await expect(primary).toHaveCSS('background-color', 'rgb(111, 81, 37)');
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
  assert.equal(deletionResponse?.status(), 200, operationErrors.join(' '));
  await expect(
    page.getByRole('status').filter({ hasText: 'Browser-edited value deleted.' }),
  ).toBeVisible();
  const undo = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === 'PUT' &&
      candidate.url().includes('/api/v1/entities/home.core-values.items/changes'),
  );
  const undoPreview = page.waitForResponse((candidate) =>
    candidate.url().includes('/api/v1/pages/home/preview'),
  );
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal((await undo).status(), 200);
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
