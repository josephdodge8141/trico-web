import {
  contentManifestSchema,
  pageContentSchema,
  type PageContent as PageDocument,
} from '@app/schemas';

import {
  defaultPages,
  pageIds,
  type ContentCard,
  type PageContent,
  type PageId,
} from '../pages/pageContent.js';

export interface ContentRequestOptions {
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly manifestEndpoint?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const isPageId = (value: string): value is PageId =>
  pageIds.some((pageId) => pageId === value);
export const parseContentManifest = contentManifestSchema.parse;

const overlayObject = <Value extends object>(fallback: Value, value: unknown): Value =>
  (isRecord(value) ? { ...fallback, ...value } : fallback) as Value;
const isContentCard = (value: unknown): value is ContentCard =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  typeof value.description === 'string';

export const parsePageContent = (pageId: PageId, value: unknown): PageContent => {
  const root = pageContentSchema.parse(value);
  const fallback = defaultPages[pageId];
  const heroValue = root[`${pageId}.hero`];
  const overlaidHero = overlayObject(fallback.hero, heroValue);
  const hero =
    pageId === 'home' && isRecord(heroValue) && typeof heroValue['heading'] === 'string'
      ? { ...overlaidHero, title: heroValue['heading'] }
      : overlaidHero;
  const contact = overlayObject(
    fallback.contact,
    root[`${pageId}.contact.details`] ?? root[`${pageId}.contact`],
  );
  const sections = fallback.sections.map((section) => {
    const sectionValue = root[section.entityId];
    if (Array.isArray(sectionValue) && sectionValue.every(isContentCard))
      return { ...section, cards: sectionValue };
    return overlayObject(section, sectionValue);
  });
  return { ...fallback, hero, sections, contact };
};

const requestJson = async (url: string, options: ContentRequestOptions): Promise<unknown> => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (fetchImpl === undefined) throw new Error('Fetch is unavailable in this environment');
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    signal: options.signal ?? null,
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`Content request failed (${response.status})`);
  return response.json();
};

export async function fetchPublicPage(
  pageId: PageId,
  options: ContentRequestOptions = {},
): Promise<PageContent> {
  const manifest = parseContentManifest(
    await requestJson(options.manifestEndpoint ?? '/content/manifest.json', options),
  );
  const page = manifest.pages[pageId];
  if (page === undefined) throw new Error(`Content manifest does not include ${pageId}`);
  return parsePageContent(pageId, await requestJson(page.url, options));
}

export async function fetchPublicPageDocument(
  pageId: PageId,
  options: ContentRequestOptions = {},
): Promise<PageDocument> {
  const manifest = parseContentManifest(
    await requestJson(options.manifestEndpoint ?? '/content/manifest.json', options),
  );
  const page = manifest.pages[pageId];
  if (page === undefined) throw new Error(`Content manifest does not include ${pageId}`);
  return pageContentSchema.parse(await requestJson(page.url, options));
}

export async function fetchPreviewPage(
  pageId: PageId,
  options: ContentRequestOptions = {},
): Promise<PageContent> {
  return parsePageContent(pageId, await requestJson(`/api/v1/pages/${pageId}/preview`, options));
}

export async function fetchPreviewPageDocument(
  pageId: PageId,
  options: ContentRequestOptions = {},
): Promise<PageDocument> {
  return pageContentSchema.parse(await requestJson(`/api/v1/pages/${pageId}/preview`, options));
}
