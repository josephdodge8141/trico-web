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
import {
  chromium,
  expect as playwrightExpect,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import {
  homeCareersOpenPositionsSchema,
  homeCoreValuesItemsSchema,
  homeJourneyTimelineSchema,
  homeNewsItemsSchema,
  homeV2SeedData,
  developmentV2SeedData,
  entityDefinitions,
  pendingChangesResponseSchema,
  previewPreferencesResponseSchema,
  retiredEntityIds,
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
const expect = playwrightExpect.configure({ timeout: 15_000 });
setDefaultTimeout(60_000);

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
  passwordAccepted: boolean | undefined;
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
  inquiryMarker = '';
  careerUploadId = '';
  careerPayload: Record<string, unknown> = {};
  reorderedItemLabel = '';
  iconEditorItemLabel = '';
  homePublicHeroGeometry:
    | {
        readonly sectionX: number;
        readonly sectionWidth: number;
        readonly textCenterX: number;
      }
    | undefined;
  homePublicAnniversaryGeometry:
    | {
        readonly banner: {
          readonly x: number;
          readonly y: number;
          readonly width: number;
          readonly height: number;
        };
        readonly label: {
          readonly x: number;
          readonly y: number;
          readonly width: number;
          readonly height: number;
        };
      }
    | undefined;
  storagePublicMastheadGeometry:
    | {
        readonly banner: {
          readonly x: number;
          readonly y: number;
          readonly width: number;
          readonly height: number;
        };
        readonly header: {
          readonly x: number;
          readonly y: number;
          readonly width: number;
          readonly height: number;
        };
        readonly logo: {
          readonly x: number;
          readonly y: number;
          readonly width: number;
          readonly height: number;
        };
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
    .locator('xpath=ancestor::*[@data-slot="editable-item"][1]');
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
      .locator('xpath=ancestor::*[@data-slot="editable-item"][1]');
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
Given('I am entering a new editor password', async function (this: FrontendWorld) {
  await this.currentPage().goto('/register');
});
When(
  'I enter a password with {int} characters',
  async function (this: FrontendWorld, characterCount: number) {
    const password = this.currentPage().getByLabel('Password');
    await password.fill('p'.repeat(characterCount));
    this.passwordAccepted = await password.evaluate((input) =>
      (input as HTMLInputElement).checkValidity(),
    );
  },
);
Then(
  'registration considers the password {string}',
  function (this: FrontendWorld, validity: string) {
    assert.equal(this.passwordAccepted, validity === 'valid');
  },
);
Given('I sign in as the preview editor', async function (this: FrontendWorld) {
  await loginEditor(this.currentPage());
});
Given('I opened the property management page', async function (this: FrontendWorld) {
  await this.currentPage().goto('/property-management');
});
When('I navigate directly to editor sign in', async function (this: FrontendWorld) {
  await this.currentPage().goto('/login');
});
Then('the edit mode launcher is hidden', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('button', { name: 'Enter edit mode' })).toHaveCount(0);
});
Then('the edit mode launcher is visible', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('button', { name: 'Enter edit mode' })).toBeVisible();
});
When(
  'I sign in as the preview editor through the login page',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.getByLabel('Email').fill(editorEmail);
    await page.getByLabel('Password').fill(editorPassword);
    await page.getByRole('button', { name: 'Continue' }).click();
  },
);
Then('I return to the public Home page', async function (this: FrontendWorld) {
  await expect(this.currentPage()).toHaveURL(/\/$/);
  await expect(
    this.currentPage().getByRole('heading', { name: "Building Utah's Future" }),
  ).toBeVisible();
});
When('I enter edit mode', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Enter edit mode' }).click();
});
When('I leave edit mode', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Exit edit mode' }).click();
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
    await expect(this.currentPage().getByRole('button', { name: 'Enter edit mode' })).toHaveCount(
      0,
    );
  }
});
Then('editing controls are not shown', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('complementary', { name: 'Content editor' }),
  ).toHaveCount(0);
  await expect(this.currentPage().getByRole('button', { name: 'Enter edit mode' })).toHaveCount(0);
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
  'the {string} published content is rendered with deferred below-fold images',
  async function (this: FrontendWorld, pageId: string) {
    const heading = headings[this.route];
    assert.ok(heading);
    await expect(this.currentPage().getByRole('heading', { name: heading })).toBeVisible();
    assert.ok((this.manifest as { pages?: Record<string, unknown> }).pages?.[pageId]);
    const eagerBelowFold = await this.currentPage().evaluate(() =>
      [...document.querySelectorAll('img')]
        .filter((image) => {
          const box = image.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.top + window.scrollY > window.innerHeight * 1.5 &&
            image.loading !== 'lazy'
          );
        })
        .map((image) => image.getAttribute('alt') ?? image.getAttribute('src') ?? 'unknown'),
    );
    assert.deepEqual(eagerBelowFold, []);
  },
);
Then('the browser title identifies the published page', async function (this: FrontendWorld) {
  const titles: Readonly<Record<string, string>> = {
    '/': "TriCo | Building Utah's Future",
    '/property-management': 'Property Management | TriCo',
    '/real-estate': 'Real Estate | TriCo',
    '/construction': 'Construction | TriCo',
    '/storage': 'Storage | TriCo',
    '/development': 'Development | TriCo',
  };
  const title = titles[this.route];
  assert.ok(title);
  await expect(this.currentPage()).toHaveTitle(title);
});
Then('only the requested page module is loaded at entry', async function (this: FrontendWorld) {
  const modules: Readonly<Record<string, string>> = {
    '/': 'HomeExperience',
    '/property-management': 'PropertyManagementExperience',
    '/real-estate': 'RealEstateExperience',
    '/construction': 'ConstructionExperience',
    '/storage': 'StorageExperience',
    '/development': 'DevelopmentExperience',
  };
  const requested = modules[this.route];
  assert.ok(requested);
  const page = this.currentPage();
  await page.waitForLoadState('networkidle');
  const loaded = await page.evaluate(
    (names) =>
      performance
        .getEntriesByType('resource')
        .filter((resource) => resource.name.endsWith('.js'))
        .map((resource) => new URL(resource.name).pathname.split('/').at(-1) ?? '')
        .flatMap((filename) => names.filter((name) => filename.startsWith(`${name}-`))),
    Object.values(modules),
  );
  assert.deepEqual([...new Set(loaded)].sort(), [requested]);
});
Then(
  'anonymous entry keeps editor code out of the initial JavaScript transfer',
  async function (this: FrontendWorld) {
    const resources = await this.currentPage().evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((resource) => new URL(resource.name).pathname.endsWith('.js'))
        .map((resource) => ({
          filename: new URL(resource.name).pathname.split('/').at(-1) ?? '',
          encodedBytes:
            resource instanceof PerformanceResourceTiming ? resource.encodedBodySize : 0,
        })),
    );
    assert.ok(
      resources.every(
        ({ filename }) =>
          !/^(EditorSheet|EditorToolbar|MediaLibraryDialog|dynamic)-/.test(filename),
      ),
      'An anonymous visitor loaded editor-only or deferred icon modules',
    );
    const encodedBytes = resources.reduce((sum, resource) => sum + resource.encodedBytes, 0);
    assert.ok(
      encodedBytes < 300 * 1024,
      `Anonymous route loaded ${encodedBytes} encoded JavaScript bytes`,
    );
  },
);
Then(
  'its editable anniversary banner matches the Home presentation',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const banner = page.locator('[data-slot="anniversary-banner"]');
    await expect(banner).toHaveCount(1);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Excellence');
    await expect(banner.locator('xpath=ancestor::*[@data-entity-boundary="true"]')).toHaveCount(1);
    const presentation = async (target: typeof banner) =>
      target.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          className: element.className,
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
          textAlign: style.textAlign,
          textTransform: style.textTransform,
          paddingBlock: style.paddingBlock,
        };
      });
    const expected = await presentation(banner);
    const homePage = await page.context().newPage();
    try {
      await homePage.goto('/');
      const homeBanner = homePage.locator('[data-slot="anniversary-banner"]');
      await expect(homeBanner).toBeVisible();
      assert.deepEqual(expected, await presentation(homeBanner));
    } finally {
      await homePage.close();
    }
  },
);
Then(
  'public notice links and editable lists preserve accessible semantics',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await expect(page.getByRole('region', { name: 'TriCo anniversary' })).toHaveCount(1);
    const inlineEmails = page.locator('p a[href^="mailto:"]');
    for (const link of await inlineEmails.all()) {
      if (!(await link.isVisible())) continue;
      const decoration = await link.evaluate(
        (element) => getComputedStyle(element).textDecorationLine,
      );
      assert.ok(decoration.includes('underline'), 'Inline email link must be underlined at rest');
    }
    const route = new URL(page.url()).pathname;
    if (route === '/') {
      const timeline = page.locator('#journey ol[data-slot="editable-collection-items"]');
      await expect(timeline).toHaveCount(1);
      await expect(timeline.locator(':scope > li')).toHaveCount(8);
    }
    if (route === '/development') {
      const highlights = page.locator('#about ul[data-slot="editable-collection-items"]');
      await expect(highlights).toHaveCount(1);
      await expect(highlights.locator(':scope > li')).toHaveCount(5);
    }
  },
);
Then(
  'shared public navigation shows every section without a secondary menu and moves focus to its keyboard-selected destination',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('button', { name: 'More sections' })).toHaveCount(0);
    const desktopNavigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(desktopNavigation).toBeVisible();
    const desktopLinks = desktopNavigation.getByRole('link');
    assert.ok((await desktopLinks.count()) >= 5);
    for (const link of await desktopLinks.all()) await expect(link).toBeVisible();
    const firstDesktopLink = desktopLinks.first();
    const desktopHref = await firstDesktopLink.getAttribute('href');
    assert.ok(desktopHref);
    const desktopDestination = new URL(desktopHref, page.url()).hash.slice(1);
    assert.ok(desktopDestination);
    await firstDesktopLink.focus();
    await page.keyboard.press('Enter');
    const destination = page.locator(`[id="${desktopDestination}"]`);
    const focusTarget =
      (await destination.getAttribute('aria-hidden')) === 'true'
        ? destination.locator('xpath=ancestor::section[1]')
        : destination;
    await expect(focusTarget).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole('button', { name: 'Open navigation' });
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44);
    const mobileId = await trigger.getAttribute('aria-controls');
    assert.ok(mobileId);
    const mobileTrigger = page.locator(`button[aria-controls="${mobileId}"]`);
    const navigation = page.locator(`[id="${mobileId}"]`);
    await expect(navigation).toHaveCount(1);
    await expect(navigation).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
    await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole('link', { name: /contact|get in touch/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(navigation).toBeHidden();
    await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(mobileTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(navigation.getByRole('link').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(navigation).toBeHidden();
    await expect(mobileTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    const mobileLink = navigation.getByRole('link').first();
    const mobileHref = await mobileLink.getAttribute('href');
    assert.ok(mobileHref);
    const mobileDestination = new URL(mobileHref, page.url()).hash.slice(1);
    assert.ok(mobileDestination);
    await page.keyboard.press('Enter');
    await expect(navigation).toBeHidden();
    await expect(page.locator(`[id="${mobileDestination}"]`)).toBeFocused();
  },
);
Then(
  'its anniversary announcement opens the community page and can be dismissed for this session',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const originalPath = new URL(page.url()).pathname;
    const banner = page.getByRole('region', { name: 'TriCo anniversary' });
    const announcement = banner.getByRole('link', { name: /giving back/i });
    await expect(announcement).toBeVisible();
    await banner.scrollIntoViewIfNeeded();
    const bannerBox = await banner.boundingBox();
    assert.ok(bannerBox);
    await page.mouse.click(bannerBox.x + 8, bannerBox.y + bannerBox.height / 2);
    await expect(page).toHaveURL(/\/community$/);
    await expect(page.getByRole('heading', { name: 'Giving Back to Our Community' })).toBeVisible();
    await page.goto(originalPath);
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Dismiss anniversary announcement' }).click();
    await expect(banner).toHaveCount(0);
    assert.equal(new URL(page.url()).pathname, originalPath, 'Dismissal must not follow the link');
    await page.reload();
    await expect(banner).toHaveCount(0);
    await page.goto(originalPath === '/' ? '/property-management' : '/');
    await expect(page.getByRole('region', { name: 'TriCo anniversary' })).toHaveCount(0);
  },
);
Then('the project category uses the shared public header', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await expect(trigger).toBeVisible();
  const box = await trigger.boundingBox();
  assert.ok(box && box.width >= 44 && box.height >= 44);
  await trigger.click();
  await expect(
    page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: 'Careers' }),
  ).toHaveAttribute('href', '/construction#careers');
});
Then(
  'its footer quick links have comfortable mobile tap targets',
  async function (this: FrontendWorld) {
    const links = this.currentPage().locator('footer nav[aria-label="Quick links"] a');
    const count = await links.count();
    assert.ok(count > 0);
    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      assert.ok(box && box.height >= 44, `Category footer link ${String(index)} is too small`);
    }
  },
);
Then('unfinished public placeholder claims are suppressed', async function (this: FrontendWorld) {
  const text = await this.currentPage().locator('body').innerText();
  assert.doesNotMatch(text, /coming soon|(?:builder|investor) partner \d/i);
});
Then('Property Management has no dead public footer links', async function (this: FrontendWorld) {
  await expect(this.currentPage().locator('footer a[href="#"]')).toHaveCount(0);
});
Then('available division hero imagery is displayed', async function (this: FrontendWorld) {
  const image = this.currentPage().locator('#main-content section').first().locator('img').first();
  await expect(image).toBeVisible();
  assert.ok(
    (await image.evaluate((node) => (node instanceof HTMLImageElement ? node.naturalWidth : 0))) >
      0,
  );
});
Then('unavailable project actions are not shown as buttons', async function (this: FrontendWorld) {
  const page = this.currentPage();
  if (this.route === '/construction') {
    await expect(page.getByRole('button', { name: /view plans|specifications/i })).toHaveCount(0);
  }
  if (this.route === '/development') {
    await expect(page.getByRole('button', { name: /view current|view completed/i })).toHaveCount(0);
  }
});
Then(
  'empty Construction project groups and restricted plan sets share honest inquiry paths',
  async function (this: FrontendWorld) {
    if (this.route !== '/construction') return;
    const page = this.currentPage();
    await expect(page.getByText('Built Across Every Sector')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'View projects' })).toHaveCount(0);
    await expect(page.getByText('Project details are available by request.')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Ask about projects' })).toHaveCount(1);
    const planRoom = page.locator('#plan-room');
    await expect(planRoom.getByText('Draper Mixed-Use Development')).toHaveCount(0);
    await expect(planRoom.getByText('TCC-2026-014')).toHaveCount(0);
    await expect(planRoom.getByText('Login Required')).toHaveCount(0);
    await expect(planRoom.getByText(/credentials/i)).toHaveCount(0);
    await expect(planRoom.getByRole('link', { name: 'Request Plans' })).toHaveAttribute(
      'href',
      /^mailto:/,
    );
    await loginEditor(page);
    await page.goto('/construction');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(planRoom.getByText('Draper Mixed-Use Development')).toBeVisible();
    await expect(
      planRoom.locator('[data-slot="editable-collection"] [data-slot="card"]'),
    ).toHaveCount(4);
    await page
      .getByRole('complementary', { name: 'Content editor' })
      .getByRole('button', { name: 'Exit edit mode' })
      .click();
  },
);
Then(
  'Construction bid and contact actions lead to one quote form',
  async function (this: FrontendWorld) {
    if (this.route !== '/construction') return;
    const page = this.currentPage();
    await expect(page.locator('#bid form, #contact form')).toHaveCount(1);
    await page.getByRole('link', { name: 'Get a Quote' }).first().click();
    await expect(page.locator('#bid form')).toBeInViewport();
  },
);
Then('no CMS metadata is present in the page document', function (this: FrontendWorld) {
  const serialized = JSON.stringify(this.pageDocument);
  for (const forbidden of ['pendingOwner', 'pendingRevision', 'userId', 'operationStatus'])
    assert.equal(serialized.includes(forbidden), false);
});
Then(
  'division footer links have comfortable mobile tap targets where present',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const links = page.locator('footer a[href^="#"]');
    const count = await links.count();
    if (this.route === '/') {
      assert.equal(count, 0);
      return;
    }
    assert.ok(count > 0);
    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      assert.ok(
        box && box.height >= 44,
        `Footer link ${String(index)} (${await links.nth(index).getAttribute('href')}) measures ${String(box?.height)}px`,
      );
    }
  },
);

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
  'the Home page presents ready sections in order without sample updates or eager leadership photos',
  async function (this: FrontendWorld) {
    const expectedHeadings = [
      "Building Utah's Future",
      'Our Divisions',
      'Our Core Values',
      'Our Journey',
      'Leadership Team',
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
    await expect(this.currentPage().locator('#news')).toHaveCount(0);
    await expect(this.currentPage().getByText('New Website Launch')).toHaveCount(0);
    const leadershipImages = this.currentPage().locator('#leadership img');
    await expect(leadershipImages).toHaveCount(4);
    for (const image of await leadershipImages.all())
      await expect(image).toHaveAttribute('loading', 'lazy');
  },
);
Then(
  'all {int} Home entities remain editable with explicit public visibility controls',
  async function (this: FrontendWorld, count: number) {
    const page = this.currentPage();
    await loginEditor(page);
    await enterHomeEditMode(page);
    await expect(page.locator('[data-home-entity-boundary="true"]')).toHaveCount(count);
    await expect(page.getByText('New Website Launch')).toBeVisible();
    for (const section of ['#news', '#careers']) {
      await page
        .locator(`${section} [data-slot=editable-item]`)
        .first()
        .getByRole('button', { name: /^Edit / })
        .click();
      const sheet = page.getByRole('dialog');
      await expect(sheet.getByLabel('Public visibility')).toHaveValue('legacy');
      await sheet.getByRole('button', { name: 'Cancel' }).click();
    }
    await page
      .getByRole('complementary', { name: 'Content editor' })
      .getByRole('button', { name: 'Exit edit mode' })
      .click();
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
Then('Home uses the measured vivid anniversary banner', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.reload();
  await page.evaluate(async () => document.fonts.ready);

  const shell = page.locator('.home-anniversary-shell');
  const banner = page.locator('.home-anniversary');
  const label = banner.getByText('40+ Years of Excellence', { exact: true });
  const [shellBox, bannerBox, labelBox] = await Promise.all([
    shell.boundingBox(),
    banner.boundingBox(),
    label.boundingBox(),
  ]);
  assert.ok(shellBox && bannerBox && labelBox);
  this.homePublicAnniversaryGeometry = { banner: bannerBox, label: labelBox };

  for (const [name, actual, expected] of [
    ['shell x', shellBox.x, 0],
    ['shell y', shellBox.y, 0],
    ['shell width', shellBox.width, 1440],
    ['shell height', shellBox.height, 52],
    ['banner x', bannerBox.x, 0],
    ['banner y', bannerBox.y, 0],
    ['banner width', bannerBox.width, 1440],
    ['banner height', bannerBox.height, 52],
    ['label center', labelBox.x + labelBox.width / 2, 720],
    ['label y', labelBox.y, 12],
    ['label width', labelBox.width, 269.375],
    ['label height', labelBox.height, 28],
  ] as const) {
    assert.ok(Math.abs(actual - expected) <= 1, `Home anniversary ${name} was ${actual}`);
  }
  await expect(shell).toHaveCSS('position', 'fixed');
  await expect(banner).toHaveCSS(
    'background-image',
    'linear-gradient(90deg, rgb(0, 18, 138), rgb(37, 99, 235), rgb(0, 18, 138))',
  );
  await expect(label).toHaveCSS('font-size', '20px');
  await expect(label).toHaveCSS('line-height', '28px');
  await expect(label).toHaveCSS('font-weight', '700');
  await expect(label).toHaveCSS('letter-spacing', '0.5px');
  assert.match(await label.evaluate((element) => getComputedStyle(element).fontFamily), /Lato/);
});
Then(
  'Home preserves the anniversary banner in edit mode and on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const publicGeometry = this.homePublicAnniversaryGeometry;
    assert.ok(publicGeometry);

    await loginEditor(page);
    await page.goto(`${baseUrl}/`);
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    const banner = page.locator('.home-anniversary');
    const label = banner.getByText('40+ Years of Excellence', { exact: true });
    const [editBannerBox, editLabelBox] = await Promise.all([
      banner.boundingBox(),
      label.boundingBox(),
    ]);
    assert.ok(editBannerBox && editLabelBox);
    for (const [name, publicBox, editBox] of [
      ['banner', publicGeometry.banner, editBannerBox],
      ['label', publicGeometry.label, editLabelBox],
    ] as const) {
      for (const dimension of ['x', 'y', 'width', 'height'] as const) {
        assert.ok(
          Math.abs(editBox[dimension] - publicBox[dimension]) <= 1,
          `Home anniversary ${name} ${dimension} changed in edit mode`,
        );
      }
    }
    await expect(banner).toHaveCSS(
      'background-image',
      'linear-gradient(90deg, rgb(0, 18, 138), rgb(37, 99, 235), rgb(0, 18, 138))',
    );

    await page.setViewportSize({ width: 390, height: 844 });
    const [mobileBannerBox, mobileLabelBox] = await Promise.all([
      banner.boundingBox(),
      label.boundingBox(),
    ]);
    assert.ok(mobileBannerBox && mobileLabelBox);
    for (const [name, actual, expected] of [
      ['x', mobileBannerBox.x, 0],
      ['y', mobileBannerBox.y, 0],
      ['width', mobileBannerBox.width, 390],
      ['height', mobileBannerBox.height, 56],
    ] as const) {
      assert.ok(Math.abs(actual - expected) <= 1, `Home mobile anniversary ${name} was ${actual}`);
    }
    assert.ok(mobileLabelBox.x >= 0 && mobileLabelBox.x + mobileLabelBox.width <= 390);
    await expect(label).toHaveCSS('font-size', '14px');
    await expect(label).toHaveCSS('line-height', '20px');
    const decorations = banner.locator(':scope > span');
    await expect(decorations).toHaveCount(2);
    for (let index = 0; index < 2; index += 1) await expect(decorations.nth(index)).toBeHidden();
  },
);
Then(
  'one shared semantic palette defines action highlight stat rating and brand accent roles',
  async function (this: FrontendWorld) {
    const roles = await this.currentPage().evaluate(() => {
      const styles = window.getComputedStyle(document.documentElement);
      return {
        theme: document.documentElement.dataset.theme,
        primary: styles.getPropertyValue('--primary').trim(),
        info: styles.getPropertyValue('--info').trim(),
        accent: styles.getPropertyValue('--accent').trim(),
        sidebar: styles.getPropertyValue('--sidebar').trim(),
        sidebarPrimary: styles.getPropertyValue('--sidebar-primary').trim(),
      };
    });
    assert.deepEqual(roles, {
      theme: 'ds-21',
      primary: 'oklch(30.16% .1881 264.19)',
      info: 'oklch(61% .0922 256.29)',
      accent: 'oklch(52.24% .0838 74.61)',
      sidebar: 'oklch(20.67% .1203 264.02)',
      sidebarPrimary: 'oklch(78.19% .0629 253.08)',
    });
  },
);
Then(
  'legacy presentation stylesheets are deleted in favor of the TriCo Tailwind theme',
  async function () {
    const pageStyles = [
      'home.css',
      'property-management.css',
      'real-estate.css',
      'construction.css',
      'storage.css',
      'development.css',
    ] as const;
    for (const fileName of pageStyles) {
      await assert.rejects(readFile(new URL(`../pages/${fileName}`, import.meta.url), 'utf8'), {
        code: 'ENOENT',
      });
    }
    await assert.rejects(readFile(new URL('../styles.css', import.meta.url), 'utf8'), {
      code: 'ENOENT',
    });
    const entry = await readFile(new URL('../main.tsx', import.meta.url), 'utf8');
    assert.ok(entry.includes('./design-system/themes/main.css'));
    assert.ok(!entry.includes('./styles.css'));
    assert.ok(!entry.includes('./pages/'));
  },
);
Then(
  'active pages auth and editor replace their old presentation with fullstack-ts primitives',
  async function () {
    const oldPresentation = [
      'pages/HomeSitePage.tsx',
      'pages/PropertyManagementSitePage.tsx',
      'pages/RealEstateSitePage.tsx',
      'pages/ConstructionSitePage.tsx',
      'pages/StorageSitePage.tsx',
      'pages/DevelopmentSitePage.tsx',
      'pages/ConstructionCategoryPage.tsx',
    ] as const;
    for (const fileName of oldPresentation) {
      await assert.rejects(readFile(new URL(`../${fileName}`, import.meta.url), 'utf8'), {
        code: 'ENOENT',
      });
    }
    for (const fileName of [
      'pages/AuthPage.tsx',
      'components/EditorSheet.tsx',
      'components/EditorToolbar.tsx',
      'components/MediaLibraryDialog.tsx',
      'components/SemanticEditorForm.tsx',
    ]) {
      const presentation = await readFile(new URL('../' + fileName, import.meta.url), 'utf8');
      assert.match(presentation, /components\/ui\/|\.\/ui\//);
      assert.doesNotMatch(presentation, /className="(?:ui-|re-|pm-|type-)/);
    }
    const root = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
    assert.ok(root.includes('Experience'));
  },
);
Then(
  'Open Sans body copy and Lato headings are bundled with the supported visual-parity weights',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().getByRole('heading', { level: 1 })).toBeVisible();
    const typography = await this.currentPage().evaluate(async () => {
      await document.fonts.ready;
      const faces = [...document.fonts];
      const heading = document.querySelector('h1');
      if (heading === null) throw new Error('Expected the public page to contain a heading');
      return {
        families: [...new Set(faces.map(({ family }) => family.replaceAll('"', '')))].sort(),
        weights: [...new Set(faces.map(({ weight }) => Number(weight)))].sort(
          (left, right) => left - right,
        ),
        bodyFamily: window.getComputedStyle(document.body).fontFamily,
        headingFamily: window.getComputedStyle(heading).fontFamily,
      };
    });
    assert.deepEqual(typography.families, ['Lato', 'Open Sans']);
    assert.deepEqual(typography.weights, [400, 500, 600, 700]);
    assert.match(typography.bodyFamily, /Open Sans/);
    assert.match(typography.headingFamily, /Lato/);
  },
);
Then(
  'Home Property Management Real Estate Construction Storage and Development render theme-backed card and action primitives',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const route of [
      '/',
      '/property-management',
      '/real-estate',
      '/construction',
      '/storage',
      '/development',
    ]) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'ds-21');
      await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
      await expect(page.locator('[data-slot="button"]:visible').first()).toBeVisible();
    }
  },
);
Then(
  'division hero statistics use the shared inverse theme surface',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const route of [
      '/property-management',
      '/real-estate',
      '/construction',
      '/storage',
      '/development',
    ]) {
      await page.goto(route);
      const hero = page.locator('section').first();
      await expect(hero).toHaveClass(/bg-sidebar/);
      const stats = hero.locator('[data-slot="editable-collection-items"] strong');
      await expect(stats.first()).toBeVisible();
      assert.ok((await stats.count()) >= 2);
      await expect(stats.first()).toHaveCSS('color', 'oklch(1 0 0)');
    }
  },
);
Then(
  'Construction sector actions use the shared primary action role when editable',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await page.goto('/construction');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    const actions = page.locator('#projects a .text-primary, #completed-projects a .text-primary');
    await expect(actions).toHaveCount(16);
    for (const action of await actions.all()) {
      await expect(action).toHaveClass(/text-primary/);
      await expect(action).toBeVisible();
    }
  },
);

