import { realEstateV2SeedData, type PageContent } from '@app/schemas';

interface Parser<Output> {
  parse(value: unknown): Output;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function legacy(id: keyof typeof realEstateV2SeedData, value: unknown): boolean {
  if (record(value) && 'content' in value && 'media' in value && 'externalUrls' in value)
    return true;
  if (!Array.isArray(value) || value.length === 0 || !record(value[0])) return false;
  if (id === 'real-estate.hero.stats') return !('value' in value[0]);
  if (id === 'real-estate.listings.items')
    return !('address' in value[0]) || !('gallery' in value[0]) || !('externalUrl' in value[0]);
  if (id === 'real-estate.process.steps') return 'icon' in value[0];
  if (id === 'real-estate.about.features') return !('label' in value[0]);
  if (id.startsWith('real-estate.team.')) return !('imageAltText' in value[0]);
  if (id === 'real-estate.testimonials.items') return !('quote' in value[0]);
  if (id === 'real-estate.reviews.platforms') return 'href' in value[0];
  if (id === 'real-estate.footer.links') return 'href' in value[0];
  return false;
}
export function parseRealEstateValue<Output>(
  document: PageContent,
  id: keyof typeof realEstateV2SeedData,
  parser: Parser<Output>,
): Output {
  const candidate = document[id];
  return parser.parse(
    candidate === undefined ||
      legacy(id, candidate) ||
      (id === 'real-estate.listings.actions' &&
        record(candidate) &&
        (!('directoryLinks' in candidate) || !('contactActionLabel' in candidate)))
      ? realEstateV2SeedData[id]
      : candidate,
  );
}

export function mergeFilteredRealEstateCollection<T>(
  original: readonly T[],
  replacements: readonly T[],
  included: (item: T) => boolean,
): readonly T[] {
  let replacementIndex = 0;
  const merged: T[] = [];
  for (const item of original) {
    if (!included(item)) {
      merged.push(item);
      continue;
    }
    const replacement = replacements[replacementIndex++];
    if (replacement !== undefined) merged.push(replacement);
  }
  merged.push(...replacements.slice(replacementIndex));
  return merged;
}
