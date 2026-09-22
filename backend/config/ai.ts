import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { editableValueSchema, type EditableValue } from '@app/schemas';

import type { Environment } from './environment.js';

export interface AiSynthesisRequest {
  readonly sourceUrl: string;
  readonly sourceText: string;
  readonly validationFields: readonly string[];
  readonly currentItem: EditableValue;
}

export interface AiConnection {
  synthesize(request: AiSynthesisRequest): Promise<EditableValue>;
}

export function createAiConnection(environment: Environment): AiConnection {
  if (environment.bedrockMode === 'fixture') {
    return { synthesize: async (request) => request.currentItem };
  }
  const model = environment.bedrockModelId;
  if (model === undefined) throw new Error('BEDROCK_MODEL_ID is required');
  const host = `bedrock-mantle.${environment.awsRegion}.api.aws`;
  const path = '/openai/v1/responses';
  const signer = new SignatureV4({
    credentials,
    region: environment.awsRegion,
    service: 'bedrock-mantle',
    sha256: Sha256,
  });
  return {
    synthesize: async (request) => {
      const body = JSON.stringify({
        model,
        input: `Return the complete replacement JSON object for this listing item. Preserve its id and use only evidence from the supplied source. URL: ${request.sourceUrl}\nValidation fields: ${request.validationFields.join(', ')}\nCurrent item: ${JSON.stringify(request.currentItem)}\nFetched text: ${request.sourceText.slice(0, 40_000)}`,
        tools: [{ type: 'web_search' }],
        text: {
          format: {
            type: 'json_schema',
            name: 'listing_replacement',
            strict: true,
            schema: {
              type: 'object',
              properties: { replacement: { type: 'object', additionalProperties: true } },
              required: ['replacement'],
              additionalProperties: false,
            },
          },
        },
      });
      const signed = await signer.sign(
        new HttpRequest({
          protocol: 'https:',
          hostname: host,
          method: 'POST',
          path,
          headers: { host, 'content-type': 'application/json', accept: 'application/json' },
          body,
        }),
      );
      const headers = Object.fromEntries(
        Object.entries(signed.headers).map(([name, value]) => [name, String(value)]),
      );
      const response = await fetch(`https://${host}${path}`, { method: 'POST', headers, body });
      if (!response.ok) throw new Error(`Bedrock web search failed (${response.status})`);
      const structured = JSON.parse(responseText(await response.json())) as unknown;
      if (typeof structured !== 'object' || structured === null)
        throw new Error('Bedrock structured output is invalid');
      return editableValueSchema.parse(Reflect.get(structured, 'replacement'));
    },
  };
}

const credentials = async (): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}> => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId === undefined || secretAccessKey === undefined)
    throw new Error('AWS credentials are unavailable');
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  return { accessKeyId, secretAccessKey, ...(sessionToken === undefined ? {} : { sessionToken }) };
};

const responseText = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) throw new Error('Bedrock response is invalid');
  const direct = Reflect.get(value, 'output_text');
  if (typeof direct === 'string') return direct;
  const output = Reflect.get(value, 'output');
  if (!Array.isArray(output)) throw new Error('Bedrock response has no structured output');
  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue;
    const content = Reflect.get(item, 'content');
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part !== 'object' || part === null) continue;
      const text = Reflect.get(part, 'text');
      if (typeof text === 'string') return text;
    }
  }
  throw new Error('Bedrock response has no structured output');
};