const reviewPlatformSamples = [
  '/real-estate',
  '/property-management',
  '/construction',
  '/storage',
  '/development',
] as const;

Then(
  'unready public review destinations are hidden across divisions',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const route of reviewPlatformSamples) {
      await page.goto(route);
      const cards = page.locator('#reviews [data-review-platform-card="true"]');
      await expect(cards).toHaveCount(0);
      await expect(
        page.locator('#reviews').getByRole('heading', { name: 'Share feedback privately' }),
      ).toBeVisible();
      await expect(page.locator('#reviews').getByRole('link', { name: /@/ })).toBeVisible();
    }
  },
);

Then(
  'testimonial editors require explicit public visibility decisions',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/property-management');
    await expect(page.locator('#client-stories')).toHaveCount(0);
    await expect(page.getByText('Jennifer Martinez', { exact: true })).toHaveCount(0);
    await page.goto('/real-estate');
    await expect(page.getByText('Michael Anderson', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Sarah Thompson', { exact: true })).toHaveCount(0);
    await loginEditor(page);
    for (const route of ['/property-management', '/real-estate']) {
      await page.goto(route);
      await page.getByRole('button', { name: 'Enter edit mode' }).click();
      const item =
        route === '/property-management'
          ? page.locator('#client-stories [data-slot=editable-item]').first()
          : page.locator('[data-slot=editable-item]').filter({ hasText: 'Michael Anderson' });
      await item.getByRole('button', { name: /^Edit / }).click();
      const sheet = page.getByRole('dialog');
      await expect(sheet.getByLabel('Public visibility')).toHaveValue('legacy');
      await sheet.getByRole('button', { name: 'Cancel' }).click();
      await page
        .getByRole('complementary', { name: 'Content editor' })
        .getByRole('button', { name: 'Exit edit mode' })
        .click();
    }
  },
);

Then(
  'edit mode retains review platform and testimonial cards on the shared Card contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await page.goto('/real-estate');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    await expect(page.getByText('Michael Anderson', { exact: true })).toBeVisible();
    await expect(page.getByText('Sarah Thompson', { exact: true })).toBeVisible();
    const cards = page.locator('#reviews [data-review-platform-card="true"]');
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute('data-slot', 'card');
      await expect(card.getByRole('heading')).toBeVisible();
      const description = card.locator('[data-slot="card-content"] p');
      await expect(description).toHaveCSS('font-size', '14px');
      await expect(description).toBeVisible();
    }
    await page.goto('/property-management');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByText('Jennifer Martinez', { exact: true })).toBeVisible();
    await expect(page.locator('#client-stories [data-slot="card"]')).toHaveCount(4);
    await page.goto('/real-estate');
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
  },
);

Then('editable review cards remain compact on mobile', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = page.locator('#reviews [data-review-platform-card="true"]');
  await expect(mobile).toHaveCount(3);
  const mobileLayout = await mobile.evaluateAll((cards) => ({
    lefts: cards.map((card) => Math.round(card.getBoundingClientRect().left)),
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(new Set(mobileLayout.lefts).size, 1);
  assert.ok(mobileLayout.scrollWidth <= mobileLayout.viewport);
});

const profileCardSamples = [
  { route: '/', count: 4, available: 4, unavailable: 0 },
  { route: '/real-estate', count: 5, available: 5, unavailable: 0 },
  { route: '/construction', count: 3, available: 3, unavailable: 0 },
  { route: '/property-management', count: 2, available: 2, unavailable: 0 },
  { route: '/storage', count: 4, available: 4, unavailable: 0 },
  { route: '/development', count: 3, available: 3, unavailable: 0 },
] as const;

Then(
  'all six pages expose one shared profile card contract and Home uses the division badge treatment',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of profileCardSamples) {
      await page.goto(sample.route);
      const cards = page.locator('[data-profile-card="true"]');
      await expect(cards).toHaveCount(sample.count);
      for (const card of await cards.all()) {
        await expect(card).toHaveAttribute('data-slot', 'card');
        await expect(card.getByRole('heading')).toBeVisible();
      }
    }
    await page.goto('/');
    await expect(page.getByText('A Utah family of companies', { exact: true })).toHaveClass(
      /bg-sidebar-accent/,
    );
  },
);

Then(
  'available portraits display without additional zoom while unavailable portraits use one neutral accessible fallback',
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
        const portrait = media.locator('img');
        await expect(portrait).toHaveCSS('object-fit', 'contain');
        await expect(portrait).toHaveCSS('aspect-ratio', '4 / 5');
        await portrait.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            portrait.evaluate((element) =>
              element instanceof HTMLImageElement ? element.naturalWidth : 0,
            ),
          )
          .toBeGreaterThan(0);
      }
      for (const media of await unavailable.all()) {
        await expect(media.getByRole('img')).toHaveAttribute('aria-label', /.+/);
        await expect(media.locator('img')).toHaveCount(0);
      }
    }
    await loginEditor(page);
    await page.goto('/property-management');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.locator('#team [data-profile-card="true"]')).toHaveCount(4);
    await expect(page.locator('#team [data-profile-media-state="unavailable"]')).toHaveCount(2);
    await page.setViewportSize({ width: 1425, height: 900 });
    await page
      .getByRole('complementary', { name: 'Content editor' })
      .getByRole('button', { name: 'Exit edit mode' })
      .click();
  },
);

Then(
  'every frozen Real Estate agent portrait resolves from managed media',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/real-estate');
    const expectedPortraits = [
      ['Michael Thornton', 'michael-thornton', 'jpg'],
      ['Ben Beesley', 'ben-beesley', 'jpg'],
      ['Shauna Ayers', 'shauna-thomas', 'png'],
      ['Robert Ayers', 'robert-ayers', 'png'],
      ['Stacie Papanikolas', 'stacie-papanikolas', 'jpg'],
    ] as const;
    const cards = page.locator('#team [data-profile-card="true"]');
    for (const [name, fileStem, extension] of expectedPortraits) {
      const card = cards.filter({ has: page.getByRole('heading', { name, exact: true }) });
      await expect(card).toHaveCount(1);
      const portrait = card.locator('img');
      await expect(portrait).toBeVisible();
      await portrait.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          portrait.evaluate((element) =>
            element instanceof HTMLImageElement ? element.naturalWidth : 0,
          ),
        )
        .toBeGreaterThan(0);
      const media = await portrait.evaluate((element) => ({
        width: element instanceof HTMLImageElement ? element.naturalWidth : 0,
        source: element instanceof HTMLImageElement ? new URL(element.currentSrc).pathname : '',
      }));
      assert.ok(media.width > 0);
      assert.match(media.source, new RegExp('/assets/' + fileStem + '-[^/]+\\.' + extension + '$'));
    }
  },
);
Then(
  'Real Estate team categories are directly browseable with concise profiles on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/real-estate');
    const tabs = page.locator('#team').getByRole('tablist', { name: 'Real Estate team category' });
    await expect(tabs.getByRole('tab')).toHaveCount(3);
    for (const [label, count] of [
      ['Leadership', 3],
      ['Our Team', 1],
      ['Our Agents', 5],
    ] as const) {
      const tab = tabs.getByRole('tab', { name: label, exact: true });
      await tab.focus();
      await page.keyboard.press('Enter');
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#team [data-profile-card="true"]')).toHaveCount(count);
    }
    const profiles = page.locator('#team [data-profile-card="true"]');
    await expect(profiles.locator('details')).toHaveCount(5);
    await profiles.first().getByText('Read full bio').click();
    await expect(profiles.first().locator('details')).toHaveAttribute('open', '');
  },
);

Then(
  'profile cards remain balanced at desktop and mobile widths and retain their geometry in edit mode',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of profileCardSamples) {
      await page.setViewportSize({ width: 1425, height: 900 });
      await page.goto(sample.route);
      const desktop = page.locator('[data-profile-card="true"]');
      await expect(desktop).toHaveCount(sample.count);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(sample.route);
      const mobile = page.locator('[data-profile-card="true"]');
      await expect(mobile).toHaveCount(sample.count);
      const layout = await mobile.evaluateAll((cards) => ({
        lefts: cards.map((card) => Math.round(card.getBoundingClientRect().left)),
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.equal(new Set(layout.lefts).size, 1);
      assert.ok(layout.scrollWidth <= layout.viewport);
    }
    await page.setViewportSize({ width: 1425, height: 900 });
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
  { route: '/development', state: 'unavailable' },
] as const;

Then(
  'every division page except Home uses the shared Real Estate hero template',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const sample of divisionHeroMediaSamples) {
      await page.goto(sample.route);
      await expect(page.locator('[data-shared-division-hero="true"]')).toHaveCount(1);
      const media = page.locator('[data-division-hero-media="true"]');
      await expect(media).toHaveCount(1);
      await expect(media).toBeVisible();
      await expect(media).toHaveAttribute('data-media-state', sample.state);
      await expect(media).toHaveCSS('border-radius', '16px');
      await expect(media).toHaveCSS('overflow', 'hidden');
      await expect(media).toHaveCSS('box-shadow', 'rgba(15, 23, 41, 0.2) 0px 24px 55px 0px');
      const box = await media.boundingBox();
      assert.ok(box);
      assert.ok(box.x >= 720);
      assert.ok(box.width >= 648);
      assert.ok(Math.abs(box.width / box.height - 4 / 3) <= 0.01);
    }
    await page.goto('/');
    await expect(page.locator('[data-shared-division-hero="true"]')).toHaveCount(0);
  },
);

Then(
  'shared division hero tags and actions use the Real Estate presentation contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    const properties = [
      'color',
      'backgroundColor',
      'borderColor',
      'borderRadius',
      'fontWeight',
      'height',
      'paddingInline',
    ] as const;
    const snapshots: Record<string, string>[] = [];
    for (const route of divisionHeroMediaSamples.map(({ route }) => route)) {
      await page.goto(route);
      const tag = page.locator('.ui-division-hero-tag').first();
      const primary = page.locator('.ui-division-hero-actions .ui-button-gold');
      const secondary = page.locator('.ui-division-hero-actions .ui-button-outline');
      await expect(tag).toBeVisible();
      await expect(primary).toBeVisible();
      await expect(secondary).toBeVisible();
      for (const locator of [tag, primary, secondary]) {
        snapshots.push(
          await locator.evaluate((element, names) => {
            const styles = getComputedStyle(element);
            return Object.fromEntries(names.map((name) => [name, styles[name]]));
          }, properties),
        );
      }
    }
    const reference = snapshots.slice(0, 3);
    for (let index = 3; index < snapshots.length; index += 1)
      assert.deepEqual(snapshots[index], reference[index % 3]);
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
        headingMargin: '48px',
      },
      {
        route: '/property-management',
        page: '.pm-page',
        section: '.pm-section',
        heading: '.pm-section-heading',
        headingMargin: '64px',
      },
      {
        route: '/development',
        page: '.dev-page',
        section: '.dev-section',
        heading: '.dev-heading',
        headingMargin: '48px',
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
      assert.equal(headingStyles.marginBottom, expectation.headingMargin);
    }
  },
);

Then(
  'representative service cards use the shared vertical density and readable copy measure',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const expectations = [
      {
        route: '/real-estate',
        card: '#services .re-card',
        padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
      },
      {
        route: '/property-management',
        card: '#services .pm-card',
        padding: { top: '30px', right: '24px', bottom: '24px', left: '24px' },
      },
      {
        route: '/development',
        card: '#projects .dev-card',
        padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
      },
    ] as const;

    for (const expectation of expectations) {
      await page.goto(expectation.route);
      await page.setViewportSize({ width: 1440, height: 1100 });
      const card = page.locator(expectation.card).first();
      await expect(card).toBeVisible();
      const geometry = await card.evaluate((element) => {
        const cardStyles = getComputedStyle(element);
        const copy = element.querySelector('p');
        const title = element.querySelector('h3');
        if (!(copy instanceof HTMLElement) || !(title instanceof HTMLElement)) return null;
        const copyStyles = getComputedStyle(copy);
        const titleStyles = getComputedStyle(title);
        return {
          minHeight: cardStyles.minHeight,
          paddingTop: cardStyles.paddingTop,
          paddingRight: cardStyles.paddingRight,
          paddingBottom: cardStyles.paddingBottom,
          paddingLeft: cardStyles.paddingLeft,
          copyMaxWidth: copyStyles.maxWidth,
          copyLineHeight: Number.parseFloat(copyStyles.lineHeight),
          titleLetterSpacing: titleStyles.letterSpacing,
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
          paddingTop: expectation.padding.top,
          paddingRight: expectation.padding.right,
          paddingBottom: expectation.padding.bottom,
          paddingLeft: expectation.padding.left,
        },
      );
      const copyMaxWidth = Number.parseFloat(geometry.copyMaxWidth);
      assert.ok(copyMaxWidth >= 300 && copyMaxWidth <= 390);
      assert.ok(geometry.copyLineHeight >= 24);
      assert.equal(geometry.titleLetterSpacing, '-0.5px');
    }
  },
);

Then(
  'shared card title roles preserve the reference hierarchy',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const boldTitles = [
      { route: '/', selector: '.ui-division-card h3', size: '24px', lineHeight: '32px' },
      { route: '/', selector: '.ui-value h3', size: '20px', lineHeight: '28px' },
      { route: '/', selector: '.ui-career-card h3', size: '16px', lineHeight: '24px' },
      { route: '/construction', selector: '.ui-sector h3', size: '18px', lineHeight: '28px' },
      { route: '/storage', selector: '.ui-team-card h3', size: '20px', lineHeight: '28px' },
      { route: '/development', selector: '.ui-values h3', size: '18px', lineHeight: '28px' },
    ] as const;
    for (const expectation of boldTitles) {
      await page.goto(expectation.route);
      const title = page.locator(expectation.selector).first();
      await expect(title).toBeVisible();
      await expect(title).toHaveCSS('font-size', expectation.size);
      await expect(title).toHaveCSS('line-height', expectation.lineHeight);
      await expect(title).toHaveCSS('font-weight', '700');
    }

    for (const expectation of [
      { route: '/construction', selector: '#services .type-card-title' },
      { route: '/storage', selector: '.ui-services .type-card-title' },
      { route: '/development', selector: '.ui-service-grid .type-card-title' },
    ] as const) {
      await page.goto(expectation.route);
      const title = page.locator(expectation.selector).first();
      await expect(title).toHaveCSS('font-size', '20px');
      await expect(title).toHaveCSS('line-height', '28px');
      await expect(title).toHaveCSS('font-weight', '600');
      await expect(title).toHaveCSS('letter-spacing', '-0.5px');
    }
  },
);

Then(
  'shared eyebrow compact action review form and footer roles preserve their reference type',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/construction');
    await expect(page.locator('.ui-heading > span').first()).toHaveCSS('font-weight', '500');
    const planAction = page.locator('.ui-plan button').first();
    await expect(planAction).toHaveCSS('font-size', '14px');
    await expect(planAction).toHaveCSS('line-height', '20px');
    await expect(planAction).toHaveCSS('font-weight', '500');

    const supportingTitles = [
      { route: '/construction', selector: '.review-platform-card h3', weight: '600' },
      { route: '/storage', selector: '.ui-contact-form h3', weight: '600' },
      { route: '/development', selector: '.ui-form-card h3', weight: '600' },
    ] as const;
    for (const expectation of supportingTitles) {
      await page.goto(expectation.route);
      const title = page.locator(expectation.selector).first();
      await expect(title).toHaveCSS(
        'font-size',
        expectation.selector.includes('review-') ? '20px' : '24px',
      );
      await expect(title).toHaveCSS(
        'line-height',
        expectation.selector.includes('review-') ? '28px' : '32px',
      );
      await expect(title).toHaveCSS('font-weight', expectation.weight);
    }

    for (const route of ['/real-estate', '/construction', '/storage', '/development'] as const) {
      await page.goto(route);
      const title = page.locator('.ui-footer h3').first();
      await expect(title).toHaveCSS('font-size', '18px');
      await expect(title).toHaveCSS('line-height', '28px');
    }
  },
);

Then(
  'compact and standard form controls use explicit shared reference geometry',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const compactControls = [
      { route: '/', selector: '.ui-resume-form input[name="name"]' },
      { route: '/', selector: '.ui-resume-form textarea[name="message"]' },
      { route: '/real-estate', selector: 'input[name="firstName"]' },
      { route: '/real-estate', selector: '#contact textarea[name="message"]' },
      { route: '/property-management', selector: 'input[name="firstName"]' },
      { route: '/property-management', selector: '#contact textarea[name="message"]' },
      { route: '/development', selector: 'input[name="firstName"]' },
      { route: '/development', selector: '#contact textarea[name="message"]' },
    ] as const;
    const standardControls = [
      { route: '/construction', selector: 'input[name="firstName"]' },
      { route: '/construction', selector: '#bid textarea[name="message"]' },
      { route: '/storage', selector: 'input[name="firstName"]' },
      { route: '/storage', selector: '#contact textarea[name="message"]' },
    ] as const;

    for (const expectation of compactControls) {
      await page.goto(expectation.route);
      const control = page.locator(expectation.selector).first();
      await expect(control).toHaveCSS('font-size', '14px');
      await expect(control).toHaveCSS('line-height', '20px');
      await expect(control).toHaveCSS('font-weight', '400');
      await expect(control).toHaveCSS('padding', '8px 12px');
      if (!expectation.selector.includes('textarea')) {
        await expect(control).toHaveCSS('height', '40px');
      }
    }

    for (const expectation of standardControls) {
      await page.goto(expectation.route);
      const control = page.locator(expectation.selector).first();
      await expect(control).toHaveCSS('font-size', '16px');
      await expect(control).toHaveCSS('line-height', '20px');
      await expect(control).toHaveCSS('font-weight', '400');
      await expect(control).toHaveCSS('padding', '8px 12px');
      if (!expectation.selector.includes('textarea')) {
        await expect(control).toHaveCSS('height', '40px');
      }
    }
  },
);

