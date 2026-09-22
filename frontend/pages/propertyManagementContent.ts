import { propertyManagementV2SeedData, type PageContent } from '@app/schemas';

interface Parser<Output> {
  parse(value: unknown): Output;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isLegacyValue(
  entityId: keyof typeof propertyManagementV2SeedData,
  value: unknown,
): boolean {
  if (isRecord(value) && 'content' in value && 'media' in value && 'externalUrls' in value) {
    return true;
  }
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  if (!isRecord(first)) return false;
  if (entityId.startsWith('property-management.portfolio.')) return !('photoAltText' in first);
  if (entityId === 'property-management.team.members') return !('photoAltText' in first);
  if (entityId === 'property-management.about.features') return 'value' in first;
  if (entityId === 'property-management.testimonials.items') return !('imageAltText' in first);
  if (entityId === 'property-management.testimonials.stats') return 'content' in first;
  if (entityId === 'property-management.reviews.platforms') return 'href' in first;
  if (entityId === 'property-management.footer.links') return !('group' in first);
  if (entityId === 'property-management.footer.social') return !('externalUrl' in first);
  if (entityId === 'property-management.hero.stats') return !('value' in first);
  return false;
}

export function parsePropertyManagementValue<Output>(
  document: PageContent,
  entityId: keyof typeof propertyManagementV2SeedData,
  parser: Parser<Output>,
): Output {
  const candidate = document[entityId];
  return parser.parse(
    candidate === undefined || isLegacyValue(entityId, candidate)
      ? propertyManagementV2SeedData[entityId]
      : candidate,
  );
}
