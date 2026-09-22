import { developmentV2SeedData, type PageContent } from '@app/schemas';

interface Parser<Output> {
  parse(value: unknown): Output;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isLegacyDevelopmentValue(value: unknown): boolean {
  if (isRecord(value) && 'content' in value && 'media' in value && 'externalUrls' in value)
    return true;
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  return isRecord(first) && 'content' in first;
}

export function parseDevelopmentValue<Output>(
  document: PageContent,
  entityId: keyof typeof developmentV2SeedData,
  parser: Parser<Output>,
): Output {
  const candidate = document[entityId];
  return parser.parse(
    candidate === undefined || isLegacyDevelopmentValue(candidate)
      ? developmentV2SeedData[entityId]
      : candidate,
  );
}