Then('Development semantic seeds preserve verified copy and omit unready identities', function () {
  assert.equal(
    developmentV2SeedData['development.hero'].description,
    'From raw land acquisition to finished communities, TriCo Development brings over 40 years of experience in residential and commercial development across Utah, Idaho, and Arizona.',
  );
  assert.equal(
    developmentV2SeedData['development.land-experts.header'].description,
    "With decades of experience in Utah's land market, we provide comprehensive expertise in buying, listing, and developing land across the state.",
  );
  assert.equal(
    developmentV2SeedData['development.services.header'].description,
    'From raw land acquisition to finished communities, TriCo Development transforms vision into reality with over 40 years of experience in residential and commercial development.',
  );
  assert.deepEqual(
    developmentV2SeedData['development.services.items'].map(({ description }) => description),
    [
      'Expert guidance in identifying and acquiring prime land parcels for residential and commercial development.',
      'End-to-end residential development from site selection and entitlement to construction oversight.',
      'Strategic commercial development including feasibility studies, zoning navigation, and project management.',
      'Raw land transformation including grading, utility installation, road infrastructure, and site preparation to ready parcels for vertical construction.',
      'Specialized development of self-storage facilities from site selection and feasibility to build-out, tailored for long-term investment performance.',
    ],
  );
  assert.deepEqual(
    developmentV2SeedData['development.projects.categories'].map(({ description }) => description),
    [
      'Explore our active development projects currently in progress across the region.',
      'See our portfolio of successfully completed residential and commercial developments.',
    ],
  );
  assert.equal(
    developmentV2SeedData['development.team.header'].description,
    "Meet the experienced professionals driving TriCo's development success.",
  );
  assert.deepEqual(
    developmentV2SeedData['development.team.members'].map(({ bio }) => bio),
    [
      "With over 40 years of experience in Utah real estate and development, Steve leads TriCo's vision for building thriving communities.",
      'Randy brings decades of development and construction expertise, overseeing project execution and strategic growth.',
      'Brooke oversees development operations and strategy, ensuring projects are delivered on time and to the highest standards.',
    ],
  );
  assert.equal(
    developmentV2SeedData['development.about'].introduction,
    "For over four decades, TriCo Development has been at the forefront of Utah's growth, transforming raw land into vibrant residential neighborhoods and successful commercial centers.",
  );
  assert.equal(
    developmentV2SeedData['development.about'].detail,
    "Our comprehensive approach combines deep local knowledge, strong contractor relationships, and a commitment to quality that has made us one of Utah's most trusted development partners.",
  );
  assert.equal(
    developmentV2SeedData['development.about.highlights'][3]?.value,
    'Proven track record of successful residential and commercial projects',
  );
  assert.equal(
    developmentV2SeedData['development.reviews.header'].description,
    'Your feedback helps us grow and lets others discover the TriCo difference. It only takes a minute — pick your favorite platform below.',
  );
  assert.deepEqual(developmentV2SeedData['development.partners.items'], []);
  assert.deepEqual(developmentV2SeedData['development.reviews.platforms'], []);
  assert.deepEqual(developmentV2SeedData['development.reviews.footer'], {
    message: 'Prefer to share feedback privately? Email us at',
    email: 'Office@tricoinc.com',
    closingMessage: '— we read every message.',
  });
});
Then(
  'Development project types and featured work are directly browseable from the hero action',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const tabs = page
      .locator('#projects')
      .getByRole('tablist', { name: 'Development project view' });
    await page.getByRole('link', { name: 'View Our Projects' }).first().click();
    const tabPosition = await tabs.boundingBox();
    assert.ok(tabPosition !== null);
    assert.ok(tabPosition.y >= 0 && tabPosition.y < 844 - tabPosition.height);
    await expect(tabs.getByRole('tab')).toHaveCount(2);
    const types = tabs.getByRole('tab', { name: 'Project types' });
    await types.focus();
    await page.keyboard.press('Enter');
    await expect(types).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.locator('#projects').getByRole('tabpanel').locator('[data-slot="card"]'),
    ).not.toHaveCount(0);
  },
);

Then(
  'Development headings hero prose and feedback use measured rhythm roles',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 1100 });
    const heroDescription = page.locator('.ui-division-hero-description');
    await expect(heroDescription).toHaveCSS('max-width', '670px');
    await expect(heroDescription).toHaveCSS('font-size', '20px');
    await expect(heroDescription).toHaveCSS('line-height', '28px');
    const headingGaps = [
      { selector: '#services .ui-heading-gap-standard', margin: '48px' },
      { selector: '#projects .ui-heading-gap-spacious', margin: '64px' },
      { selector: '#team .ui-heading-gap-standard', margin: '48px' },
      { selector: '#reviews .ui-heading-gap-review', margin: '56px' },
    ] as const;
    for (const expectation of headingGaps) {
      await expect(page.locator(expectation.selector)).toHaveCSS(
        'margin-bottom',
        expectation.margin,
      );
    }
    await expect(page.locator('.ui-about-prose-lead')).toHaveCSS('margin-bottom', '24px');
    await expect(page.locator('.ui-about-prose-detail')).toHaveCSS('margin-bottom', '32px');
    const feedback = page.locator('.ui-feedback-footer');
    await expect(feedback).toHaveCSS('max-width', '672px');
    await expect(feedback).toHaveCSS('margin-top', '40px');
    await expect(feedback).toHaveCSS('line-height', '20px');
  },
);

Then(
  'Development profile and review cards use their measured densities',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const profileBody = page
      .locator('#team .ui-profile-density-compact .profile-card-body')
      .first();
    await expect(profileBody).toHaveCSS('min-height', '196px');
    for (const card of await page.locator('#reviews .review-platform-card').all()) {
      await expect(card).toHaveCSS('min-height', '282px');
    }
  },
);

Then(
  'Development team cards preserve the frozen editorial profile presentation',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const cards = page.locator('#team .profile-card');
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      await expect(card).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.5)');
      await expect(card).toHaveCSS('border-color', 'rgba(229, 231, 235, 0.5)');
      await expect(card).toHaveCSS('border-radius', '8px');
      await expect(card).toHaveCSS(
        'box-shadow',
        'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
      );
      const body = card.locator('.profile-card-body');
      await expect(body).toHaveCSS('align-items', 'flex-start');
      await expect(body).toHaveCSS('text-align', 'start');
      const name = body.locator('h3');
      await expect(name).toHaveCSS('width', '270px');
      await expect(name).toHaveCSS('margin', '0px 0px 4px');
      const role = body.locator('strong');
      await expect(role).toHaveCSS('color', 'rgb(94, 133, 186)');
      await expect(role).toHaveCSS('font-size', '16px');
      await expect(role).toHaveCSS('font-weight', '500');
      await expect(role).toHaveCSS('line-height', '24px');
      await expect(role).toHaveCSS('margin', '0px 0px 12px');
      const biography = body.locator(':scope > p');
      await expect(biography).toHaveCSS('font-size', '14px');
      await expect(biography).toHaveCSS('line-height', '20px');
      await expect(biography).toHaveCSS('text-align', 'start');
    }
  },
);

Then(
  'Development supporting surfaces preserve the frozen gradient strengths',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const supportingGradient =
      'linear-gradient(to right bottom, rgba(30, 58, 138, 0.2), rgba(255, 255, 255, 0.3), rgba(30, 58, 138, 0.1))';
    for (const selector of ['#services', '#team'] as const) {
      await expect(page.locator(selector)).toHaveCSS('background-image', supportingGradient);
    }
    await expect(page.locator('#contact')).toHaveCSS(
      'background-image',
      'linear-gradient(to right bottom, rgba(30, 58, 138, 0.1), rgba(243, 244, 246, 0.3), rgba(30, 58, 138, 0.05))',
    );
  },
);

Then(
  'the Development contact form preserves the frozen compact field rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.evaluate(() => document.fonts.ready);

    const form = page.locator('#contact .ui-form-presentation-compact');
    await expect(form).toHaveCount(1);
    const formBox = await form.boundingBox();
    assert.ok(formBox);
    assert.ok(Math.abs(formBox.width - 586) <= 1, `contact form was ${formBox.width}px wide`);
    assert.ok(Math.abs(formBox.height - 454) <= 1, `contact form was ${formBox.height}px tall`);

    const labels = form.locator('label');
    await expect(labels).toHaveCount(6);
    for (const label of await labels.all()) {
      await expect(label).toHaveCSS('display', 'block');
      await expect(label).toHaveCSS('font-size', '14px');
      await expect(label).toHaveCSS('font-weight', '500');
      await expect(label).toHaveCSS('line-height', '20px');
      await expect(label).toHaveCSS('margin-bottom', '8px');
    }

    for (const input of await form.locator('input').all()) {
      const inputBox = await input.boundingBox();
      assert.ok(inputBox);
      assert.ok(Math.abs(inputBox.height - 40) <= 1, `contact input was ${inputBox.height}px tall`);
    }
    const textarea = form.locator('textarea');
    const textareaBox = await textarea.boundingBox();
    assert.ok(textareaBox);
    assert.ok(
      Math.abs(textareaBox.height - 98) <= 1,
      `contact textarea was ${textareaBox.height}px tall`,
    );

    const submit = form.getByRole('button', { name: 'Get Started' });
    const submitBox = await submit.boundingBox();
    assert.ok(submitBox);
    assert.ok(
      Math.abs(submitBox.y - formBox.y - 410) <= 1,
      `contact submit began ${submitBox.y - formBox.y}px below the form`,
    );
    assert.ok(
      Math.abs(submitBox.height - 44) <= 1,
      `contact submit was ${submitBox.height}px tall`,
    );
    await expect(submit).toHaveCSS('line-height', '20px');
    await expect(submit).toHaveCSS('border-top-width', '0px');
  },
);

Then(
  'Development partners use the frozen desktop composition',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.evaluate(() => document.fonts.ready);

    const section = page.locator('.ui-partner-composition-reference');
    const heading = section.locator('.ui-partner-heading-reference');
    const eyebrow = heading.locator('.ui-partner-eyebrow-reference');
    const description = heading.locator('.ui-partner-description-reference');
    const grid = section.locator('.ui-partner-grid-reference');
    const cards = grid.locator('.ui-partner-card-reference');
    const footer = section.locator('.ui-partner-footer-reference');
    const [sectionBox, headingBox, eyebrowBox, descriptionBox, gridBox, footerBox] =
      await Promise.all([
        section.boundingBox(),
        heading.boundingBox(),
        eyebrow.boundingBox(),
        description.boundingBox(),
        grid.boundingBox(),
        footer.boundingBox(),
      ]);
    assert.ok(sectionBox && headingBox && eyebrowBox && descriptionBox && gridBox && footerBox);
    assert.ok(Math.abs(sectionBox.height - 530) <= 2, `partner section was ${sectionBox.height}px`);
    assert.ok(
      Math.abs(headingBox.width - 1368) <= 1,
      `partner heading was ${headingBox.width}px wide`,
    );
    assert.ok(
      Math.abs(headingBox.height - 174) <= 1,
      `partner heading was ${headingBox.height}px tall`,
    );
    assert.ok(
      Math.abs(eyebrowBox.height - 38) <= 1,
      `partner eyebrow was ${eyebrowBox.height}px tall`,
    );
    assert.ok(
      Math.abs(descriptionBox.width - 672) <= 1,
      `partner description was ${descriptionBox.width}px wide`,
    );
    assert.ok(
      Math.abs(descriptionBox.height - 56) <= 1,
      `partner description was ${descriptionBox.height}px tall`,
    );
    assert.ok(Math.abs(gridBox.width - 1024) <= 1, `partner grid was ${gridBox.width}px wide`);
    assert.ok(Math.abs(gridBox.height - 96) <= 1, `partner grid was ${gridBox.height}px tall`);
    assert.ok(
      Math.abs(footerBox.height - 20) <= 1,
      `partner footer was ${footerBox.height}px tall`,
    );

    await expect(section).toHaveCSS('padding-top', '80px');
    await expect(section).toHaveCSS('padding-bottom', '80px');
    await expect(heading).toHaveCSS('margin-bottom', '48px');
    await expect(eyebrow).toHaveCSS('padding', '8px 16px');
    await expect(eyebrow).toHaveCSS('gap', '8px');
    await expect(eyebrow).toHaveCSS('margin-bottom', '24px');
    await expect(eyebrow).toHaveCSS('font-size', '14px');
    await expect(eyebrow).toHaveCSS('line-height', '20px');
    await expect(description).toHaveCSS('font-size', '18px');
    await expect(description).toHaveCSS('line-height', '28px');
    await expect(grid).toHaveCSS('column-gap', '24px');
    await expect(grid).toHaveCSS(
      'grid-template-columns',
      '150.656px 150.672px 150.672px 150.656px 150.672px 150.672px',
    );
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      const box = await card.boundingBox();
      assert.ok(box);
      assert.ok(Math.abs(box.height - 96) <= 1, `partner card was ${box.height}px tall`);
      await expect(card).toHaveCSS('padding', '24px');
      await expect(card).toHaveCSS('font-size', '14px');
      await expect(card).toHaveCSS('line-height', '20px');
    }
    await expect(footer).toHaveCSS('margin-top', '32px');
    await expect(footer).toHaveCSS('font-size', '14px');
    await expect(footer).toHaveCSS('line-height', '20px');
  },
);

Then('Development partners remain contained on mobile', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const section = page.locator('.ui-partner-composition-reference');
  const grid = section.locator('.ui-partner-grid-reference');
  const geometry = await section.evaluate((element) => {
    const gridElement = element.querySelector('.ui-partner-grid-reference');
    if (!(gridElement instanceof HTMLElement)) throw new Error('Partner grid is missing.');
    const sectionRect = element.getBoundingClientRect();
    const gridRect = gridElement.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      gridLeft: gridRect.left,
      gridRight: gridRect.right,
      sectionLeft: sectionRect.left,
      sectionRight: sectionRect.right,
    };
  });
  assert.equal(geometry.documentWidth, 390);
  assert.ok(geometry.sectionLeft >= 0 && geometry.sectionRight <= 390);
  assert.ok(geometry.gridLeft >= 0 && geometry.gridRight <= 390);
  const columns = await grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(' '),
  );
  assert.equal(columns.length, 2);
});

Then('Development About uses the frozen desktop composition', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator('#about');
  const grid = section.locator('.dev-about-grid');
  const [sectionBox, gridBox] = await Promise.all([section.boundingBox(), grid.boundingBox()]);
  assert.ok(sectionBox && gridBox);
  assert.ok(Math.abs(sectionBox.height - 744) <= 2, `About section was ${sectionBox.height}px`);
  assert.ok(Math.abs(gridBox.width - 1152) <= 1, `About grid was ${gridBox.width}px wide`);
  assert.ok(Math.abs(gridBox.height - 552) <= 2, `About grid was ${gridBox.height}px tall`);
  await expect(grid).toHaveCSS('column-gap', '48px');
  await expect(grid).toHaveCSS('grid-template-columns', '552px 552px');
});

Then(
  'Development About remains contained with transparent editor wrappers on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const section = page.locator('#about');
    const grid = section.locator('.dev-about-grid');
    const geometry = await section.evaluate((element) => {
      const gridElement = element.querySelector('.dev-about-grid');
      if (!(gridElement instanceof HTMLElement)) throw new Error('About grid is missing.');
      const sectionRect = element.getBoundingClientRect();
      const gridRect = gridElement.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        gridLeft: gridRect.left,
        gridRight: gridRect.right,
        sectionLeft: sectionRect.left,
        sectionRight: sectionRect.right,
      };
    });
    assert.equal(geometry.documentWidth, 390);
    assert.ok(geometry.sectionLeft >= 0 && geometry.sectionRight <= 390);
    assert.ok(geometry.gridLeft >= 0 && geometry.gridRight <= 390);
    await expect(grid).toHaveCSS('grid-template-columns', '358px');
    const wrappers = grid.locator(
      '.dev-entity-slot, [data-entity-boundary="true"], .editable-collection-items',
    );
    assert.ok((await wrappers.count()) > 0);
    for (const wrapper of await wrappers.all())
      await expect(wrapper).toHaveCSS('display', 'contents');
  },
);

Then(
  'Home uses the frozen desktop content frame and section rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 1100 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const frame = await page.locator('.home-hero .home-container').boundingBox();
    assert.ok(frame);
    assert.deepEqual(
      { x: Math.round(frame.x), width: Math.round(frame.width) },
      { x: 72, width: 1368 },
    );
    for (const section of await page.locator('.home-section').all()) {
      await expect(section).toHaveCSS('padding-top', '96px');
      await expect(section).toHaveCSS('padding-bottom', '96px');
    }

    await page.setViewportSize({ width: 1440, height: 1100 });
    const compactFrame = await page.locator('.home-hero .home-container').boundingBox();
    assert.ok(compactFrame);
    assert.deepEqual(
      { x: Math.round(compactFrame.x), width: Math.round(compactFrame.width) },
      { x: 36, width: 1368 },
    );
  },
);

Then(
  'Home hero and section descriptions use their measured type roles',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 1100 });
    const heroDescription = page.locator('.home-hero p');
    await expect(heroDescription).toHaveCSS('font-size', '20px');
    await expect(heroDescription).toHaveCSS('line-height', '28px');
    await expect(heroDescription).toHaveCSS('max-width', '768px');

    const descriptions = page.locator(
      '.home-divisions .home-section-heading > p, .home-values .home-section-heading > p, .home-leadership .home-section-heading > p, .home-news .home-section-heading > p, .ui-shared-careers .ui-section-heading > p',
    );
    assert.equal(await descriptions.count(), 5);
    for (const description of await descriptions.all()) {
      await expect(description).toHaveCSS('font-size', '16px');
      await expect(description).toHaveCSS('line-height', '24px');
      await expect(description).toHaveCSS('max-width', '672px');
    }
  },
);

Then('Home resume actions use one grid spacing contract', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const form = page.locator('.ui-resume-form');
  const action = form.getByRole('button', { name: 'Submit Resume' });
  await expect(form).toHaveCSS('row-gap', '20px');
  await expect(action).toHaveCSS('margin-top', '0px');
  const previous = action.locator('xpath=preceding-sibling::*[1]');
  const previousBox = await previous.boundingBox();
  const actionBox = await action.boundingBox();
  assert.ok(previousBox);
  assert.ok(actionBox);
  assert.ok(
    Math.abs(actionBox.y - (previousBox.y + previousBox.height) - 20) <= 1,
    'The resume action must use the form grid gap without an additional margin.',
  );
});

Then(
  'Home timeline uses the measured desktop tracks and copy density',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const intro = page.locator('.home-journey .home-history');
    await expect(intro).toHaveCSS('font-size', '14px');
    await expect(intro).toHaveCSS('line-height', '22.75px');

    const grid = page.locator('.home-journey .editable-collection-items');
    const gridBox = await grid.boundingBox();
    assert.ok(gridBox);
    assert.deepEqual(
      { x: Math.round(gridBox.x), width: Math.round(gridBox.width) },
      { x: 180, width: 1152 },
    );
    const cards = await grid
      .locator('.home-timeline-card')
      .evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().width)),
      );
    assert.deepEqual(
      cards,
      Array.from({ length: 8 }, () => 144),
    );
  },
);

Then(
  'Property Management broad sections use the frozen desktop frame',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 1100 });
    await page.goto('/property-management');
    await page.evaluate(() => document.fonts.ready);
    for (const selector of [
      '#services > .pm-container',
      '#process > .pm-container',
      '#managed-properties > .pm-container',
      '.pm-testimonials > .pm-container',
      '#reviews > .pm-container',
    ]) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box);
      assert.deepEqual(
        { x: Math.round(box.x), width: Math.round(box.width) },
        { x: 72, width: 1368 },
      );
    }
  },
);

Then(
  'the Property Management portal uses the measured frame card and action density',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const portal = page.locator('#tenant-portal');
    const section = await portal.boundingBox();
    const frame = await portal.locator(':scope > .pm-container').boundingBox();
    const grid = await portal.locator('.editable-collection-items').boundingBox();
    assert.ok(section);
    assert.ok(frame);
    assert.ok(grid);
    assert.deepEqual(
      {
        sectionHeight: Math.round(section.height),
        frame: { x: Math.round(frame.x), width: Math.round(frame.width) },
        grid: { x: Math.round(grid.x), width: Math.round(grid.width) },
      },
      {
        sectionHeight: 774,
        frame: { x: 244, width: 1024 },
        grid: { x: 244, width: 1024 },
      },
    );
    for (const card of await portal.locator('.pm-card').all()) {
      await expect(card).toHaveCSS('min-height', '181px');
    }
    const action = portal.getByRole('link', { name: 'Access Tenant Portal' });
    await expect(action).toHaveCSS('height', '60px');
    await expect(action).toHaveCSS('font-weight', '600');
    await expect(action).toHaveCSS('line-height', '28px');
    await expect(action).toHaveCSS('border-radius', '8px');
  },
);

Then(
  'Property Management reviews use the measured grid and feedback rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const reviews = page.locator('#reviews');
    const section = await reviews.boundingBox();
    const grid = await reviews.locator('.editable-collection-items').boundingBox();
    assert.ok(section);
    assert.ok(grid);
    assert.deepEqual(
      {
        sectionHeight: Math.round(section.height),
        grid: { x: Math.round(grid.x), width: Math.round(grid.width) },
      },
      { sectionHeight: 818, grid: { x: 244, width: 1024 } },
    );
    const feedback = reviews.locator('.pm-reviews-footer');
    await expect(feedback).toHaveCSS('max-width', '672px');
    await expect(feedback).toHaveCSS('font-size', '14px');
    await expect(feedback).toHaveCSS('line-height', '20px');
    await expect(feedback).toHaveCSS('margin-top', '40px');
    await expect(feedback.getByRole('link')).toHaveCSS('text-decoration-line', 'none');
  },
);

Then(
  'Property Management contact uses the compact copy detail and form contracts',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const contact = page.locator('#contact');
    const section = await contact.boundingBox();
    assert.ok(section);
    assert.equal(Math.round(section.height), 996);
    const intro = contact.locator('.pm-section-heading p');
    await expect(intro).toHaveCSS('font-size', '18px');
    await expect(intro).toHaveCSS('line-height', '28px');
    await expect(intro).toHaveCSS('margin-bottom', '32px');
    for (const title of await contact.locator('.pm-contact-detail h3').all()) {
      await expect(title).toHaveCSS('font-size', '16px');
      await expect(title).toHaveCSS('line-height', '24px');
      await expect(title).toHaveCSS('font-weight', '600');
    }
    const form = contact.locator('form');
    const formBox = await form.boundingBox();
    assert.ok(formBox);
    assert.equal(Math.round(formBox.height), 454);
    await expect(form).toHaveCSS('row-gap', '20px');
    await expect(form.getByRole('button', { name: 'Get Free Analysis' })).toHaveCSS(
      'margin-top',
      '0px',
    );
  },
);

Then(
  'Property Management testimonial and FAQ rows use their measured type and density',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const title of await page.locator('.pm-testimonials .pm-quote-card h3').all()) {
      await expect(title).toHaveCSS('font-size', '16px');
      await expect(title).toHaveCSS('line-height', '24px');
      await expect(title).toHaveCSS('font-weight', '600');
    }
    const faq = page.locator('#faq');
    const faqBox = await faq.boundingBox();
    assert.ok(faqBox);
    assert.equal(Math.round(faqBox.height), 984);
    const rows = await faq
      .locator('.pm-faq-item')
      .evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().height)),
      );
    assert.deepEqual(
      rows,
      Array.from({ length: 6 }, () => 78),
    );
  },
);

const elementWidth = async (locator: ReturnType<Page['locator']>): Promise<number> =>
  locator.evaluate((element) => element.getBoundingClientRect().width);

const expectNear = (actual: number, expected: number, label: string): void => {
  assert.ok(
    Math.abs(actual - expected) <= 2,
    `${label} measured ${String(actual)}px; expected ${String(expected)}px ±2px.`,
  );
};

Then(
  'the Home resume division uses the measured accessible selection control',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const nativeSelect = page.locator('.ui-resume-form select[name="division"]');
    const nativeBox = await nativeSelect.boundingBox();
    assert.ok(nativeBox);
    assert.deepEqual(
      { width: Math.round(nativeBox.width), height: Math.round(nativeBox.height) },
      { width: 1, height: 1 },
    );
    await expect(nativeSelect).toHaveAttribute('aria-hidden', 'true');
    await expect(nativeSelect).toHaveAttribute('tabindex', '-1');
    const trigger = page.getByRole('combobox', { name: 'Division of Interest *' });
    const triggerBox = await trigger.boundingBox();
    assert.ok(triggerBox);
    assert.deepEqual(
      { width: Math.round(triggerBox.width), height: Math.round(triggerBox.height) },
      { width: 342, height: 40 },
    );
    await expect(trigger).toHaveText('Select a division');
  },
);

Then(
  'the shared selection control supports focus choice and form serialization',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const select = page.getByRole('combobox', { name: 'Division of Interest *' });
    const form = page.locator('#career-application-form');
    await expect(select).toHaveValue('');
    assert.equal(
      await form.evaluate((node) => new FormData(node as HTMLFormElement).get('division')),
      '',
    );
    await select.focus();
    await expect(select).toBeFocused();
    await select.selectOption('Real Estate');
    await expect(select).toHaveValue('Real Estate');
    assert.equal(
      await form.evaluate((node) => new FormData(node as HTMLFormElement).get('division')),
      'Real Estate',
    );
    await select.selectOption('Construction');
    await expect(select).toHaveValue('Construction');
  },
);

