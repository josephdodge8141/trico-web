import { storageV2SeedData, type PageContent } from '@app/schemas';

interface Parser<Output> {
  parse(value: unknown): Output;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isLegacyStorageValue(entityId: keyof typeof storageV2SeedData, value: unknown): boolean {
  if (isRecord(value) && 'content' in value && 'media' in value && 'externalUrls' in value)
    return true;
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  if (!isRecord(first)) return false;
  if (entityId === 'storage.hero.stats') return !('value' in first);
  if (entityId === 'storage.team.members') return !('imageAltText' in first);
  if (entityId === 'storage.reviews.platforms') return 'href' in first;
  if (entityId === 'storage.footer.links') return 'href' in first;
  if (entityId === 'storage.footer.branding-options') return 'content' in first;
  return false;
}

export function parseStorageValue<Output>(
  document: PageContent,
  entityId: keyof typeof storageV2SeedData,
  parser: Parser<Output>,
): Output {
  const candidate = document[entityId];
  return parser.parse(
    candidate === undefined || isLegacyStorageValue(entityId, candidate)
      ? storageV2SeedData[entityId]
      : candidate,
  );
}
