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

const baseUrl = process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088';
const editorEmail = process.env.PREVIEW_EDITOR_EMAIL ?? 'editor@tricoinc.com';
const editorPassword = process.env.PREVIEW_EDITOR_PASSWORD ?? 'local-preview-password';
const headings: Readonly<Record<string, string>> = {
  '/': "Building Utah's Future",
  '/property-management': 'Property management that performs',
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
  currentPage(): Page {
    assert.ok(this.page);
    return this.page;
  }
}
setWorldConstructor(FrontendWorld);

Before(async function (this: FrontendWorld) {
  this.browser = await chromium.launch();
  this.context = await this.browser.newContext({ baseURL: baseUrl });
  this.page = await this.context.newPage();
});
After(async function (this: FrontendWorld) {
  await this.context?.close();
  await this.browser?.close();
});

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