Then(
  'Property Management Real Estate and Construction reuse the public selection contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const sample of [
      { route: '/property-management', label: "I'm interested in *", name: 'interest' },
      { route: '/real-estate', label: 'I’m interested in *', name: 'interest' },
      { route: '/construction', label: 'Project Type *', name: 'projectType' },
    ] as const) {
      await page.goto(sample.route);
      const select = page.getByRole('combobox', { name: sample.label }).first();
      await expect(select).toHaveAttribute('name', sample.name);
      await expect(select).toHaveValue('');
      const option = await select.locator('option').nth(1).getAttribute('value');
      assert.ok(option);
      await select.selectOption(option);
      await expect(select).toHaveValue(option);
    }
  },
);

Then(
  'the public selection contract remains usable and valid on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const select = page.getByRole('combobox', { name: 'Division of Interest *' });
    const box = await select.boundingBox();
    assert.ok(box);
    assert.ok(box.x >= 0 && box.x + box.width <= 390);
    await page.getByRole('button', { name: 'Submit Resume' }).click();
    await expect(select).toHaveAttribute('aria-invalid', 'true');
    await select.selectOption('Storage Management');
    await expect(select).toHaveValue('Storage Management');
  },
);

Then(
  'shared client forms use the frozen inquiry standard and wide measures',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    const expectations = [
      { route: '/', selector: '.ui-form-layout--inquiry', width: 702 },
      { route: '/real-estate', selector: '.ui-new-client .ui-form-layout--inquiry', width: 702 },
      {
        route: '/property-management',
        selector: '.ui-new-client .ui-form-layout--inquiry',
        width: 702,
      },
      { route: '/real-estate', selector: '.ui-contact .ui-form-layout--standard', width: 586 },
      {
        route: '/property-management',
        selector: '.ui-contact .ui-form-layout--standard',
        width: 586,
      },
      { route: '/construction', selector: '.ui-contact .ui-form-layout--standard', width: 586 },
      { route: '/storage', selector: '.ui-contact .ui-form-layout--standard', width: 586 },
      { route: '/development', selector: '.ui-contact .ui-form-layout--standard', width: 586 },
      { route: '/construction', selector: '.ui-bid .ui-form-layout--wide', width: 830 },
    ] as const;
    for (const expectation of expectations) {
      await page.goto(expectation.route);
      const form = page.locator(expectation.selector).first();
      await expect(form).toBeVisible();
      expectNear(await elementWidth(form), expectation.width, `${expectation.route} form`);
    }
  },
);

Then(
  'client form surfaces do not leak card padding into semantic forms',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const expectation of [
      { route: '/', selector: '.ui-resume-form' },
      { route: '/construction', selector: '.ui-bid .ui-form' },
      { route: '/storage', selector: '.ui-contact-form' },
    ] as const) {
      await page.goto(expectation.route);
      const form = page.locator(expectation.selector).first();
      await expect(form).toHaveClass(/ui-client-form/);
      await expect(form).toHaveCSS('padding', '0px');
      await expect(form).toHaveCSS('border-top-width', '0px');
    }
  },
);

Then(
  'client form submit actions use the frozen full-width and intrinsic geometry',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const route of [
      '/',
      '/real-estate',
      '/property-management',
      '/storage',
      '/development',
    ] as const) {
      await page.goto(route);
      const button = page.locator('.ui-submit-action--full').first();
      await expect(button).toHaveCSS('height', '44px');
      await expect(button).toHaveCSS('padding', '0px 32px');
      const form = button.locator('xpath=ancestor::form');
      expectNear(await elementWidth(button), await elementWidth(form), `${route} submit action`);
    }
    await page.goto('/construction');
    const bidButton = page.locator('.ui-bid .ui-submit-action--intrinsic');
    await expect(bidButton).toHaveCSS('height', '44px');
    assert.ok((await elementWidth(bidButton)) < 240);
  },
);

Then(
  'division contact grids use the shared desktop measure and gap',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const route of [
      '/real-estate',
      '/property-management',
      '/construction',
      '/storage',
      '/development',
    ] as const) {
      await page.goto(route);
      const grid = page.locator('.ui-contact-grid-standard').first();
      await expect(grid).toBeVisible();
      expectNear(await elementWidth(grid), 1368, `${route} contact grid`);
      await expect(grid).toHaveCSS('column-gap', '64px');
    }
  },
);

Then(
  'standard and compact division footers use the frozen grid and legal rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const route of ['/real-estate', '/construction', '/storage', '/development'] as const) {
      await page.goto(route);
      const footer = page.locator('.ui-footer-rhythm');
      const grid = footer.locator('.ui-footer-grid--standard');
      expectNear(await elementWidth(grid), 1368, `${route} footer grid`);
      await expect(grid).toHaveCSS('min-height', '284px');
      await expect(grid).toHaveCSS('column-gap', '48px');
      await expect(footer).toHaveCSS('padding-bottom', '64px');
      const legal = footer.locator('.ui-footer-legal-rhythm');
      await expect(legal).toHaveCSS('margin-top', '48px');
      const rhythm = await footer.evaluate((element) => {
        const gridElement = element.querySelector('.ui-footer-grid--standard');
        const legalElement = element.querySelector('.ui-footer-legal-rhythm');
        if (!(gridElement instanceof HTMLElement) || !(legalElement instanceof HTMLElement)) {
          throw new Error('Footer rhythm elements are missing.');
        }
        const footerRect = element.getBoundingClientRect();
        const gridRect = gridElement.getBoundingClientRect();
        const legalRect = legalElement.getBoundingClientRect();
        return {
          gap: legalRect.top - gridRect.bottom,
          bottom: footerRect.bottom - legalRect.bottom,
        };
      });
      expectNear(rhythm.gap, 48, `${route} footer legal gap`);
      expectNear(rhythm.bottom, 64, `${route} footer bottom rhythm`);
    }
    await page.goto('/property-management');
    const compact = page.locator('.ui-footer-grid--compact');
    expectNear(await elementWidth(compact), 1368, 'Property Management footer grid');
    await expect(compact).toHaveCSS('min-height', '214px');
    await expect(page.locator('.ui-footer-rhythm')).toHaveCSS('padding-bottom', '64px');
  },
);

Then(
  'repeated section eyebrows use one borderless semantic role',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const pages = [
      {
        route: '/real-estate',
        labels: ['New Clients', 'Contact Us'],
      },
      {
        route: '/development',
        labels: ['Development Services', 'Our Team', 'About TriCo Development', 'Contact Us'],
      },
    ] as const;

    for (const expectation of pages) {
      await page.goto(expectation.route);
      for (const label of expectation.labels) {
        const eyebrow = page.locator('span', { hasText: label }).filter({ hasText: label }).first();
        await expect(eyebrow).toBeVisible();
        await expect(eyebrow).toHaveCSS('border-top-width', '0px');
        await expect(eyebrow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(eyebrow).toHaveCSS('display', 'inline-block');
      }
    }
  },
);

Then(
  'every public page renders the shared canonical careers section',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const route of Object.keys(headings)) {
      await page.goto(route);
      await expect(page.locator('#careers')).toHaveCount(1);
      await expect(page.locator('#career-application-form')).toBeVisible();
    }
  },
);

Then(
  'the reference-preview openings are listed publicly by division',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const expected = [
      {
        route: '/',
        titles: [
          'Property Manager',
          'Project Coordinator',
          'Leasing Agent',
          'Administrative Assistant',
        ],
      },
      { route: '/property-management', titles: ['Property Manager'] },
      { route: '/construction', titles: ['Project Coordinator'] },
      { route: '/real-estate', titles: ['Leasing Agent'] },
      { route: '/storage', titles: [] },
      { route: '/development', titles: [] },
    ];
    for (const { route, titles } of expected) {
      await page.goto(route);
      const cards = page.locator('#careers [data-slot="card"]:has(button:has-text("Apply Now"))');
      await expect(cards).toHaveCount(titles.length);
      for (const title of titles)
        await expect(cards.getByRole('heading', { name: title })).toBeVisible();
      if (titles.length === 0) {
        const status = page.locator('#careers [role="status"]');
        await expect(status).toBeVisible();
        await expect(status).not.toContainText(/No openings/i);
      }
    }
  },
);

Then(
  'the resume invitation is clearly separated from opening results',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/property-management']) {
        await page.goto(route);
        const results = page.locator('#careers [data-careers-results]');
        const resume = page.locator('#careers [data-careers-resume]');
        await expect(results).toHaveCount(1);
        await expect(resume).toHaveCount(1);
        const resultsBox = await results.boundingBox();
        const resumeBox = await resume.boundingBox();
        assert.ok(resultsBox);
        assert.ok(resumeBox);
        assert.ok(resumeBox.y - (resultsBox.y + resultsBox.height) >= 48);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  },
);

Then(
  'an editable opening prefills the shared application form',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await loginEditor(page);
    await enterHomeEditMode(page);
    await page.locator('#careers').getByRole('button', { name: 'Apply Now' }).first().click();
    await expect(page.locator('input[name="position"]')).toHaveValue('Property Manager');
    await expect(page.locator('select[name="division"]')).toHaveValue('Property Management');
    await expect(page.locator('#career-application-form')).toBeInViewport();
    await page
      .getByRole('complementary', { name: 'Content editor' })
      .getByRole('button', { name: 'Exit edit mode' })
      .click();
  },
);

Then(
  'the shared careers layout is centered and clears every fixed division header',
  { timeout: 60_000 },
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const routes = divisionHeroMediaSamples.map(({ route }) => route);
    for (const viewport of [
      { width: 1440, height: 1100, offset: 148 },
      { width: 390, height: 844, offset: 140 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route);
        if (viewport.width < 768) {
          await page.getByRole('button', { name: 'Open navigation' }).click();
          await page.locator('nav:visible a[href="#careers"]').click();
        } else {
          await page.locator('header nav a[href="#careers"]').click();
        }
        await page
          .waitForFunction((offset) => {
            const section = document.querySelector('#careers');
            return section !== null && Math.abs(section.getBoundingClientRect().top - offset) < 12;
          }, viewport.offset)
          .catch(() => undefined);
        const section = page.locator('#careers');
        const container = section.locator('.ui-careers-container');
        const heading = section.locator('.ui-section-heading');
        const form = section.locator('.ui-resume-form');
        const sectionBox = await section.boundingBox();
        const containerBox = await container.boundingBox();
        assert.ok(sectionBox);
        assert.ok(containerBox);
        assert.ok(sectionBox.y >= viewport.offset - 12);
        assert.ok(Math.abs(containerBox.x + containerBox.width / 2 - viewport.width / 2) <= 2);
        await expect(heading).toHaveCSS('text-align', 'center');
        await expect(form).toHaveCSS('text-align', 'start');
        if (viewport.width === 1440) assert.ok(containerBox.width >= 1360);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
  },
);

Then('every division navigation exposes Careers', async function (this: FrontendWorld) {
  const page = this.currentPage();
  const routes = Object.keys(headings).filter((candidate) => candidate !== '/');
  for (const route of routes) {
    await page.goto(route);
    const link = page.locator('header nav:visible a[href="#careers"]:visible');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('Careers');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(route);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const mobileLink = page.locator('nav:visible a[href="#careers"]');
    await expect(mobileLink).toHaveCount(1);
    await expect(mobileLink).toHaveText('Careers');
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
});

Then(
  'retired legacy careers entities remain registered but are not rendered',
  async function (this: FrontendWorld) {
    assert.equal(entityDefinitions.length, 195);
    assert.equal(retiredEntityIds.size, 5);
    for (const entityId of retiredEntityIds)
      assert.ok(entityDefinitions.some((definition) => definition.id === entityId));
    const page = this.currentPage();
    const retiredCopy = [
      { route: '/real-estate', text: 'Competitive commission structure' },
      { route: '/property-management', text: 'Careers at TriCo Property Management' },
      { route: '/construction', text: 'Build Your Career With TriCo' },
    ] as const;
    for (const expectation of retiredCopy) {
      await page.goto(expectation.route);
      await expect(page.getByText(expectation.text, { exact: true })).toHaveCount(0);
    }
  },
);
Then(
  'careers copy does not claim an outdated division count',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/');
    await expect(page.locator('#careers')).not.toContainText('all four divisions');
  },
);

Then(
  'Real Estate repeated section labels use one filled blue tag layout',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/real-estate');
    for (const label of [
      'Our Process',
      'Our Team',
      'Our Agents',
      'Client Success Stories',
      'Careers',
    ]) {
      const tag = page.locator('.ui-section-tag', { hasText: label }).first();
      await expect(tag).toBeVisible();
      await expect(tag).toHaveCSS('color', 'rgb(94, 133, 186)');
      await expect(tag).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
  },
);

Then(
  'shared header and primary actions use the reference geometry',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const primaryActions = [
      { route: '/real-estate', name: 'Start Your Journey' },
      { route: '/construction', name: 'Get a Quote' },
      { route: '/storage', name: 'Our Services' },
      { route: '/development', name: 'View Our Projects' },
    ] as const;
    for (const action of primaryActions) {
      await page.goto(action.route);
      const link = page.locator('.ui-actions .ui-button').filter({ hasText: action.name }).first();
      await expect(link).toHaveCSS('height', '44px');
      await expect(link).toHaveCSS('padding', '0px 32px');
    }

    const headerActions = [
      { route: '/real-estate', name: 'Get Started' },
      { route: '/property-management', name: 'Free Analysis' },
      { route: '/construction', name: 'Get Quote' },
      { route: '/development', name: 'Get Started' },
    ] as const;
    for (const action of headerActions) {
      await page.goto(action.route);
      const link = page
        .locator('.ui-header-actions .ui-button')
        .filter({ hasText: action.name })
        .first();
      await expect(link).toHaveCSS('height', '40px');
      await expect(link).toHaveCSS('padding', '8px 16px');
    }
  },
);

Then(
  'shared supporting content follows the reference start alignment contract',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const expectations = [
      { route: '/real-estate', selector: '.ui-contact' },
      { route: '/real-estate', selector: '.ui-footer' },
      { route: '/property-management', selector: '.ui-contact' },
      { route: '/property-management', selector: '.ui-footer' },
      { route: '/construction', selector: '.ui-contact' },
      { route: '/construction', selector: '.ui-footer' },
      { route: '/storage', selector: '.ui-contact' },
      { route: '/storage', selector: '.ui-footer' },
      { route: '/development', selector: '.ui-contact' },
      { route: '/development', selector: '.ui-footer' },
    ] as const;

    for (const expectation of expectations) {
      await page.goto(expectation.route);
      await page.setViewportSize({ width: 1440, height: 1100 });
      const element = page.locator(expectation.selector).first();
      await expect(element).toBeVisible();
      await expect(element).toHaveCSS('text-align', 'start');
    }

    const centered = [
      { route: '/', selector: '.ui-careers' },
      { route: '/real-estate', selector: '.ui-careers' },
      { route: '/property-management', selector: '.ui-careers' },
      { route: '/construction', selector: '.ui-careers' },
      { route: '/', selector: '.ui-contact' },
      { route: '/', selector: '.ui-footer-light' },
      { route: '/real-estate', selector: '.profile-card-body' },
      { route: '/construction', selector: '.ui-team-card' },
      { route: '/storage', selector: '.review-platform-card' },
    ] as const;
    for (const expectation of centered) {
      await page.goto(expectation.route);
      const element = page.locator(expectation.selector).first();
      await expect(element).toBeVisible();
      await expect(element).toHaveCSS('text-align', 'center');
    }
  },
);

Then(
  'Development preserves the complete legacy copy and footer inventory',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.goto('/development');

    await expect(
      page.getByText(
        'Expert guidance in identifying and acquiring prime land opportunities across Utah. We help you find the perfect property for your vision.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'We see potential where others see raw land, transforming vision into thriving communities.',
        { exact: true },
      ),
    ).toBeVisible();
    const quickLinks = page.locator('.ui-footer-grid').getByRole('link');
    await expect(quickLinks).toHaveCount(7);
    await expect(quickLinks).toHaveText([
      'Land Acquisition',
      'Residential Development',
      'Commercial Development',
      'Current Projects',
      'Our Team',
      'About Us',
      'Contact',
    ]);
  },
);

Then('Development uses the reference card and footer rhythm', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.setViewportSize({ width: 1512, height: 827 });
  await page.goto('/development');

  const landCards = page.locator('.ui-land-grid .ui-land-card');
  await expect(landCards).toHaveCount(3);
  for (const card of await landCards.all()) {
    await expect(card).toHaveCSS('height', '312px');
  }

  const valueCards = page.locator('.ui-values article');
  await expect(valueCards).toHaveCount(3);
  for (const card of await valueCards.all()) {
    await expect(card).toHaveCSS('height', '134px');
  }

  const footer = page.locator('.ui-footer');
  const footerGrid = page.locator('.ui-footer-grid');
  const copyright = page.locator('.ui-copyright');
  const [footerBox, gridBox, copyrightBox] = await Promise.all([
    footer.boundingBox(),
    footerGrid.boundingBox(),
    copyright.boundingBox(),
  ]);
  assert.ok(footerBox && gridBox && copyrightBox);
  assert.ok(Math.abs(footerBox.height - 517) <= 2, `footer height was ${footerBox.height}`);
  assert.ok(Math.abs(gridBox.height - 284) <= 2, `footer grid height was ${gridBox.height}`);
  assert.ok(
    Math.abs(copyrightBox.y - (gridBox.y + gridBox.height) - 48) <= 2,
    'copyright did not begin 48px after the footer grid',
  );
  assert.ok(
    Math.abs(footerBox.y + footerBox.height - (copyrightBox.y + copyrightBox.height) - 64) <= 2,
    'footer did not retain its 64px bottom rhythm',
  );
});

Then(
  'representative headings use the frozen 60 48 and 36 pixel roles',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const expectations = [
      {
        route: '/real-estate',
        heading: 'Featured Properties',
        fontSize: '60px',
        lineHeight: '60px',
      },
      {
        route: '/property-management',
        heading: 'Meet Our Property Management Experts',
        fontSize: '60px',
        lineHeight: '60px',
      },
      {
        route: '/construction',
        heading: 'Get a Bid on Your Project',
        fontSize: '36px',
        lineHeight: '40px',
      },
      {
        route: '/storage',
        heading: 'Our Why',
        fontSize: '48px',
        lineHeight: '48px',
      },
      {
        route: '/development',
        heading: 'Builder & Investor Partners',
        fontSize: '36px',
        lineHeight: '40px',
      },
    ] as const;

    await page.setViewportSize({ width: 1512, height: 827 });
    for (const expectation of expectations) {
      await page.goto(expectation.route);
      const heading = page.getByRole('heading', { name: expectation.heading, exact: true });
      await expect(heading).toHaveCSS('font-family', /Lato/);
      await expect(heading).toHaveCSS('font-size', expectation.fontSize);
      await expect(heading).toHaveCSS('line-height', expectation.lineHeight);
      await expect(heading).toHaveCSS('font-weight', '700');
    }
  },
);

Then(
  'shared navigation form labels and actions use the frozen medium weight and six-pixel corners',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });

    for (const sample of [
      { route: '/real-estate', label: 'Full Name *', action: 'Submit Inquiry' },
      { route: '/property-management', label: 'Full Name *', action: 'Submit Inquiry' },
      { route: '/construction', label: 'Your Name *', action: 'Request Your Bid' },
      { route: '/storage', label: 'First Name *', action: 'Get Started' },
      { route: '/development', label: 'First Name *', action: 'Get Started' },
    ] as const) {
      await page.goto(sample.route);
      const action = page.getByRole('button', { name: sample.action, exact: true }).last();
      const form = action.locator('xpath=ancestor::form[1]');
      await expect(form).toHaveCount(1);
      const label = form.getByText(sample.label, { exact: true }).last();
      const input = form.getByLabel(sample.label, { exact: true });
      await expect(label).toHaveCSS('font-weight', '500');
      await expect(input).toHaveCSS('border-radius', '6px');
      await expect(action).toHaveCSS('font-weight', '500');
      await expect(action).toHaveCSS('border-radius', '6px');
    }

    for (const route of ['/real-estate', '/property-management', '/construction', '/development']) {
      await page.goto(route);
      await expect(page.getByRole('navigation').first().getByRole('link').first()).toHaveCSS(
        'font-weight',
        '500',
      );
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
        {
          route: '/real-estate',
          section: '.re-section',
          heading: '.re-section-heading',
          measuredHeadingGap: '48px',
        },
        {
          route: '/property-management',
          section: '.pm-section',
          heading: '.pm-section-heading',
          measuredHeadingGap: undefined,
        },
        {
          route: '/development',
          section: '.dev-section',
          heading: '.dev-heading',
          measuredHeadingGap: '48px',
        },
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
        assert.equal(
          headingStyles.marginBottom,
          expectation.measuredHeadingGap ?? viewport.expectedHeadingGap,
        );
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
  'the Home resume form focuses validation and delivery feedback without creating a CMS entity',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    let entityMutationCount = 0;
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/'))
        entityMutationCount += 1;
    });
    await page.getByRole('button', { name: 'Submit Resume' }).click();
    await expect(page.getByText('Please enter your name.')).toBeVisible();
    await expect(page.locator('#career-name')).toBeFocused();
    await expect(page.getByText('Please enter your email.')).toBeVisible();
    await expect(page.getByText('Please select a division.')).toBeVisible();
    await expect(page.getByText('Please attach your resume.')).toBeVisible();
    const form = page.locator('#career-application-form');
    const marker = `career-browser-${String(Date.now())}`;
    await form.locator('input[name="name"]').fill(marker);
    await form.locator('input[name="email"]').fill('applicant@example.test');
    await form.locator('select[name="division"]').selectOption('Construction');
    await form.locator('input[name="resume"]').setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\nBrowser acceptance resume\n%%EOF'),
    });
    await page.route('**/api/v1/applications', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'APPLICATION_DELIVERY_FAILED',
            message: 'Application delivery failed. Please try again.',
          },
        }),
      });
    });
    await form.getByRole('button', { name: 'Submit Resume' }).click();
    await expect(form.getByRole('alert')).toContainText('Application delivery failed');
    await expect(form.getByRole('alert')).toBeFocused();
    await expect(form.locator('input[name="name"]')).toHaveValue(marker);
    assert.equal(
      await form
        .locator('input[name="resume"]')
        .evaluate((input) =>
          input instanceof HTMLInputElement ? input.files?.[0]?.name : undefined,
        ),
      'resume.pdf',
    );
    await page.unroute('**/api/v1/applications');
    await form.getByRole('button', { name: 'Submit Resume' }).click();
    const confirmation = page
      .getByRole('status')
      .filter({ hasText: 'Your application and resume were delivered.' });
    await expect(confirmation).toBeFocused();
    await expect
      .poll(async () => {
        const response = await page.request.get('/__mailpit/api/v1/messages', {
          headers: { Authorization: mailpitAuthorization },
        });
        const body = (await response.json()) as {
          readonly messages: readonly { readonly Snippet: string; readonly Attachments: number }[];
        };
        return body.messages.some(
          (message) => message.Snippet.includes(marker) && message.Attachments === 1,
        );
      })
      .toBe(true);
    await confirmation.getByRole('button', { name: 'Submit another' }).click();
    await expect(page.locator('#career-name')).toBeFocused();
    assert.equal(entityMutationCount, 0);
  },
);
Then(
  'division links open their destination pages at the top',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const propertyLink = page.locator('#divisions a[href="/property-management"]').first();
    await expect(propertyLink).toBeVisible();
    await propertyLink.scrollIntoViewIfNeeded();
    assert.ok((await page.evaluate(() => window.scrollY)) > 0);
    await propertyLink.click();
    await expect(page).toHaveURL(/\/property-management$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
  },
);

