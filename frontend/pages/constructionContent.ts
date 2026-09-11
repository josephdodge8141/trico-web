import { constructionV2SeedData, type PageContent } from '@app/schemas';

interface Parser<Output> {
  parse(value: unknown): Output;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isLegacyConstructionValue(value: unknown): boolean {
  if (isRecord(value) && 'content' in value && 'media' in value && 'externalUrls' in value)
    return true;
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  return !isRecord(first) || !('id' in first);
}

export function parseConstructionValue<Output>(
  document: PageContent,
  entityId: keyof typeof constructionV2SeedData,
  parser: Parser<Output>,
): Output {
  const candidate = document[entityId];
  return parser.parse(
    candidate === undefined || isLegacyConstructionValue(candidate)
      ? constructionV2SeedData[entityId]
      : candidate,
  );
}