Then(
  'the Property Management page presents ready sections in its intended order',
  async function (this: FrontendWorld) {
    const expectedHeadings = [
      'What to Expect with TriCo',
      'The TriCo Experience',
      'Take a Look at Our Process',
      'Properties We Currently Manage',
      'Tenant Portal',
      'Meet Our Property Management Experts',
      'Property Management Done Right',
      'Frequently Asked Questions',
      'Join Our Team',
      'Share feedback privately',
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
    const page = this.currentPage();
    const boundaries = page.locator('[data-property-management-entity-boundary="true"]');
    await expect(boundaries).toHaveCount(count - 7);
    await loginEditor(page);
    await page.goto('/property-management');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(boundaries).toHaveCount(count);
    await page
      .getByRole('complementary', { name: 'Content editor' })
      .getByRole('button', { name: 'Exit edit mode' })
      .click();
  },
);
Then(
  'the Property Management hero presents an accessible primary and secondary action hierarchy',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const hero = page.locator('section[aria-labelledby="property-management-hero-heading"]');
    const primary = hero.locator('a[href="#contact"]');
    const secondary = hero.locator('a[href="#services"]');
    await expect(primary).toBeVisible();
    await expect(secondary).toBeVisible();
    await expect(primary).toHaveAttribute('data-slot', 'button');
    await expect(secondary).toHaveAttribute('data-slot', 'button');
    await primary.focus();
    await expect(primary).toBeFocused();
  },
);

Then(
  'the Property Management hero actions stack at full content width on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/property-management');
    const actions = page.locator('.ui-division-hero-actions a');
    const heroBox = await page
      .locator('section[aria-labelledby="property-management-hero-heading"]')
      .boundingBox();
    const primaryBox = await actions.nth(0).boundingBox();
    const secondaryBox = await actions.nth(1).boundingBox();
    assert.ok(heroBox);
    assert.ok(primaryBox);
    assert.ok(secondaryBox);
    assert.ok(heroBox.height > 0);
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
    await page.setViewportSize({ width: 1512, height: 1100 });
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

    await assertThreeColumnGeometry('.re-service-grid', '.re-card', 5, 1367, 1369);
    await assertThreeColumnGeometry('.re-person-grid', '[data-profile-card="true"]', 3, 1151, 1153);
    await assertThreeColumnGeometry('.re-testimonial-grid', '.re-card', 3, 1367, 1369);
  },
);
Then(
  'Real Estate services preserve the complete legacy descriptions and audited card rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    await page.reload();

    const expectedDescriptions = [
      'Full-service commercial brokerage including office, retail, industrial, and investment properties. We handle sales, leasing, and acquisitions across all commercial property types.',
      'Expert guidance in buying and selling land for residential subdivisions, commercial development, and investment opportunities throughout Utah.',
      'Comprehensive commercial leasing services including market analysis, property showings, tenant screening, and lease negotiation for landlords and tenants.',
      'Build your dream home in one of our developed subdivisions or custom build on a specific lot. We manage the entire process from design to move-in.',
      "Full residential brokerage services for buyers and sellers. Whether you're purchasing your first home or selling a property, our team provides expert guidance.",
    ] as const;
    const cards = page.locator('#services .re-card');
    await expect(cards).toHaveCount(expectedDescriptions.length);

    const actualDescriptions = await cards.locator('p').allTextContents();
    const cardHeights = await cards.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    const gridHeight = await page
      .locator('.re-service-grid .editable-collection-items')
      .evaluate((element) => Math.round(element.getBoundingClientRect().height));

    assert.deepEqual(
      { actualDescriptions, cardHeights, gridHeight },
      {
        actualDescriptions: expectedDescriptions,
        cardHeights: [268, 268, 268, 268, 268],
        gridHeight: 560,
      },
    );
  },
);
Then(
  'Real Estate supporting content and selective desktop composition match the mounted reference',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);

    const expectedProfileBios = [
      'With over 30 years of experience in Utah real estate, Steve brings unmatched expertise in residential and commercial transactions. As Managing Broker, he oversees all brokerage operations to deliver exceptional results for every client.',
      'Dedicated to providing exceptional service and expertise for all your real estate needs.',
      'With extensive experience in both real estate transactions and land development, Brooke leads our real estate division with a passion for helping clients achieve their property goals. She is dedicated to educating and leading agents to success.',
      'Mia ensures every transaction runs smoothly from contract to close, bringing a detail-oriented approach and exceptional organizational skills to support our agents and clients.',
      'Michael brings a client-focused approach to real estate, ensuring every transaction is handled with professionalism and care.',
      'Ben is dedicated to helping clients buy and sell with confidence, bringing a client-first approach and strong local market knowledge to every transaction.',
      'Shauna brings a warm, client-first approach to real estate, helping buyers and sellers navigate every transaction with confidence and care.',
      'Robert brings strong local market knowledge and a client-first approach, helping buyers and sellers achieve their real estate goals with confidence.',
      'Stacie brings a warm, detail-oriented approach to real estate, guiding clients through every step of buying or selling with care and local expertise.',
    ] as const;
    const expectedTestimonials = [
      "“TriCo's expertise in commercial real estate is unmatched. They helped us identify and acquire a retail property that exceeded our investment expectations. Their market knowledge is invaluable.”",
      '“As a first-time buyer, I was nervous about the process. TriCo made everything simple and stress-free. They found us the perfect home within our budget and timeline.”',
      "“We've partnered with TriCo on multiple development projects. Their understanding of zoning, entitlements, and market dynamics has been instrumental in our success.”",
    ] as const;

    const actualContent = {
      servicesIntroduction: await page.locator('#services .re-section-heading p').innerText(),
      aboutParagraphs: await page
        .locator('#about .re-about-grid > div:last-child > p')
        .allTextContents(),
      profileBios: await page.locator('#team .profile-card-body > p').allTextContents(),
      careerPositions: (await page.locator('#careers .ui-career-card h3').allTextContents()).map(
        (value) => value.trim(),
      ),
      resumeHeading: await page.locator('#careers .ui-resume-heading h3').innerText(),
      testimonialIntroduction: await page
        .locator('.re-testimonials .re-section-heading p')
        .innerText(),
      testimonials: await page.locator('.re-testimonial-grid .re-card > p').allTextContents(),
      reviewIntroduction: await page.locator('.re-reviews .re-section-heading p').innerText(),
      reviewDescriptions: await page
        .locator('.re-review-grid [data-review-platform-card="true"] > p')
        .allTextContents(),
    };
    const expectedContent = {
      servicesIntroduction:
        'TriCo Real Estate is a full-service brokerage specializing in commercial real estate and land, with expertise in new construction and residential services. Whatever your real estate needs, we deliver results.',
      aboutParagraphs: [
        "TriCo Real Estate is a full-service brokerage specializing in commercial real estate and land, while also serving residential clients. For over four decades, we've helped investors, businesses, homeowners, and developers navigate Utah's property market with confidence.",
        'From commercial sales and leasing to land acquisitions, new construction homes in our subdivisions or custom builds on your lot, and traditional residential transactions — our experienced team delivers results across every property type.',
      ],
      profileBios: expectedProfileBios,
      careerPositions: ['Leasing Agent'],
      resumeHeading: 'Submit Your Resume',
      testimonialIntroduction:
        "Our clients' success is our greatest achievement. Here's what they have to say about working with TriCo Real Estate.",
      testimonials: expectedTestimonials,
      reviewIntroduction:
        'Your feedback helps us grow and lets others discover the TriCo difference. It only takes a minute — pick your favorite platform below.',
      reviewDescriptions: [
        'Share your experience on Google Reviews — helps neighbors find us.',
        'Recommend us on Facebook so your network can see it too.',
        'Leave a Yelp review to help others make an informed decision.',
      ],
    } as const;

    const roundedBox = async (selector: string): Promise<{ x: number; width: number }> => {
      const box = await page.locator(selector).first().boundingBox();
      assert.ok(box);
      return { x: Math.round(box.x), width: Math.round(box.width) };
    };
    const heights = await Promise.all(
      ['#services', '#about', '#team', '.re-testimonials', '.re-reviews', '.re-footer'].map(
        async (selector) => {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box);
          return Math.round(box.height);
        },
      ),
    );
    const agentCards = await page
      .locator('.re-agent-grid [data-profile-card="true"]')
      .evaluateAll((elements) =>
        elements.slice(0, 4).map((element) => {
          const box = element.getBoundingClientRect();
          return { x: Math.round(box.x), width: Math.round(box.width) };
        }),
      );

    assert.deepEqual(
      {
        content: actualContent,
        serviceGrid: await roundedBox('.re-service-grid'),
        testimonialGrid: await roundedBox('.re-testimonial-grid'),
        aboutGrid: await roundedBox('.re-about-grid'),
        contactGrid: await roundedBox('.re-contact-grid'),
        footerGrid: await roundedBox('.re-footer-grid'),
        serviceHeading: await roundedBox('#services .re-section-heading'),
        agentCards,
      },
      {
        content: expectedContent,
        serviceGrid: { x: 72, width: 1368 },
        testimonialGrid: { x: 72, width: 1368 },
        aboutGrid: { x: 72, width: 1368 },
        contactGrid: { x: 72, width: 1368 },
        footerGrid: { x: 72, width: 1368 },
        serviceHeading: { x: 372, width: 768 },
        agentCards: [
          { x: 180, width: 264 },
          { x: 476, width: 264 },
          { x: 772, width: 264 },
          { x: 1068, width: 264 },
        ],
      },
    );
    const referenceHeights = [1160, 784, 3253, 762, 818, 517] as const;
    heights.forEach((height, index) => {
      assert.ok(
        Math.abs(height - referenceHeights[index]!) <= 10,
        `Real Estate section ${index} height ${height}px differs from the mounted reference ${referenceHeights[index]}px by more than 10px`,
      );
    });
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
  'Real Estate listings process and FAQ match their mounted desktop contracts',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.goto('/real-estate');
    await page.evaluate(() => document.fonts.ready);
    const roundedBox = async (
      selector: string,
    ): Promise<{ x: number; y: number; width: number; height: number }> => {
      const bounds = await page.locator(selector).first().boundingBox();
      assert.ok(bounds);
      return {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      };
    };

    const listings = await roundedBox('#listings');
    const gallery = await roundedBox('#listings > .re-container > .re-listings-gallery');
    const tabs = await roundedBox('#listings .re-tabs');
    const activeTab = await roundedBox('#listings .re-tabs button[aria-selected="true"]');
    const listingGrid = await roundedBox('#listings .re-listing-grid');
    const firstListing = await roundedBox('#listings .re-listing');
    const firstPhoto = await roundedBox('#listings .re-listing-photo');
    const firstBody = await roundedBox('#listings .re-listing-body');
    const firstAction = await roundedBox('#listings .re-listing-action');
    assert.deepEqual(
      {
        sectionHeight: listings.height,
        gallery: { x: gallery.x, width: gallery.width },
        tabs: { x: tabs.x, width: tabs.width, height: tabs.height },
        activeTab: { width: activeTab.width, height: activeTab.height },
        grid: { x: listingGrid.x, width: listingGrid.width, height: listingGrid.height },
        gridGap: await page
          .locator('#listings .re-listing-grid .editable-collection-items')
          .evaluate((element) => getComputedStyle(element).columnGap),
        firstListing: { width: firstListing.width, height: firstListing.height },
        firstPhoto: { width: firstPhoto.width, height: firstPhoto.height },
        firstBody: { width: firstBody.width, height: firstBody.height },
        listingReference: await page.locator('.ui-listing-reference').first().innerText(),
        firstAction: { width: firstAction.width, height: firstAction.height },
      },
      {
        sectionHeight: 1604,
        gallery: { x: 180, width: 1152 },
        tabs: { x: 599, width: 315, height: 40 },
        activeTab: { width: 186, height: 32 },
        grid: { x: 180, width: 1152, height: 916 },
        gridGap: '32px',
        firstListing: { width: 363, height: 479 },
        firstPhoto: { width: 361, height: 270 },
        firstBody: { width: 361, height: 206 },
        listingReference: 'MLS# 2019235',
        firstAction: { width: 134, height: 36 },
      },
    );

    const process = await roundedBox('#process');
    const processTimeline = await roundedBox('#process .re-process');
    const processCards = await page
      .locator('#process .re-process article > div')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const bounds = element.getBoundingClientRect();
          const heading = element.querySelector('h3')?.getBoundingClientRect();
          return {
            x: Math.round(bounds.x),
            width: Math.round(bounds.width),
            articleHeight: Math.round(element.parentElement?.getBoundingClientRect().height ?? 0),
            contentX: Math.round(heading?.x ?? 0),
            contentWidth: Math.round(heading?.width ?? 0),
          };
        }),
      );
    assert.deepEqual(
      {
        sectionHeight: process.height,
        timeline: { x: processTimeline.x, width: processTimeline.width },
        cards: processCards,
        descriptions: await page.locator('#process article p').allTextContents(),
      },
      {
        sectionHeight: 1526,
        timeline: { x: 72, width: 1368 },
        cards: [
          { x: 72, width: 620, articleHeight: 218, contentX: 105, contentWidth: 554 },
          { x: 820, width: 620, articleHeight: 218, contentX: 853, contentWidth: 554 },
          { x: 72, width: 620, articleHeight: 218, contentX: 105, contentWidth: 554 },
          { x: 820, width: 620, articleHeight: 218, contentX: 853, contentWidth: 554 },
          { x: 72, width: 620, articleHeight: 218, contentX: 105, contentWidth: 554 },
        ],
        descriptions: [
          'We begin by understanding your goals, timeline, and budget to create a customized strategy that aligns with your real estate objectives.',
          'Our team conducts thorough market research and property evaluations to identify opportunities and ensure informed decision-making.',
          'Leveraging decades of experience, we negotiate the best terms and guide you through every step of the transaction process.',
          'We coordinate all closing details, ensuring a smooth transfer of ownership with attention to every legal and financial requirement.',
          "Our relationship doesn't end at closing. We provide continued support, market updates, and guidance for your future real estate needs.",
        ],
      },
    );

    const faq = await roundedBox('#faq');
    const faqHeading = await roundedBox('#faq .re-section-heading');
    const faqItems = await roundedBox('#faq .re-faqs');
    assert.deepEqual(
      {
        sectionHeight: faq.height,
        items: { x: faqItems.x, width: faqItems.width, height: faqItems.height },
        headingGap: faqItems.y - (faqHeading.y + faqHeading.height),
        rowHeights: await page
          .locator('#faq details')
          .evaluateAll((elements) =>
            elements.map((element) => Math.round(element.getBoundingClientRect().height)),
          ),
        summaryHeights: await page
          .locator('#faq summary')
          .evaluateAll((elements) =>
            elements.map((element) => Math.round(element.getBoundingClientRect().height)),
          ),
      },
      {
        sectionHeight: 820,
        items: { x: 372, width: 768, height: 428 },
        headingGap: 48,
        rowHeights: [58, 58, 58, 58, 58, 58],
        summaryHeights: [56, 56, 56, 56, 56, 56],
      },
    );
  },
);
Then(
  'Real Estate About uses the mounted inverse gradient heading and prose roles',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);

    const about = page.locator('#about');
    const heading = about.getByRole('heading', {
      name: 'Building Relationships, Delivering Results',
    });
    const prose = about.locator('.re-about-grid > div:last-child > p');
    await expect(about).toHaveCSS(
      'background-image',
      'linear-gradient(to right bottom, rgb(30, 58, 138), rgb(0, 18, 138), rgb(30, 64, 175))',
    );
    await expect(heading).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(prose.nth(0)).toHaveCSS('color', 'rgba(255, 255, 255, 0.8)');
    await expect(prose.nth(0)).toHaveCSS('font-size', '16px');
    await expect(prose.nth(0)).toHaveCSS('line-height', '28px');
    await expect(prose.nth(1)).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
    await expect(prose.nth(1)).toHaveCSS('font-size', '16px');
    await expect(prose.nth(1)).toHaveCSS('line-height', '24px');
    await expect(about.getByRole('link', { name: 'Let’s Talk Real Estate' })).toHaveCSS(
      'background-color',
      'rgb(134, 98, 45)',
    );
  },
);
Then(
  'the Real Estate footer uses the mounted inverse heading copy and link rhythm',
  async function (this: FrontendWorld) {
    const footer = this.currentPage().locator('.re-footer');
    await expect(footer).toHaveCSS(
      'background-image',
      'linear-gradient(to right bottom, rgb(30, 58, 138), rgb(0, 18, 138), rgb(30, 64, 175))',
    );
    for (const title of ['Quick Links', 'Brokerage License']) {
      const heading = footer.getByRole('heading', { name: title });
      await expect(heading).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(heading).toHaveCSS('font-weight', '600');
    }
    const link = footer.getByRole('link', { name: 'Listing Services' });
    await expect(link).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
    await expect(link).toHaveCSS('display', 'inline');
    await expect(link).toHaveCSS('font-size', '14px');
    await expect(link).toHaveCSS('line-height', '20px');
    await expect(link).toHaveCSS('margin-top', '0px');
    await expect(footer.getByText('REALTOR® License# 5472329-CN00')).toHaveCSS(
      'color',
      'rgba(255, 255, 255, 0.7)',
    );
  },
);
Then(
  'Real Estate inverse surfaces preserve their geometry editor wrappers and mobile containment',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const readGeometry = async () => {
      const about = await page.locator('#about').boundingBox();
      const footer = await page.locator('.re-footer').boundingBox();
      assert.ok(about && footer);
      return {
        about: {
          x: Math.round(about.x),
          width: Math.round(about.width),
          height: Math.round(about.height),
        },
        footer: {
          x: Math.round(footer.x),
          width: Math.round(footer.width),
          height: Math.round(footer.height),
        },
      };
    };
    const publicGeometry = await readGeometry();
    assert.deepEqual(
      {
        about: { x: publicGeometry.about.x, width: publicGeometry.about.width },
        footer: { x: publicGeometry.footer.x, width: publicGeometry.footer.width },
      },
      {
        about: { x: 0, width: 1512 },
        footer: { x: 0, width: 1512 },
      },
    );
    assert.ok(Math.abs(publicGeometry.about.height - 784) <= 10);
    assert.ok(Math.abs(publicGeometry.footer.height - 517) <= 5);

    await loginEditor(page);
    await page.goto('/real-estate');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const editGeometry = await readGeometry();
    assert.deepEqual(
      {
        about: { x: editGeometry.about.x, width: editGeometry.about.width },
        footer: { x: editGeometry.footer.x, width: editGeometry.footer.width },
      },
      {
        about: { x: publicGeometry.about.x, width: publicGeometry.about.width },
        footer: { x: publicGeometry.footer.x, width: publicGeometry.footer.width },
      },
    );
    await expect(
      page.locator('#about').locator('xpath=ancestor::*[@data-entity-boundary="true"][1]'),
    ).toHaveCount(1);
    await expect(page.locator('.re-footer [data-entity-boundary="true"]')).not.toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    for (const selector of ['#about', '.re-footer']) {
      const containment = await page.locator(selector).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          left: rect.left,
          right: rect.right,
        };
      });
      assert.ok(containment.scrollWidth <= containment.clientWidth + 1);
      assert.ok(containment.left >= -1 && containment.right <= 391);
    }
  },
);
Then(
  'the Property Management hero uses relevant managed imagery with a neutral fallback',
  async function (this: FrontendWorld) {
    const hero = this.currentPage().locator(
      'section[aria-labelledby="property-management-hero-heading"]',
    );
    const image = hero.locator('img');
    await expect(image).toHaveCount(1);
    await expect(image).toBeVisible();
    assert.ok(
      (await image.evaluate((node) => (node instanceof HTMLImageElement ? node.naturalWidth : 0))) >
        0,
    );
    await expect(hero).not.toContainText('media/seed/');
  },
);

Then(
  'supplied Property Management portfolio images load while additional cards reveal on request without conflicting public metrics',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const portfolio = page.locator('#managed-properties');
    await expect(portfolio.getByRole('tabpanel').locator('[data-slot="card"]')).toHaveCount(3);
    const revealProperties = portfolio.getByRole('button', { name: /managed properties/ });
    await expect(revealProperties).toHaveAttribute('aria-expanded', 'false');
    await revealProperties.click();
    await expect(revealProperties).toHaveAttribute('aria-expanded', 'true');
    let imageCount = 0;
    for (const label of ['Managed properties', 'Commercial associations', 'HOA communities']) {
      await portfolio.getByRole('tab', { name: label }).click();
      const images = portfolio.getByRole('tabpanel').locator('[data-slot="card"] img');
      for (const image of await images.all()) {
        await expect(image).toBeVisible();
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate((node) => (node instanceof HTMLImageElement ? node.naturalWidth : 0)),
          )
          .toBeGreaterThan(0);
        imageCount += 1;
      }
    }
    assert.equal(imageCount, 10);
    await expect(portfolio.locator('[data-neutral-placeholder="true"]')).toHaveCount(0);
    await expect(page.locator('#client-stories')).toHaveCount(0);
  },
);
Then(
  'Property Management portfolio categories are fully visible and directly browseable on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const portfolio = page.locator('#managed-properties');
    const tabs = portfolio.getByRole('tablist', { name: 'Property portfolio category' });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const tab of await tabs.getByRole('tab').all()) {
        const bounds = await tab.boundingBox();
        assert.ok(bounds !== null);
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      }
    }
    await expect(tabs.getByRole('tab')).toHaveCount(3);
    await tabs.getByRole('tab', { name: 'Managed properties' }).click();
    const hoa = tabs.getByRole('tab', { name: /HOA/i });
    await hoa.focus();
    await page.keyboard.press('Enter');
    await expect(hoa).toHaveAttribute('aria-selected', 'true');
    await expect(portfolio.getByRole('tabpanel')).toHaveCount(1);
    await expect(portfolio.getByRole('tabpanel').locator('[data-slot="card"]')).not.toHaveCount(0);
  },
);

Then(
  'the single Property Management analysis form delivers and restarts with focus without creating CMS entities',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    let entityMutationCount = 0;
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.url().includes('/api/v1/entities/')) {
        entityMutationCount += 1;
      }
    });
    await expect(page.locator('#new-client form')).toHaveCount(0);
    await page.getByRole('button', { name: 'Get Free Analysis', exact: true }).last().click();
    await expect(page.getByText('Enter first name.')).toBeVisible();
    await expect(page.getByText('Enter last name.')).toBeVisible();
    await expect(page.getByText('Enter phone.')).toBeVisible();
    const inquiry = page.getByRole('form', { name: 'Free property analysis' });
    await inquiry.locator('input[name="firstName"]').fill('Property');
    await inquiry.locator('input[name="lastName"]').fill('Visitor');
    await inquiry.locator('input[name="email"]').fill('property-visitor@example.test');
    await inquiry.locator('input[name="phone"]').fill('(801) 555-0140');
    await inquiry.locator('select[name="interest"]').selectOption('Commercial property');
    const request = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/v1/inquiries'),
    );
    await inquiry.getByRole('button', { name: 'Get Free Analysis' }).click();
    await request;
    const confirmation = page.getByRole('status').filter({ hasText: 'Thank you for your inquiry' });
    await expect(confirmation).toBeFocused();
    await confirmation.getByRole('button', { name: 'Send another request' }).click();
    await expect(inquiry.locator('input[name="firstName"]')).toBeFocused();
    assert.equal(entityMutationCount, 0);
  },
);
Then(
  'the Property Management contact details use labeled icon rows and remain visible after anchor navigation',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const viewport of [
      { width: 1425, height: 1100 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/property-management');
      const contact = page.locator('#contact');
      for (const label of ['Office Location', 'Phone', 'Email', 'Licenses', 'Office Hours']) {
        await expect(contact.getByText(label, { exact: true })).toBeVisible();
      }
      await page
        .locator('section[aria-labelledby="property-management-hero-heading"] a[href="#contact"]')
        .click();
      await expect(page).toHaveURL(/#contact$/);
      await expect(
        contact.getByRole('heading', { name: 'Get Your Free Property Analysis' }),
      ).toBeInViewport();
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
  'Property Management supporting components match the mounted desktop contracts',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.goto('/property-management');
    await page.evaluate(() => document.fonts.ready);

    const serviceCards = page.locator('#services .pm-card');
    const serviceGeometry = await Promise.all(
      [0, 3, 6].map(async (index) => {
        const card = serviceCards.nth(index);
        const cardBox = await card.boundingBox();
        const titleBox = await card.locator('h3').boundingBox();
        assert.ok(cardBox);
        assert.ok(titleBox);
        return {
          paddingInlineStart: await card.evaluate(
            (element) => getComputedStyle(element).paddingInlineStart,
          ),
          titleY: Math.round(titleBox.y),
        };
      }),
    );
    assert.deepEqual(
      serviceGeometry.map(({ paddingInlineStart }) => paddingInlineStart),
      ['24px', '24px', '24px'],
    );
    assert.deepEqual(
      serviceGeometry.slice(1).map(({ titleY }, index) => titleY - serviceGeometry[index]!.titleY),
      [268, 292],
    );

    const firstProfileContacts = page.locator('#team .profile-card').first().locator('a');
    const contactRows = await firstProfileContacts.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { y: Math.round(box.y), width: Math.round(box.width) };
      }),
    );
    assert.equal(contactRows.length, 2);
    assert.equal(contactRows[1]!.y - contactRows[0]!.y, 28);
    assert.deepEqual(
      contactRows.map(({ width }) => width),
      [382, 382],
    );

    const style = async (selector: string): Promise<Readonly<Record<string, string>>> =>
      page.locator(selector).evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          backgroundImage: computed.backgroundImage,
          textAlign: computed.textAlign,
        };
      });
    assert.deepEqual(await style('#services .pm-section-heading > span'), {
      color: 'rgb(0, 18, 138)',
      backgroundColor: 'rgba(0, 18, 138, 0.1)',
      backgroundImage: 'none',
      textAlign: 'center',
    });
    assert.deepEqual(await style('.pm-testimonials .pm-section-heading > span'), {
      color: 'rgb(134, 98, 45)',
      backgroundColor: 'rgba(134, 98, 45, 0.1)',
      backgroundImage: 'none',
      textAlign: 'center',
    });
    assert.deepEqual(await style('.pm-about .pm-pill'), {
      color: 'rgb(135, 161, 197)',
      backgroundColor: 'rgba(94, 133, 186, 0.2)',
      backgroundImage: 'none',
      textAlign: 'start',
    });

    await expect(page.locator('#careers .ui-career-card')).toHaveCount(1);
    await expect(page.locator('#careers .ui-career-card h3')).toContainText('Property Manager');
    await expect(page.locator('#careers select[name="division"]')).toHaveValue(
      'Property Management',
    );
    await expect(page.locator('#careers .ui-resume-form')).toBeVisible();
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
  'Storage Our Why uses the measured desktop prose and action rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.reload();

    const about = page.locator('.storage-about');
    const layout = about.locator('.storage-about-layout');
    const eyebrow = about.getByText('Why TriCo Storage', { exact: true });
    const heading = about.getByRole('heading', { name: 'Our Why' });
    const introduction = about.getByText(/We built our storage division to serve owners/);
    const bridge = about.getByText('Our approach was designed to bridge that gap.', {
      exact: true,
    });
    const detail = about.getByText(/We bring disciplined, performance driven management/);
    const conclusion = about.getByText(/We believe storage management works best/);
    const action = about.getByRole('link', { name: 'Partner With Us' });
    const [aboutBox, layoutBox, introductionBox, actionBox] = await Promise.all([
      about.boundingBox(),
      layout.boundingBox(),
      introduction.boundingBox(),
      action.boundingBox(),
    ]);
    assert.ok(aboutBox && layoutBox && introductionBox && actionBox);
    assert.ok(Math.abs(aboutBox.height - 724) <= 2, `Storage About height was ${aboutBox.height}`);
    assert.ok(
      Math.abs(layoutBox.height - 532) <= 2,
      `Storage About layout height was ${layoutBox.height}`,
    );
    assert.ok(
      Math.abs(introductionBox.height - 112) <= 2,
      `Storage About introduction height was ${introductionBox.height}`,
    );
    assert.ok(
      Math.abs(actionBox.height - 44) <= 1,
      `Storage About action height was ${actionBox.height}`,
    );

    await expect(eyebrow).toHaveCSS('padding', '8px 16px');
    await expect(eyebrow).toHaveCSS('margin-bottom', '16px');
    await expect(heading).toHaveCSS('margin-bottom', '24px');
    await expect(introduction).toHaveCSS('font-size', '18px');
    await expect(introduction).toHaveCSS('line-height', '28px');
    await expect(introduction).toHaveCSS('margin-bottom', '24px');
    await expect(bridge).toHaveCSS('margin-bottom', '24px');
    await expect(detail).toHaveCSS('margin-bottom', '24px');
    await expect(conclusion).toHaveCSS('margin-bottom', '32px');
    await expect(action).toHaveCSS('font-size', '14px');
    await expect(action).toHaveCSS('font-weight', '500');
    await expect(action).toHaveCSS('line-height', '20px');
    await expect(action).toHaveCSS('padding-left', '32px');
    await expect(action).toHaveCSS('padding-right', '32px');
    await expect(action).toHaveCSS('margin-top', '0px');
  },
);
Then(
  'Storage Our Why preserves its geometry in edit mode without overflowing on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const publicGeometry = await page.locator('.storage-about').evaluate((section) => {
      const layout = section.querySelector('.storage-about-layout');
      if (!(layout instanceof HTMLElement)) throw new Error('Storage About layout was missing.');
      return {
        sectionHeight: section.getBoundingClientRect().height,
        layoutHeight: layout.getBoundingClientRect().height,
      };
    });

    await loginEditor(page);
    await page.goto('/storage');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    const editGeometry = await page.locator('.storage-about').evaluate((section) => {
      const layout = section.querySelector('.storage-about-layout');
      if (!(layout instanceof HTMLElement)) throw new Error('Storage About layout was missing.');
      return {
        sectionHeight: section.getBoundingClientRect().height,
        layoutHeight: layout.getBoundingClientRect().height,
      };
    });
    assert.ok(Math.abs(editGeometry.sectionHeight - publicGeometry.sectionHeight) <= 1);
    assert.ok(Math.abs(editGeometry.layoutHeight - publicGeometry.layoutHeight) <= 1);

    await page.setViewportSize({ width: 390, height: 844 });
    const about = page.locator('.storage-about');
    await about.scrollIntoViewIfNeeded();
    const mobileGeometry = await about.evaluate((section) => {
      const boxes = [section, ...section.querySelectorAll(':scope .storage-about-layout > *')].map(
        (element) => element.getBoundingClientRect(),
      );
      return {
        clientWidth: section.clientWidth,
        scrollWidth: section.scrollWidth,
        boxes: boxes.map(({ left, right }) => ({ left, right })),
      };
    });
    assert.ok(mobileGeometry.scrollWidth <= mobileGeometry.clientWidth + 1);
    assert.ok(
      mobileGeometry.boxes.every(({ left, right }) => left >= -1 && right <= 391),
      `Storage About overflowed mobile: ${JSON.stringify(mobileGeometry.boxes)}`,
    );
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
      'section[aria-labelledby="storage-hero-heading"]',
      '#services',
      '#team',
      '#about',
      '#reviews',
      '#contact',
      'footer',
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
  'Storage services and long bios expand on demand on mobile',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/storage');
    const services = page.locator('#services [data-slot="card"]:visible');
    await expect(services).toHaveCount(6);
    const toggle = page.getByRole('button', { name: /Show all \d+ services/ });
    await toggle.click();
    await expect(services).toHaveCount(12);
    const bio = page.locator('#team details').first();
    await bio.locator('summary').click();
    await expect(bio).toHaveAttribute('open', '');
    await expect(bio.locator('p')).toBeVisible();
  },
);
Then(
  'Storage uses the measured centered-logo desktop masthead',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.reload();

    const banner = page.locator('.storage-banner');
    const header = page.locator('.storage-header');
    const logo = header.getByRole('img');
    const desktopNavigation = header.getByRole('navigation', { name: 'Storage navigation' });
    const [bannerBox, headerBox, logoBox] = await Promise.all([
      banner.boundingBox(),
      header.boundingBox(),
      logo.boundingBox(),
    ]);
    assert.ok(bannerBox && headerBox && logoBox);
    this.storagePublicMastheadGeometry = {
      banner: bannerBox,
      header: headerBox,
      logo: logoBox,
    };

    assert.ok(
      Math.abs(bannerBox.height - 48) <= 1,
      `Storage banner height was ${bannerBox.height}`,
    );
    assert.ok(Math.abs(headerBox.y - 52) <= 1, `Storage header top was ${headerBox.y}`);
    assert.ok(
      Math.abs(headerBox.height - 97) <= 1,
      `Storage header height was ${headerBox.height}`,
    );
    assert.ok(Math.abs(logoBox.width - 114.4) <= 1, `Storage logo width was ${logoBox.width}`);
    assert.ok(Math.abs(logoBox.height - 64) <= 1, `Storage logo height was ${logoBox.height}`);
    assert.ok(Math.abs(logoBox.y - 68) <= 1, `Storage logo top was ${logoBox.y}`);
    assert.ok(
      Math.abs(logoBox.x + logoBox.width / 2 - (headerBox.x + headerBox.width / 2)) <= 1,
      'Storage logo was not centered in its header',
    );

    await expect(banner).toHaveCSS(
      'background-image',
      'linear-gradient(90deg, rgb(29, 78, 216), rgb(37, 99, 235), rgb(29, 78, 216))',
    );
    const bannerLabel = banner.getByText('40+ Years of Excellence', { exact: true });
    await expect(bannerLabel).toHaveCSS('font-size', '16px');
    await expect(bannerLabel).toHaveCSS('line-height', '24px');
    await expect(bannerLabel).toHaveCSS('font-weight', '700');
    await expect(banner.locator('.ui-centered-logo-banner-wave')).toBeVisible();
    await expect(header).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.95)');
    await expect(desktopNavigation).toBeVisible();
    await expect(desktopNavigation.getByRole('link', { name: 'Careers' })).toHaveAttribute(
      'href',
      '#careers',
    );
  },
);
Then(
  'Storage preserves the masthead in edit mode with usable mobile navigation',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const publicGeometry = this.storagePublicMastheadGeometry;
    assert.ok(publicGeometry);
    await loginEditor(page);
    await page.goto(`${baseUrl}/storage`);
    await page.getByRole('button', { name: 'Enter edit mode' }).click();

    const banner = page.locator('.storage-banner');
    const header = page.locator('.storage-header');
    const logo = header.getByRole('img');
    const [bannerBox, headerBox, logoBox] = await Promise.all([
      banner.boundingBox(),
      header.boundingBox(),
      logo.boundingBox(),
    ]);
    assert.ok(bannerBox && headerBox && logoBox);
    for (const [name, publicBox, editBox] of [
      ['banner', publicGeometry.banner, bannerBox],
      ['header', publicGeometry.header, headerBox],
      ['logo', publicGeometry.logo, logoBox],
    ] as const) {
      for (const dimension of ['x', 'y', 'width', 'height'] as const) {
        assert.ok(
          Math.abs(editBox[dimension] - publicBox[dimension]) <= 1,
          `Storage ${name} ${dimension} changed in edit mode`,
        );
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileHeaderBox = await header.boundingBox();
    const mobileLogoBox = await logo.boundingBox();
    assert.ok(mobileHeaderBox && mobileLogoBox);
    assert.ok(
      Math.abs(
        mobileLogoBox.x + mobileLogoBox.width / 2 - (mobileHeaderBox.x + mobileHeaderBox.width / 2),
      ) <= 1,
      'Storage mobile logo was not centered',
    );
    assert.ok(mobileLogoBox.x >= mobileHeaderBox.x);
    assert.ok(mobileLogoBox.x + mobileLogoBox.width <= mobileHeaderBox.x + mobileHeaderBox.width);
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await expect(menu).toBeVisible();
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  },
);
Then(
  'Storage uses the frozen desktop hero heading and service-card geometry',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.reload();

    const hero = page.locator('section[aria-labelledby="property-management-hero-heading"]');
    const services = page.locator('.storage-services');
    const heading = services.getByRole('heading', { name: 'Complete Storage Management' });
    const grid = services.locator('.editable-collection-items');
    const cards = grid.locator('.storage-service-card');
    await expect(cards).toHaveCount(12);

    const [heroBox, servicesBox, headingBox, gridBox] = await Promise.all([
      hero.boundingBox(),
      services.boundingBox(),
      heading.boundingBox(),
      grid.boundingBox(),
    ]);
    assert.ok(heroBox && servicesBox && headingBox && gridBox);
    assert.ok(heroBox.height >= 827, `Storage hero height was ${heroBox.height}`);
    assert.ok(
      Math.abs(headingBox.width - 768) <= 2,
      `Storage services heading width was ${headingBox.width}`,
    );
    assert.ok(
      Math.abs(headingBox.height - 120) <= 2,
      `Storage services heading height was ${headingBox.height}`,
    );
    assert.ok(
      Math.abs(gridBox.width - 1368) <= 2,
      `Storage services grid width was ${gridBox.width}`,
    );

    const firstCardPadding = await cards
      .first()
      .locator('.ui-mounted-service-card-header')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft));
    assert.ok(
      Math.abs(firstCardPadding - 24) <= 1,
      `Storage service-card padding was ${firstCardPadding}`,
    );

    const titleOffsets = await Promise.all(
      [0, 3, 6, 9].map(async (index) => {
        const box = await cards.nth(index).getByRole('heading').boundingBox();
        assert.ok(box);
        return box.y - servicesBox.y;
      }),
    );
    const expectedOffsets = [507, 775, 1067, 1407];
    titleOffsets.forEach((offset, index) => {
      const expectedOffset = expectedOffsets[index];
      assert.ok(expectedOffset !== undefined);
      assert.ok(
        Math.abs(offset - expectedOffset) <= 3,
        `Storage service row ${String(index + 1)} title offset was ${offset}`,
      );
    });
  },
);
Then(
  'Storage uses the mounted split-hero heading measure and diagonal surfaces',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.reload();

    const hero = page.locator('section[aria-labelledby="property-management-hero-heading"]');
    const copy = hero.locator('.ui-division-hero-copy');
    const title = hero.getByRole('heading', {
      name: 'Maximize Your Storage Facility Profitability',
    });
    const actions = hero.locator('.ui-division-hero-actions');
    const stats = hero.locator('.editable-collection-items');
    const [heroBox, copyBox, titleBox, actionsBox, statsBox] = await Promise.all([
      hero.boundingBox(),
      copy.boundingBox(),
      title.boundingBox(),
      actions.boundingBox(),
      stats.boundingBox(),
    ]);
    assert.ok(heroBox && copyBox && titleBox && actionsBox && statsBox);
    assert.ok(
      Math.abs(heroBox.width - 1440) <= 1 && Math.abs(heroBox.height - 1100) <= 1,
      `Storage split hero was ${heroBox.width}x${heroBox.height}`,
    );
    assert.ok(
      Math.abs(copyBox.width - 652) <= 2,
      `Storage split-hero copy width was ${copyBox.width}`,
    );
    await expect(title).toHaveCSS('max-width', '660px');
    await expect(title).toHaveCSS('font-size', '60px');
    await expect(title).toHaveCSS('line-height', '60px');
    const titleLineCount = await title.evaluate((element) => {
      const text = element.firstChild;
      if (!text) return 0;
      const range = document.createRange();
      range.selectNodeContents(text);
      return range.getClientRects().length;
    });
    assert.equal(titleLineCount, 3, `Storage split-hero title used ${titleLineCount} lines`);
    assert.ok(actionsBox.y > titleBox.y + titleBox.height);
    assert.ok(statsBox.y > actionsBox.y + actionsBox.height);
    await expect(hero).toHaveCSS(
      'background-image',
      'linear-gradient(90deg, rgb(0, 18, 138) 0%, rgb(0, 18, 138) 50%, rgb(255, 255, 255) 50%, rgb(255, 255, 255) 100%)',
    );
    await expect(hero).toHaveCSS('background-size', 'auto');
  },
);
Then(
  'Storage uses the mounted service heading and four-row card rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.reload();

    const services = page.locator('.storage-services');
    const heading = services.locator('.storage-section-heading');
    const eyebrow = heading.locator(':scope > span');
    const grid = services.locator('.editable-collection-items');
    const cards = grid.locator('.storage-service-card');
    const [servicesBox, headingBox, eyebrowBox, gridBox] = await Promise.all([
      services.boundingBox(),
      heading.boundingBox(),
      eyebrow.boundingBox(),
      grid.boundingBox(),
    ]);
    assert.ok(servicesBox && headingBox && eyebrowBox && gridBox);

    assert.ok(
      Math.abs(servicesBox.height - 1676) <= 1,
      `Storage services height was ${servicesBox.height}`,
    );
    assert.ok(
      Math.abs(headingBox.height - 252) <= 1,
      `Storage services heading height was ${headingBox.height}`,
    );
    assert.ok(
      Math.abs(gridBox.y - servicesBox.y - 412) <= 1,
      `Storage services grid top offset was ${gridBox.y - servicesBox.y}`,
    );
    assert.ok(
      Math.abs(gridBox.height - 1168) <= 1,
      `Storage services grid height was ${gridBox.height}`,
    );
    assert.ok(
      Math.abs(eyebrowBox.height - 36) <= 1,
      `Storage services eyebrow height was ${eyebrowBox.height}`,
    );
    await expect(eyebrow).toHaveCSS('padding', '8px 16px');
    await expect(eyebrow).toHaveCSS('font-size', '14px');
    await expect(eyebrow).toHaveCSS('line-height', '20px');

    const rowCards = await Promise.all(
      [0, 3, 6, 9].map(async (index) => {
        const box = await cards.nth(index).boundingBox();
        assert.ok(box);
        return box;
      }),
    );
    const expectedRowHeights = [244, 268, 316, 268];
    rowCards.forEach((box, index) => {
      const expectedHeight = expectedRowHeights[index];
      assert.ok(expectedHeight !== undefined);
      assert.ok(
        Math.abs(box.height - expectedHeight) <= 1,
        `Storage service row ${String(index + 1)} height was ${box.height}`,
      );
      if (index === 0) return;
      const previous = rowCards[index - 1];
      assert.ok(previous);
      assert.ok(
        Math.abs(box.y - previous.y - previous.height - 24) <= 1,
        `Storage service row ${String(index + 1)} gap was ${box.y - previous.y - previous.height}`,
      );
    });

    for (const card of await cards.all()) {
      const [titleBox, descriptionBox] = await Promise.all([
        card.getByRole('heading').boundingBox(),
        card.locator('p').boundingBox(),
      ]);
      assert.ok(titleBox && descriptionBox);
      assert.ok(
        Math.abs(descriptionBox.y - titleBox.y - titleBox.height - 24) <= 1,
        `Storage service title-to-description gap was ${descriptionBox.y - titleBox.y - titleBox.height}`,
      );
    }
  },
);
Then(
  'Storage uses its frozen theme frames portrait cards and text roles',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.reload();

    const heroHeading = page.getByRole('heading', {
      name: 'Maximize Your Storage Facility Profitability',
    });
    const heroActions = page.locator('.ui-division-hero-actions');
    const heroPrimary = heroActions.locator('.ui-division-hero-action-primary');
    const heroSecondary = heroActions.locator('.ui-division-hero-action-secondary');
    const about = page.locator('.storage-about');
    const aboutLayout = about.locator('.storage-about-layout');
    const aboutHeading = about.getByRole('heading', { name: 'Our Why' });
    const aboutLead = about.getByText('Our approach was designed to bridge that gap.');
    const aboutAction = about.getByRole('link', { name: 'Partner With Us' });
    const [heroHeadingBox, aboutBox] = await Promise.all([
      heroHeading.boundingBox(),
      aboutLayout.boundingBox(),
    ]);
    assert.ok(heroHeadingBox && aboutBox);
    assert.ok(
      Math.abs(heroHeadingBox.x - 56) <= 2,
      `Storage hero heading x was ${heroHeadingBox.x}`,
    );
    assert.ok(
      Math.abs(aboutBox.width - 1368) <= 2,
      `Storage about frame width was ${aboutBox.width}`,
    );
    await expect(aboutLayout).toHaveCSS('column-gap', '48px');

    await expect(heroPrimary).toHaveCSS('background-color', 'rgb(134, 98, 45)');
    await expect(heroPrimary).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(heroSecondary).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(aboutHeading).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(aboutLead).toHaveCSS('color', 'rgba(255, 255, 255, 0.8)');
    await expect(aboutLead).toHaveCSS('font-weight', '500');
    await expect(aboutAction).toHaveCSS('background-color', 'rgb(0, 18, 138)');
    await expect(aboutAction).toHaveCSS('color', 'rgb(255, 255, 255)');

    const serviceGrid = page.locator('.storage-services .editable-collection-items');
    const firstService = serviceGrid.locator('.storage-service-card').first();
    await expect(serviceGrid).toHaveCSS('column-gap', '24px');
    await expect(serviceGrid).toHaveCSS('row-gap', '24px');
    await expect(firstService.locator('.ui-mounted-service-card-header > span')).toHaveCSS(
      'color',
      'rgb(16, 185, 129)',
    );
    await expect(firstService.getByRole('heading')).toHaveCSS('margin-top', '6px');
    await expect(firstService.getByRole('heading')).toHaveCSS('margin-bottom', '0px');

    const portraits = page.locator('.ui-four-profile-portrait');
    await expect(portraits).toHaveCount(4);
    for (const portrait of await portraits.all()) {
      const box = await portrait.boundingBox();
      assert.ok(box);
      assert.ok(Math.abs(box.width - 316) <= 2, `Storage portrait width was ${box.width}`);
      assert.ok(Math.abs(box.height - 316) <= 2, `Storage portrait height was ${box.height}`);
      await expect(portrait).toHaveCSS('object-position', '50% 50%');
    }
    await expect(page.locator('.ui-four-profile-card').first()).toHaveCSS('text-align', 'start');

    const footer = page.locator('.storage-footer');
    const footerTitle = footer.getByRole('heading', { name: 'Quick Links' });
    const footerCopy = footer.locator('.storage-footer-grid p').first();
    await expect(footerTitle).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(footerTitle).toHaveCSS('font-weight', '600');
    await expect(footerTitle).toHaveCSS('margin-bottom', '16px');
    await expect(footerCopy).toHaveCSS('font-size', '16px');
    await expect(footerCopy).toHaveCSS('line-height', '24px');
    await expect(footerCopy).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
  },
);
Then(
  'Storage uses the shared four-profile geometry and mounted copy rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.reload();

    const team = page.locator('.storage-team');
    const heading = team.locator('.storage-section-heading');
    const grid = team.locator('.editable-collection-items');
    const cards = grid.locator('.ui-team-card');
    const portraits = cards.locator('img');
    const biographies = cards.locator('div > p');
    const [teamBox, headingBox, gridBox, firstCardBox, firstPortraitBox] = await Promise.all([
      team.boundingBox(),
      heading.boundingBox(),
      grid.boundingBox(),
      cards.first().boundingBox(),
      portraits.first().boundingBox(),
    ]);
    assert.ok(teamBox && headingBox && gridBox && firstCardBox && firstPortraitBox);

    assert.ok(
      Math.abs(firstPortraitBox.width - 316) <= 1 && Math.abs(firstPortraitBox.height - 316) <= 1,
      `Storage portrait was ${firstPortraitBox.width}x${firstPortraitBox.height}`,
    );
    assert.ok(Math.abs(teamBox.height - 1250) <= 1, `Storage team height was ${teamBox.height}`);
    assert.ok(
      Math.abs(headingBox.width - 768) <= 1,
      `Storage team heading width was ${headingBox.width}`,
    );
    assert.ok(Math.abs(gridBox.width - 1368) <= 1, `Storage team grid width was ${gridBox.width}`);
    assert.ok(
      Math.abs(firstCardBox.width - 318) <= 1,
      `Storage team card width was ${firstCardBox.width}`,
    );
    assert.ok(
      Math.abs(firstPortraitBox.y - teamBox.y - 325) <= 1,
      `Storage portrait top offset was ${firstPortraitBox.y - teamBox.y}`,
    );

    const cardBoxes = await Promise.all(
      [0, 1, 2, 3].map(async (index) => {
        const box = await cards.nth(index).boundingBox();
        assert.ok(box);
        return box;
      }),
    );
    for (let index = 1; index < cardBoxes.length; index += 1) {
      const previous = cardBoxes[index - 1];
      const current = cardBoxes[index];
      assert.ok(previous && current);
      assert.ok(
        Math.abs(current.x - previous.x - previous.width - 32) <= 1,
        `Storage team gap ${String(index)} was ${current.x - previous.x - previous.width}`,
      );
    }

    await expect(cards.first().locator(':scope > div')).toHaveCSS('padding', '24px');
    for (const biography of await biographies.all()) {
      await expect(biography).toHaveCSS('line-height', '20px');
    }
  },
);
Then(
  'the Storage contact form focuses delivery feedback and preserves values on failure without creating a CMS entity',
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
    const marker = `storage-form-${String(Date.now())}`;
    const form = page.getByRole('form', { name: 'Request a storage management consultation' });
    await form.locator('input[name="firstName"]').fill(marker);
    await form.locator('input[name="lastName"]').fill('Example');
    await form.locator('input[name="email"]').fill('visitor@example.test');
    await form.locator('input[name="phone"]').fill('555-0100');
    await page.route('**/api/v1/inquiries', (route) =>
      route.fulfill({
        status: 502,
        json: { error: { code: 'INQUIRY_DELIVERY_FAILED', message: 'Delivery failed' } },
      }),
    );
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expect(page.getByRole('alert')).toContainText('could not send');
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(form.locator('input[name="firstName"]')).toHaveValue(marker);
    await page.unroute('**/api/v1/inquiries');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expect(form.getByRole('status')).toContainText('Thank you for your inquiry');
    await expect(form.getByRole('status')).toBeFocused();
    await expect
      .poll(async () => {
        const response = await page.request.get('/__mailpit/api/v1/messages', {
          headers: { Authorization: mailpitAuthorization },
        });
        const body = (await response.json()) as {
          readonly messages: readonly { readonly Snippet: string }[];
        };
        return body.messages.some((message) => message.Snippet.includes(marker));
      })
      .toBe(true);
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
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
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
        sections: [
          '#listings',
          '#services',
          '#process',
          '#about',
          '#team',
          '#careers',
          '#faq',
          '#contact',
        ],
      },
      Construction: {
        selector: '[data-entity-boundary="true"]',
        heading: 'Building The Future',
        sections: [
          '#services',
          '#projects',
          '#plan-room',
          '#team',
          '#about',
          '#bid',
          '#careers',
          '#contact',
        ],
      },
      Development: {
        selector: '[data-development-entity-boundary="true"]',
        heading: 'Transforming Vision Into Reality',
        sections: ['#services', '#projects', '#team', '#about', '#reviews', '#careers', '#contact'],
      },
    };
    const expectation = expectations[division];
    assert.ok(expectation, `Unexpected dedicated division ${division}`);
    await expect(
      page.getByRole('heading', { name: expectation.heading, exact: true }),
    ).toBeVisible();
    const publicCount =
      division === 'Development'
        ? 27
        : division === 'Real Estate'
          ? 26
          : division === 'Construction'
            ? 28
            : entityCount;
    await expect(page.locator(expectation.selector)).toHaveCount(publicCount);
    for (const selector of expectation.sections) await expect(page.locator(selector)).toBeVisible();
    if (publicCount !== entityCount) {
      await loginEditor(page);
      await page.goto(this.route);
      await page.getByRole('button', { name: 'Enter edit mode' }).click();
      await expect(page.locator(expectation.selector)).toHaveCount(entityCount);
      await page
        .getByRole('complementary', { name: 'Content editor' })
        .getByRole('button', { name: 'Exit edit mode' })
        .click();
    }
  },
);

interface CollectionGridExpectation {
  readonly items: string;
  readonly columns: number;
}

const constructionCollectionGrids: readonly CollectionGridExpectation[] = [
  { items: '#services [data-slot="editable-collection-items"]', columns: 3 },
  { items: '#plan-room [data-slot="editable-collection-items"]', columns: 2 },
  { items: '#pros [data-slot="editable-collection-items"]', columns: 3 },
];

async function expectCollectionGridGeometry(
  page: Page,
  expectation: CollectionGridExpectation,
): Promise<void> {
  const items = page.locator(expectation.items).first();
  await expect(items).toBeVisible();
  const columns = await items.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
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
  'Construction service and pro card rows use the frozen desktop rhythm',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.reload();

    const services = page.locator('#services');
    const pros = page.locator('#pros');
    const serviceCards = services.locator('.co-card');
    const proCards = pros.locator('.co-card');
    const [servicesBox, prosBox, serviceHeights, proHeights] = await Promise.all([
      services.boundingBox(),
      pros.boundingBox(),
      serviceCards.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      ),
      proCards.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      ),
    ]);
    assert.ok(servicesBox && prosBox);
    assert.ok(
      Math.abs(servicesBox.height - 1020) <= 2,
      `Construction services height was ${servicesBox.height}`,
    );
    assert.ok(
      Math.abs(prosBox.height - 1150) <= 2,
      `Construction pros height was ${prosBox.height}`,
    );
    for (const height of [...serviceHeights, ...proHeights]) {
      assert.ok(Math.abs(height - 252) <= 1, `Construction repeated card height was ${height}`);
    }
  },
);

Then(
  'Construction sectors people and about use the frozen desktop presentation contracts',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.reload();

    const currentProjects = page.locator('#projects');
    const completedProjects = page.locator('#completed-projects');
    const sectorCards = page.locator('#projects .ui-sector, #completed-projects .ui-sector');
    const team = page.locator('#team');
    const about = page.locator('#about');
    const [
      currentProjectsBox,
      completedProjectsBox,
      sectorCardHeights,
      sectorTitleMargin,
      sectorActionLineHeight,
      teamBox,
      teamPadding,
      teamHeadingPresentation,
      teamGridBox,
      aboutBox,
      aboutArtBox,
      aboutPresentation,
    ] = await Promise.all([
      currentProjects.boundingBox(),
      completedProjects.boundingBox(),
      sectorCards.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      ),
      page
        .locator('#projects .ui-sector h3')
        .first()
        .evaluate((element) => getComputedStyle(element).marginBottom),
      page
        .locator('#projects .ui-sector > span')
        .first()
        .evaluate((element) => getComputedStyle(element).lineHeight),
      team.boundingBox(),
      team.evaluate((element) => {
        const style = getComputedStyle(element);
        return { bottom: style.paddingBottom, top: style.paddingTop };
      }),
      team.locator('.ui-heading').evaluate((element) => {
        const eyebrow = element.querySelector(':scope > span');
        const title = element.querySelector(':scope > h2');
        if (eyebrow === null || title === null) throw new Error('Team heading is incomplete.');
        return {
          eyebrowDisplay: getComputedStyle(eyebrow).display,
          titleMarginTop: getComputedStyle(title).marginTop,
        };
      }),
      team.locator('.ui-team-grid').boundingBox(),
      about.boundingBox(),
      about.locator('.ui-about-art').boundingBox(),
      about.evaluate((element) => {
        const title = element.querySelector('h2');
        const action = element.querySelector('a');
        if (title === null || action === null) throw new Error('About presentation is incomplete.');
        return {
          actionBackground: getComputedStyle(action).backgroundColor,
          backgroundImage: getComputedStyle(element).backgroundImage,
          titleColor: getComputedStyle(title).color,
        };
      }),
    ]);

    assert.ok(currentProjectsBox && completedProjectsBox);
    assert.ok(teamBox && teamGridBox && aboutBox && aboutArtBox);
    assert.ok(
      Math.abs(currentProjectsBox.height - 760) <= 2,
      `Current sector section height was ${currentProjectsBox.height}`,
    );
    assert.ok(
      Math.abs(completedProjectsBox.height - 760) <= 2,
      `Completed sector section height was ${completedProjectsBox.height}`,
    );
    for (const height of sectorCardHeights) {
      assert.ok(Math.abs(height - 176) <= 1, `Construction sector card height was ${height}`);
    }
    assert.equal(sectorTitleMargin, '4px');
    assert.equal(sectorActionLineHeight, '20px');
    assert.ok(
      Math.abs(teamBox.height - 678) <= 2,
      `Construction team height was ${teamBox.height}`,
    );
    assert.deepEqual(teamPadding, { bottom: '80px', top: '80px' });
    assert.deepEqual(teamHeadingPresentation, {
      eyebrowDisplay: 'none',
      titleMarginTop: '0px',
    });
    assert.ok(
      Math.abs(teamGridBox.height - 342) <= 1,
      `Construction team grid height was ${teamGridBox.height}`,
    );
    assert.ok(
      Math.abs(aboutBox.height - 756) <= 2,
      `Construction about height was ${aboutBox.height}`,
    );
    assert.ok(
      Math.abs(aboutArtBox.height - 564) <= 1,
      `Construction about art height was ${aboutArtBox.height}`,
    );
    assert.match(aboutPresentation.backgroundImage, /rgb\(30, 58, 138\)/u);
    assert.match(aboutPresentation.backgroundImage, /rgb\(0, 18, 138\)/u);
    assert.match(aboutPresentation.backgroundImage, /rgb\(30, 64, 175\)/u);
    assert.equal(aboutPresentation.titleColor, 'rgb(255, 255, 255)');
    assert.equal(aboutPresentation.actionBackground, 'rgb(0, 18, 138)');
  },
);

Then(
  'Construction workers media preserves the frozen desktop composition',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);

    const crew = page.locator('.ui-workers');
    const image = crew.locator('img');
    const [crewBox, imageBox, copy, padding, presentation] = await Promise.all([
      crew.boundingBox(),
      image.boundingBox(),
      crew.locator('.ui-heading > p').innerText(),
      crew.evaluate((element) => {
        const style = getComputedStyle(element);
        return { bottom: style.paddingBottom, top: style.paddingTop };
      }),
      image.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
        };
      }),
    ]);
    assert.ok(crewBox && imageBox);
    const expectedCopy =
      'The hardworking team that brings every project to life — dedicated professionals committed to quality craftsmanship on every job site.';
    const topOffset = imageBox.y - crewBox.y;
    const matchesFrozenComposition =
      Math.abs(crewBox.height - 754) <= 2 &&
      copy === expectedCopy &&
      padding.bottom === '80px' &&
      padding.top === '80px' &&
      Math.abs(imageBox.height - 400) <= 1 &&
      Math.abs(topOffset - 273) <= 1 &&
      presentation.borderRadius === '0px' &&
      presentation.boxShadow === 'none' &&
      presentation.objectFit === 'cover' &&
      presentation.objectPosition === '50% 0%';
    assert.ok(
      matchesFrozenComposition,
      `Construction workers composition differed: ${JSON.stringify({ copy, crewHeight: crewBox.height, imageHeight: imageBox.height, padding, presentation, topOffset })}`,
    );
  },
);

Then(
  'Construction long-form sections preserve their frozen desktop height and density contracts',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1512, height: 827 });
    await page.reload();

    const sections = [
      { label: 'Plan Room', selector: '#plan-room', target: 1360 },
      { label: 'Bid', selector: '#bid', target: 1078 },
      { label: 'Reviews', selector: '#reviews', target: 818 },
      { label: 'Contact', selector: '#contact', target: 768 },
    ];
    for (const section of sections) {
      const box = await page.locator(section.selector).boundingBox();
      assert.ok(box, `${section.label} section was not rendered`);
      assert.ok(
        Math.abs(box.height - section.target) <= 2,
        `${section.label} section height was ${box.height}`,
      );
    }

    const [planDensity, bidDensity, careerCards, reviewFooterMargin, contactGap] =
      await Promise.all([
        page.locator('#plan-room').evaluate((element) => {
          const heading = element.querySelector('.ui-heading');
          const notice = element.querySelector('.ui-notice');
          const access = element.querySelector('.ui-plan-access');
          if (heading === null || notice === null || access === null) {
            throw new Error('Plan Room composition is incomplete.');
          }
          return {
            accessHeight: access.getBoundingClientRect().height,
            headingMarginBottom: getComputedStyle(heading).marginBottom,
            noticeHeight: notice.getBoundingClientRect().height,
          };
        }),
        page.locator('#bid').evaluate((element) => {
          const form = element.querySelector('.ui-client-form');
          const actionRow = element.querySelector('.ui-form-action-row');
          const submit = element.querySelector('.ui-submit-action');
          if (form === null || actionRow === null || submit === null) {
            throw new Error('Bid form is incomplete.');
          }
          return {
            actionRowMarginTop: getComputedStyle(actionRow).marginTop,
            formGap: getComputedStyle(form).gap,
            submitMarginTop: getComputedStyle(submit).marginTop,
          };
        }),
        page.locator('#careers .ui-career-card').count(),
        page
          .locator('#reviews .ui-review-footer')
          .evaluate((element) => getComputedStyle(element).marginTop),
        page
          .locator('#contact .ui-client-form')
          .evaluate((element) => getComputedStyle(element).gap),
      ]);

    assert.deepEqual(planDensity, {
      accessHeight: 206,
      headingMarginBottom: '100px',
      noticeHeight: 114,
    });
    assert.deepEqual(bidDensity, {
      actionRowMarginTop: '22px',
      formGap: '24px',
      submitMarginTop: '0px',
    });
    assert.equal(careerCards, 1);
    await expect(page.locator('#careers .ui-career-card h3')).toContainText('Project Coordinator');
    await expect(page.locator('#careers select[name="division"]')).toHaveValue('Construction');
    assert.equal(reviewFooterMargin, '52px');
    assert.equal(contactGap, '15px');
  },
);

Then(
  'the Construction footer uses the mounted inverse surface copy title legal and border roles',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);

    const footer = page.locator('.co-footer');
    await expect(footer).toHaveCSS(
      'background-image',
      'linear-gradient(to right bottom, rgb(30, 58, 138), rgb(0, 18, 138), rgb(30, 64, 175))',
    );
    await expect(footer).toHaveCSS('border-top-width', '4px');
    await expect(footer).toHaveCSS('border-top-color', 'rgba(37, 99, 235, 0.5)');

    const description = footer.locator('.ui-footer-copy-lead');
    await expect(description).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
    await expect(description).toHaveCSS('font-size', '16px');
    await expect(description).toHaveCSS('line-height', '24px');

    for (const title of ['Quick Links', 'Licenses']) {
      const heading = footer.getByRole('heading', { name: title });
      await expect(heading).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(heading).toHaveCSS('font-size', '18px');
      await expect(heading).toHaveCSS('font-weight', '600');
      await expect(heading).toHaveCSS('line-height', '28px');
    }

    const legal = footer.locator('.ui-footer-legal-copy');
    await expect(legal).toHaveCSS('color', 'rgba(255, 255, 255, 0.6)');
    await expect(legal).toHaveCSS('font-size', '14px');
    await expect(legal).toHaveCSS('line-height', '20px');
  },
);

Then(
  'the Construction footer preserves its desktop geometry editor wrappers and mobile containment',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const readGeometry = async () => {
      const footer = await page.locator('.co-footer').boundingBox();
      const grid = await page.locator('.co-footer-grid').boundingBox();
      const logo = await page.locator('.co-footer img').boundingBox();
      assert.ok(footer && grid && logo);
      return {
        footer: {
          x: footer.x,
          width: footer.width,
          height: footer.height,
        },
        grid: {
          x: grid.x,
          y: grid.y - footer.y,
          width: grid.width,
          height: grid.height,
        },
        logo: { width: logo.width, height: logo.height },
      };
    };

    const publicGeometry = await readGeometry();
    assert.ok(Math.abs(publicGeometry.footer.x) <= 1);
    assert.ok(Math.abs(publicGeometry.footer.width - 1425) <= 1);
    assert.ok(Math.abs(publicGeometry.footer.height - 517) <= 2);
    assert.ok(Math.abs(publicGeometry.grid.x - 28.5) <= 1);
    assert.ok(Math.abs(publicGeometry.grid.y - 68) <= 1);
    assert.ok(Math.abs(publicGeometry.grid.width - 1368) <= 1);
    assert.ok(Math.abs(publicGeometry.grid.height - 284) <= 1);
    assert.ok(Math.abs(publicGeometry.logo.width - 200) <= 1);
    assert.ok(Math.abs(publicGeometry.logo.height - 48) <= 1);

    await loginEditor(page);
    await page.goto('/construction');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const editGeometry = await readGeometry();
    assert.deepEqual(editGeometry, publicGeometry);
    await expect(
      page.locator('.co-footer [data-construction-entity-boundary="true"]'),
    ).not.toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const containment = await page.locator('.co-footer').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: rect.left,
        right: rect.right,
      };
    });
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1);
    assert.ok(containment.left >= -1 && containment.right <= 391);
  },
);

Then(
  'the Construction bid uses the mounted inverse section and form presentation',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);

    const bid = page.locator('#bid');
    await expect(bid).toHaveCSS(
      'background-image',
      'linear-gradient(to right bottom, rgb(0, 10, 77), rgb(0, 18, 138), rgb(30, 58, 138))',
    );
    await expect(bid.getByRole('heading', { name: 'Get a Bid on Your Project' })).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    );
    await expect(bid.locator('.ui-heading p')).toHaveCSS('color', 'rgba(255, 255, 255, 0.8)');

    const formSurface = bid.locator('.ui-form-surface');
    await expect(formSurface).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.1)');
    await expect(formSurface).toHaveCSS('border-color', 'rgba(255, 255, 255, 0.1)');
    const input = bid.locator('input').first();
    await expect(input).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.2)');
    await expect(input).toHaveCSS('border-color', 'rgba(255, 255, 255, 0.2)');
    await expect(bid.locator('#construction-project-type-label')).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    );
    await expect(bid.getByRole('button', { name: 'Request Your Bid' })).toHaveCSS(
      'background-color',
      'rgb(0, 18, 138)',
    );
    await expect(bid.getByRole('link', { name: '(801) 571-8833' })).toHaveAttribute(
      'href',
      'tel:8015718833',
    );
    await expect(bid.getByRole('link', { name: 'Email Us' })).toHaveAttribute(
      'href',
      'mailto:Office@tricoinc.com',
    );
  },
);

Then(
  'the Construction bid preserves its geometry editor wrappers mobile containment and select behavior',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const readGeometry = async () => {
      const section = await page.locator('#bid').boundingBox();
      const form = await page.locator('#bid .ui-form-layout--wide').boundingBox();
      assert.ok(section && form);
      return {
        section: { x: section.x, width: section.width, height: section.height },
        form: { width: form.width },
      };
    };

    const publicGeometry = await readGeometry();
    assert.ok(Math.abs(publicGeometry.section.x) <= 1);
    assert.ok(Math.abs(publicGeometry.section.width - 1425) <= 1);
    assert.ok(Math.abs(publicGeometry.section.height - 1078) <= 2);
    assert.ok(Math.abs(publicGeometry.form.width - 830) <= 1);

    const trigger = page.getByRole('combobox', { name: 'Project Type *' });
    await trigger.focus();
    await page.keyboard.type('Underground');
    await expect(trigger).toHaveText('Underground Utilities');

    await loginEditor(page);
    await page.goto('/construction');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const editGeometry = await readGeometry();
    assert.deepEqual(editGeometry, publicGeometry);
    await expect(page.locator('#bid [data-construction-entity-boundary="true"]')).not.toHaveCount(
      0,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    const containment = await page.locator('#bid').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: rect.left,
        right: rect.right,
      };
    });
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1);
    assert.ok(containment.left >= -1 && containment.right <= 391);
  },
);

Then(
  'the Development footer uses the mounted inverse surface brand copy title link and legal roles',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 1425, height: 1100 });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);

    const footer = page.locator('.dev-footer');
    await expect(footer).toHaveCSS(
      'background-image',
      'linear-gradient(to right bottom, rgb(30, 58, 138), rgb(0, 18, 138), rgb(30, 64, 175))',
    );
    await expect(footer).toHaveCSS('border-top-width', '4px');
    await expect(footer).toHaveCSS('border-top-color', 'rgba(37, 99, 235, 0.5)');

    const divisionLabel = footer.getByText('Development', { exact: true });
    await expect(divisionLabel).toHaveCSS('color', 'rgb(94, 133, 186)');
    await expect(divisionLabel).toHaveCSS('font-size', '14px');
    await expect(divisionLabel).toHaveCSS('font-weight', '700');
    await expect(divisionLabel).toHaveCSS('line-height', '20px');

    const description = footer.locator('.ui-footer-copy-lead');
    await expect(description).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
    await expect(description).toHaveCSS('font-size', '16px');
    await expect(description).toHaveCSS('line-height', '24px');
    await expect(description).toHaveCSS('margin-top', '24px');
    await expect(description).toHaveCSS('margin-bottom', '24px');

    for (const title of ['Quick Links', 'Service Areas']) {
      const heading = footer.getByRole('heading', { name: title });
      await expect(heading).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(heading).toHaveCSS('font-size', '18px');
      await expect(heading).toHaveCSS('font-weight', '600');
      await expect(heading).toHaveCSS('line-height', '28px');
      await expect(heading).toHaveCSS('margin-bottom', '16px');
    }

    const link = footer.getByRole('link', { name: 'Land Acquisition', exact: true });
    await expect(link).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
    await expect(link).toHaveCSS('display', 'inline');
    await expect(link).toHaveCSS('font-size', '14px');
    await expect(link).toHaveCSS('line-height', '20px');
    await expect(link).toHaveCSS('margin-top', '0px');

    const contactRow = footer.locator('.ui-inverse-contact-row').first();
    await expect(contactRow).toHaveCSS('height', '20px');
    await expect(contactRow).toHaveCSS('gap', '12px');

    const legal = footer.locator('.ui-footer-legal-copy');
    await expect(legal).toHaveCSS('color', 'rgba(255, 255, 255, 0.6)');
    await expect(legal).toHaveCSS('font-size', '14px');
    await expect(legal).toHaveCSS('line-height', '20px');
    await expect(legal).toHaveCSS('border-top-color', 'rgba(255, 255, 255, 0.2)');
  },
);

Then(
  'the Development footer preserves its desktop geometry editor wrappers and mobile containment',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const readGeometry = async () => {
      const footer = await page.locator('.dev-footer').boundingBox();
      const grid = await page.locator('.dev-footer-grid').boundingBox();
      const gridStyle = await page.locator('.dev-footer-grid').evaluate((element) => {
        const style = getComputedStyle(element);
        return { columns: style.gridTemplateColumns, gap: style.columnGap };
      });
      assert.ok(footer && grid);
      return {
        footer: { x: footer.x, width: footer.width, height: footer.height },
        grid: {
          x: grid.x,
          y: grid.y - footer.y,
          width: grid.width,
          height: grid.height,
        },
        gridStyle,
      };
    };

    const publicGeometry = await readGeometry();
    assert.ok(Math.abs(publicGeometry.footer.x) <= 1);
    assert.ok(Math.abs(publicGeometry.footer.width - 1425) <= 1);
    assert.ok(Math.abs(publicGeometry.footer.height - 517) <= 2);
    assert.ok(Math.abs(publicGeometry.grid.x - 28.5) <= 1);
    assert.ok(Math.abs(publicGeometry.grid.y - 68) <= 1);
    assert.ok(Math.abs(publicGeometry.grid.width - 1368) <= 1);
    assert.ok(Math.abs(publicGeometry.grid.height - 284) <= 1);
    assert.deepEqual(publicGeometry.gridStyle, {
      columns: '424px 424px 424px',
      gap: '48px',
    });

    await loginEditor(page);
    await page.goto('/development');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await expect(page.getByRole('complementary', { name: 'Content editor' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const editGeometry = await readGeometry();
    assert.deepEqual(
      {
        footer: { x: editGeometry.footer.x, width: editGeometry.footer.width },
        grid: { x: editGeometry.grid.x, width: editGeometry.grid.width },
      },
      {
        footer: { x: publicGeometry.footer.x, width: publicGeometry.footer.width },
        grid: { x: publicGeometry.grid.x, width: publicGeometry.grid.width },
      },
    );
    await expect(
      page.locator('.dev-footer [data-development-entity-boundary="true"]'),
    ).not.toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const containment = await page.locator('.dev-footer').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: rect.left,
        right: rect.right,
      };
    });
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1);
    assert.ok(containment.left >= -1 && containment.right <= 391);
    await expect(page.locator('.dev-footer-grid')).toHaveCSS('grid-template-columns', '358px');
  },
);

Then(
  'public Construction collection grids retain their responsive columns while restricted plans stay hidden',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    for (const breakpoint of [
      { width: 1023, columns: [2, 2, 2] },
      { width: 390, columns: [1, 1, 1] },
    ]) {
      await page.setViewportSize({ width: breakpoint.width, height: 1100 });
      for (const [index, expectation] of constructionCollectionGrids.entries()) {
        if (index === 1) continue;
        const expectedColumns = breakpoint.columns[index];
        assert.ok(expectedColumns !== undefined);
        await expectCollectionGridGeometry(page, { ...expectation, columns: expectedColumns });
      }
      await expect(page.locator('#plan-room [data-slot="editable-collection-items"]')).toBeHidden();
    }
  },
);

Then(
  'unchanged unverified Construction project totals are hidden publicly',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await expect(page.getByText('500+', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Projects Completed', { exact: true })).toHaveCount(0);
  },
);

Then(
  'the Construction About card does not reserve space for a hidden statistic',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#about').getByRole('heading', { level: 2 })).toBeVisible();
    const card = page.locator('#about [data-slot="card"]').first();
    if ((await card.count()) === 0) return;
    const box = await card.boundingBox();
    assert.ok(box && box.height < 220, `Empty About card still occupies ${String(box?.height)}px`);
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
      await expectCollectionGridGeometry(page, {
        items: '#reviews [data-slot="editable-collection-items"]',
        columns: 3,
      });
    }
  },
);

Then(
  'Construction project totals retain explicit approval controls in edit mode',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const projectStats = page.getByRole('button', { name: 'Edit Projects Completed' });
    await expect(projectStats).toHaveCount(2);
    for (const index of [0, 1]) {
      await projectStats.nth(index).click();
      const sheet = page.locator('[data-slot="sheet-content"]');
      await expect(sheet.getByLabel('Public visibility')).toHaveValue('legacy');
      await sheet.getByRole('button', { name: 'Cancel' }).click();
    }
    await page.getByRole('button', { name: 'Edit About TriCo Construction' }).click();
    const aboutSheet = page.locator('[data-slot="sheet-content"]');
    await expect(aboutSheet.getByLabel('Public visibility')).toHaveValue('legacy');
    await aboutSheet.getByRole('button', { name: 'Cancel' }).click();
  },
);

Then(
  'shared collection sizing preserves Real Estate and Property Management service grids',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/real-estate');
    await expectCollectionGridGeometry(page, {
      items: '#services [data-slot="editable-collection-items"]',
      columns: 3,
    });
    await page.goto('/property-management');
    const propertyServices = page.locator('#services [data-slot="editable-collection-items"]');
    await expect(propertyServices).toBeVisible();
    const propertyBox = await propertyServices.boundingBox();
    assert.ok(propertyBox);
    assert.ok(propertyBox.width > 800);
    assert.ok(Math.abs(propertyBox.x + propertyBox.width / 2 - 720) <= 2);
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
      const photo = page.locator('#listings [data-slot="card"] > div > img').first();
      await expect(photo).toBeVisible();
      const box = await photo.boundingBox();
      assert.ok(box);
      assert.ok(Math.abs(box.width / box.height - 4 / 3) <= 0.02);
    }
  },
);

Then(
  'Real Estate listing photos preserve their frozen source identities',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/real-estate');
    const sourceFor = async (address: string): Promise<string> => {
      const card = page
        .locator('#listings [data-slot="card"]')
        .filter({ has: page.getByRole('heading', { name: address, exact: true }) });
      await expect(card).toHaveCount(1);
      const source = await card.locator('img').first().getAttribute('src');
      assert.ok(source);
      return source;
    };
    assert.match(await sourceFor('9853 S 700 E'), /photo-1486406146926-c627a92ad1ab/);
    assert.match(await sourceFor('2560 E 3300 S'), /photo-1497366216548-37526070297c/);
    assert.match(await sourceFor('1457 N Whisper Hollow Cir'), /whisper-hollow-lot-119/);
    await page.getByRole('tab', { name: 'Sold (5)', exact: true }).click();
    assert.match(await sourceFor('2200 State St'), /photo-1497366216548-37526070297c/);
    assert.match(await sourceFor('Lot 5–8, Cedar Hills'), /photo-1628624747186-a941c476b7ef/);
    assert.match(await sourceFor('750 Technology Way'), /photo-1504307651254-35680f356dfd/);
    await page.getByRole('tab', { name: 'Active Listings (5)', exact: true }).click();
  },
);

Then(
  'listing directory actions and the contact call to action complete the gallery',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await page.goto('/real-estate');
    const directories = page.getByRole('group', { name: 'Listing directories' });
    const links = directories.getByRole('link');
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveAttribute('href', 'https://www.utahrealestate.com/');
    await expect(links.nth(1)).toHaveAttribute('href', 'https://www.loopnet.com/');
    await expect(links.nth(2)).toHaveAttribute('href', '#contact');
    for (const link of await links.all()) await expect(link).toBeVisible();
  },
);

Then(
  'the single Real Estate contact form delivers only after a successful request',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    await expect(page.locator('#new-client form')).toHaveCount(0);
    const form = page.locator('#contact form');
    await form.locator('input[name="firstName"]').fill('Real Estate');
    await form.locator('input[name="lastName"]').fill('Visitor');
    await form.locator('input[name="email"]').fill('real-estate-visitor@example.test');
    await form.locator('input[name="phone"]').fill('(801) 555-0150');
    await form.locator('select[name="interest"]').selectOption('Buying a home');
    const request = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/v1/inquiries'),
    );
    await form.getByRole('button', { name: 'Get Started' }).click();
    await request;
  },
);

Then(
  'listing tabs show active and sold counts in a keyboard-connected segmented control',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const tabs = page.getByRole('tablist', { name: 'Property listing status' });
    const active = tabs.getByRole('tab', { name: 'Active Listings (5)', exact: true });
    const sold = tabs.getByRole('tab', { name: 'Sold (5)', exact: true });
    await expect(active).toHaveAttribute('aria-selected', 'true');
    await active.focus();
    await page.keyboard.press('ArrowRight');
    await expect(sold).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(sold).toHaveAttribute('aria-selected', 'true');
    await expect(sold).toHaveAttribute('aria-controls', /.+/);
    await sold.click();
    await expect(sold).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#listings [data-slot="card"]')).toHaveCount(5);
    await active.click();
    await expect(active).toHaveAttribute('aria-selected', 'true');
  },
);

Then(
  'each available external listing action remains accessible but visually subordinate',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const actions = page.locator('#listings [data-slot="card"] a[target="_blank"]');
    await expect(actions).toHaveCount(5);
    for (const action of await actions.all()) {
      await expect(action).toHaveAttribute('rel', 'noreferrer');
      await expect(action).toHaveAttribute('data-slot', 'button');
      await expect(action).toBeVisible();
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
Then(
  'a new Construction project starts hidden and cannot be approved with starter content',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const entityId = 'construction.current-projects.projects.multi-family';
    await loginEditor(page);
    const before = await pendingFor(page, entityId, 'construction');
    await page.goto('/construction/current/multi-family');
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await page
      .getByRole('button', { name: /Add project/i })
      .first()
      .click();
    const sheet = page.getByRole('dialog', { name: /Add project/i });
    await expect(sheet.getByLabel('Public visibility')).toHaveValue('hidden');
    await sheet.getByLabel('Public visibility').selectOption('approved');
    await sheet.getByRole('button', { name: 'Save changes' }).click();
    await expect(sheet.getByText('Choose a real project photo before approval.')).toBeVisible();
    await expect(sheet).toBeVisible();
    const after = await pendingFor(page, entityId, 'construction');
    assert.equal(after?.revision, before?.revision);
  },
);

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
    const previewResponse = await page.request.delete('/api/v1/preview/disabled/home.hero', {
      headers: await csrfHeaders(page),
    });
    assert.equal(previewResponse.status(), 204);
    this.cleanup.push({ page, entityId: 'home.hero' });
    const previewPageResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/v1/pages/home/preview'),
    );
    await page.getByRole('button', { name: 'Enter edit mode' }).click();
    await previewPageResponse;
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
    this.propertyHeaderLabel =
      (await page.locator('header a[aria-label="TriCo home"] strong').textContent()) ?? '';
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
    this.propertyHeaderLabel =
      (await page.locator('header a[aria-label="TriCo home"] strong').textContent()) ?? '';
    this.propertyHeroHeading = await page.getByRole('heading', { level: 1 }).innerText();
  },
);

When('I open the Page header editor', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('button', { name: 'Edit Page header' }).click();
});

When('I open the Opening section editor', async function (this: FrontendWorld) {
  const page = this.currentPage();
  if ((page.viewportSize()?.width ?? 0) > 800)
    await page.locator('section[aria-labelledby="property-management-hero-heading"]').hover();
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
    await expect(page.locator('header a[aria-label="TriCo home"] strong')).toHaveText(
      this.propertyHeaderLabel,
    );
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
  await page.getByRole('button', { name: 'Edit Page header' }).click();
  const dialog = page.getByRole('dialog', { name: 'Page header' });
  this.propertyEditedHeaderLabel = `Property Management ${String(Date.now())}`;
  await dialog.getByLabel('Division label').fill(this.propertyEditedHeaderLabel);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
});

Then(
  'the saved Page header value appears in my private preview',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().locator('header a[aria-label="TriCo home"] strong')).toHaveText(
      this.propertyEditedHeaderLabel,
    );
  },
);

When('I reopen and save a friendly Opening section change', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.locator('section[aria-labelledby="property-management-hero-heading"]').hover();
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
  this.collectionValue = value;
  this.originalItemIds = value.map(({ id }) => id);
  this.reorderedItemLabel = first.title;
  const item = page
    .getByRole('heading', { name: first.title, exact: true })
    .locator('xpath=ancestor::*[@data-slot="editable-item"][1]');
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
  await expect(page.locator('#values [data-slot="editable-collection"]')).toHaveAttribute(
    'data-editor-state',
    'mine',
  );
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
    const pending = await pendingFor(page, entityId);
    assert.ok(pending);
    const response = await page.request.put(
      `/api/v1/entities/${encodeURIComponent(entityId)}/changes`,
      {
        headers: await csrfHeaders(page),
        data: {
          replacementValue: this.collectionValue,
          expectedRevision: pending.revision,
        },
      },
    );
    assert.equal(response.status(), 204);
  },
);

Then('the JSON-equivalent pending change is removed', async function (this: FrontendWorld) {
  const page = this.currentPage();
  assert.equal(await pendingFor(page, 'home.core-values.items'), undefined);
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
  const addedItem = addedHeading.locator('xpath=ancestor::*[@data-slot="editable-item"][1]');
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
    .locator('xpath=ancestor::*[@data-slot="editable-item"][1]');
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
    .locator('xpath=ancestor::*[@data-slot="editable-item"][1]');
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
  await deleteButton.focus();
  await page.keyboard.press('Enter');
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
    await expect(page.locator('#careers [data-slot=editable-item]')).toHaveCount(0);
  },
);
When('I use its add control and approve the first item', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.getByRole('button', { name: '+ Add position' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add position' });
  this.noviceValue = `First browser position ${String(Date.now())}`;
  await sheet.getByLabel('Position title').fill(this.noviceValue);
  await sheet.getByLabel('Division').selectOption('Construction');
  await sheet.getByLabel('Employment type').selectOption('Part-time');
  await sheet.getByLabel('Public visibility').selectOption('approved');
  await sheet.getByRole('button', { name: 'Save changes' }).click();
});
Then('the approved new item appears in my private preview', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByRole('heading', { name: this.noviceValue })).toBeVisible();
  const pending = await pendingFor(this.currentPage(), 'home.careers.open-positions');
  assert.ok(pending);
  const list = homeCareersOpenPositionsSchema.parse(pending.replacementValue);
  assert.equal(list.length, 1);
  assert.equal(list[0]?.title, this.noviceValue);
  assert.equal(list[0]?.publicVisibility, 'approved');
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
    const collection = this.currentPage().locator('#news [data-slot=editable-collection]');
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
  await page.getByRole('button', { name: 'Edit Header logo' }).click();
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
    await expect(sheet.locator('figure img')).toBeVisible();
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
    const logo = page.locator('header a[aria-label="TriCo home"] img');
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
    .locator('xpath=ancestor::*[@data-slot="editable-item"][1]');
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
    .locator('xpath=ancestor::div[@data-slot="editable-boundary"]');
  await expect(boundary.getByText('Unpublished change', { exact: true })).toBeVisible();
});

Given(
  'I am signed in and editing Home at a {int} by {int} touch viewport',
  async function (this: FrontendWorld, width: number, height: number) {
    const page = this.currentPage();
    await page.setViewportSize({ width, height });
    await loginEditor(page);
    const initial = await page.locator('#values').boundingBox();
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
  'component and collection item actions remain visibly labeled grouped and unclipped',
  async function (this: FrontendWorld) {
    const page = this.currentPage();
    const item = page.locator('#values [data-slot=editable-item]').first();
    await expect(item.getByRole('group', { name: /^Actions for / })).toHaveCount(1);
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
  const item = page.locator('#values [data-slot=editable-item]').first();
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
    .locator('#values [data-slot=editable-item]')
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
    await expect(page.getByRole('button', { name: 'Edit Opening message' })).toHaveCount(0);
    await expect(page.locator('#values [data-slot="editable-item"] button')).toHaveCount(0);
    const final = await page.locator('#values').boundingBox();
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
  'the desktop editor toolbar stays compact and within the viewport',
  async function (this: FrontendWorld) {
    const toolbar = this.currentPage().getByRole('complementary', { name: 'Content editor' });
    const box = await toolbar.boundingBox();
    assert.ok(box);
    assert.ok(box.height <= 80);
    assert.ok(box.x >= 0 && box.x + box.width <= 1425);
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
      assert.ok(box.height >= 32, `Desktop action ${actionName} was ${String(box.height)}px tall.`);
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
    await expect(publish).toHaveClass(/bg-primary/);
    await expect(publish).toHaveClass(/text-primary-foreground/);
    const panelBox = await panel.boundingBox();
    const publishBox = await publish.boundingBox();
    const discardBox = await panel.getByRole('button', { name: 'Discard' }).first().boundingBox();
    assert.ok(panelBox);
    assert.ok(publishBox);
    assert.ok(discardBox);
    const panelInsets = await panel.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return (
        Number.parseFloat(style.paddingLeft) +
        Number.parseFloat(style.paddingRight) +
        Number.parseFloat(style.borderLeftWidth) +
        Number.parseFloat(style.borderRightWidth)
      );
    });
    assert.ok(
      publishBox.height > discardBox.height,
      'The final publish action should be taller than the secondary discard action.',
    );
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
    const firstAction = toolbar.getByRole('button', { name: 'View public' });
    const feedback = toolbar.getByRole('status');
    await expect(feedback).toBeVisible();
    const actionsBox = await firstAction.boundingBox();
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
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
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

When('I submit a valid anonymous Storage inquiry', async function (this: FrontendWorld) {
  this.inquiryMarker = `ux-${String(Date.now())}`;
  const response = await this.currentPage().request.post('/api/v1/inquiries', {
    headers: { Origin: applicationOrigin },
    data: {
      kind: 'storage-consultation',
      name: this.inquiryMarker,
      email: 'inquiry@example.test',
      phone: '555-0100',
      facilityCount: '1',
      message: 'Local acceptance inquiry',
      website: '',
    },
  });
  this.responseStatus = response.status();
  this.responseBody = await response.json();
});

Then(
  'delivery is acknowledged only after it reaches the configured mailbox',
  async function (this: FrontendWorld) {
    assert.equal(this.responseStatus, 200);
    assert.deepEqual(this.responseBody, { delivered: true });
    await expect
      .poll(async () => {
        const response = await this.currentPage().request.get('/__mailpit/api/v1/messages', {
          headers: { Authorization: mailpitAuthorization },
        });
        const body = (await response.json()) as {
          readonly messages: readonly { readonly Snippet: string }[];
        };
        return body.messages.some((message) => message.Snippet.includes(this.inquiryMarker));
      })
      .toBe(true);
  },
);

Then(
  'invalid cross-origin or excessive inquiries are rejected',
  async function (this: FrontendWorld) {
    const invalid = await this.currentPage().request.post('/api/v1/inquiries', {
      headers: { Origin: applicationOrigin },
      data: { kind: 'storage-consultation', name: 'Example', email: 'bad-email' },
    });
    assert.equal(invalid.status(), 400);
    const forged = await this.currentPage().request.post('/api/v1/inquiries', {
      headers: { Origin: 'https://foreign.example' },
      data: {
        kind: 'storage-consultation',
        name: 'Example',
        email: 'inquiry@example.test',
        phone: '555-0100',
      },
    });
    assert.equal(forged.status(), 403);
  },
);

When(
  'I stage a valid anonymous PDF resume privately and submit a career application',
  async function (this: FrontendWorld) {
    this.inquiryMarker = `career-${String(Date.now())}`;
    const resume = Buffer.alloc(10 * 1_024 * 1_024, 0x20);
    resume.write('%PDF-1.4\nlocal acceptance resume\n');
    const reservation = await this.currentPage().request.post('/api/v1/applications/uploads', {
      headers: { Origin: applicationOrigin },
      data: {
        resumeName: 'resume.pdf',
        resumeContentType: 'application/pdf',
        contentLength: resume.length,
      },
    });
    assert.equal(reservation.status(), 200);
    const upload = (await reservation.json()) as { uploadId: string; uploadUrl: string };
    this.careerUploadId = upload.uploadId;
    const signedUrl = new URL(upload.uploadUrl);
    const stored = await this.currentPage().request.put(
      `${applicationOrigin}/__objects${signedUrl.pathname}${signedUrl.search}`,
      { data: resume, headers: { 'Content-Type': 'application/pdf' } },
    );
    assert.equal(stored.status(), 200);
    this.careerPayload = {
      name: this.inquiryMarker,
      email: 'applicant@example.test',
      division: 'Construction',
      position: 'Project Coordinator',
      uploadId: upload.uploadId,
      website: '',
    };
    const response = await this.currentPage().request.post('/api/v1/applications', {
      headers: { Origin: applicationOrigin },
      data: this.careerPayload,
    });
    this.responseStatus = response.status();
    this.responseBody = await response.json();
  },
);

Then(
  'the final application request contains only an upload reference and the resume reaches the configured mailbox',
  async function (this: FrontendWorld) {
    assert.ok(JSON.stringify(this.careerPayload).length < 2_000);
    assert.equal(this.careerPayload['uploadId'], this.careerUploadId);
    assert.equal('resumeBase64' in this.careerPayload, false);
    assert.equal(this.responseStatus, 200);
    assert.deepEqual(this.responseBody, { delivered: true });
    await expect
      .poll(async () => {
        const response = await this.currentPage().request.get('/__mailpit/api/v1/messages', {
          headers: { Authorization: mailpitAuthorization },
        });
        const body = (await response.json()) as {
          readonly messages: readonly {
            readonly Snippet: string;
            readonly Attachments: number;
            readonly To: readonly { readonly Address: string }[];
          }[];
        };
        return body.messages.some(
          (message) =>
            message.Snippet.includes(this.inquiryMarker) &&
            message.Attachments === 1 &&
            message.To.some((recipient) => recipient.Address === 'applications@example.test'),
        );
      })
      .toBe(true);
  },
);

Then(
  'invalid or replayed resumes and cross-origin or excessive career applications are rejected',
  async function (this: FrontendWorld) {
    const payload = {
      name: 'Example Applicant',
      email: 'applicant@example.test',
      division: 'Construction',
      uploadId: crypto.randomUUID(),
      website: '',
    };
    const replay = await this.currentPage().request.post('/api/v1/applications', {
      headers: { Origin: applicationOrigin },
      data: this.careerPayload,
    });
    assert.equal(replay.status(), 400);
    const badResume = Buffer.from('not a PDF');
    const badReservation = await this.currentPage().request.post('/api/v1/applications/uploads', {
      headers: { Origin: applicationOrigin },
      data: {
        resumeName: 'resume.pdf',
        resumeContentType: 'application/pdf',
        contentLength: badResume.length,
      },
    });
    assert.equal(badReservation.status(), 200);
    const badUpload = (await badReservation.json()) as { uploadId: string; uploadUrl: string };
    const badUrl = new URL(badUpload.uploadUrl);
    const stored = await this.currentPage().request.put(
      `${applicationOrigin}/__objects${badUrl.pathname}${badUrl.search}`,
      { data: badResume, headers: { 'Content-Type': 'application/pdf' } },
    );
    assert.equal(stored.status(), 200);
    const invalid = await this.currentPage().request.post('/api/v1/applications', {
      headers: { Origin: applicationOrigin },
      data: { ...payload, uploadId: badUpload.uploadId },
    });
    assert.equal(invalid.status(), 400);
    const forgedUpload = await this.currentPage().request.post('/api/v1/applications/uploads', {
      headers: { Origin: 'https://foreign.example' },
      data: {
        resumeName: 'resume.pdf',
        resumeContentType: 'application/pdf',
        contentLength: 10,
      },
    });
    assert.equal(forgedUpload.status(), 403);
    const forged = await this.currentPage().request.post('/api/v1/applications', {
      headers: { Origin: 'https://foreign.example' },
      data: payload,
    });
    assert.equal(forged.status(), 403);
  },
);
