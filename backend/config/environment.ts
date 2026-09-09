export type AppEnvironment = 'local' | 'preview' | 'dev' | 'prod' | 'test';
export type MailTransport = 'smtp' | 'ses';
export type BedrockMode = 'fixture' | 'web-search';

export interface Environment {
  readonly appEnvironment: AppEnvironment;
  readonly host: string;
  readonly port: number;
  readonly shutdownTimeoutMs: number;
  readonly publicOrigin: string;
  readonly awsRegion: string;
  readonly dynamoTable: string;
  readonly dynamoEndpoint?: string;
  readonly s3Bucket: string;
  readonly s3Endpoint?: string;
  readonly s3ForcePathStyle: boolean;
  readonly mailTransport: MailTransport;
  readonly smtpHost?: string;
  readonly smtpPort?: number;
  readonly emailFrom: string;
  readonly bedrockMode: BedrockMode;
  readonly bedrockModelId?: string;
  readonly sessionCookieName: string;
  readonly cookieSecure: boolean;
}

const choice = <T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[],
): T => {
  const normalized = value?.trim();
  if (normalized !== undefined && allowed.includes(normalized as T)) return normalized as T;
  const fallback = allowed[0];
  if ((normalized === undefined || normalized === '') && fallback !== undefined) return fallback;
  throw new Error(`Invalid ${name}`);
};

const positiveInteger = (name: string, value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`Invalid ${name}`);
  return parsed;
};

const absoluteUrl = (name: string, value: string): string => {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Invalid ${name}`);
  return value.replace(/\/$/, '');
};

const optionalUrl = (name: string, value: string | undefined): string | undefined =>
  value === undefined || value.trim() === '' ? undefined : absoluteUrl(name, value.trim());

const required = (name: string, value: string | undefined, fallback?: string): string => {
  const candidate = value?.trim() || fallback;
  if (candidate === undefined || candidate === '') throw new Error(`Missing ${name}`);
  return candidate;
};

const bool = (name: string, value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid ${name}`);
};

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const appEnvironment = choice('APP_ENV', source.APP_ENV, [
    'local',
    'preview',
    'dev',
    'prod',
    'test',
  ] as const);
  const cloud = appEnvironment === 'dev' || appEnvironment === 'prod';
  const mailTransport = choice(
    'MAIL_TRANSPORT',
    source.MAIL_TRANSPORT,
    cloud ? (['ses', 'smtp'] as const) : (['smtp', 'ses'] as const),
  );
  const bedrockMode = choice(
    'BEDROCK_MODE',
    source.BEDROCK_MODE,
    cloud ? (['web-search', 'fixture'] as const) : (['fixture', 'web-search'] as const),
  );
  const port = positiveInteger('PORT', source.PORT, 3000);
  if (port > 65_535) throw new Error('Invalid PORT');
  const dynamoEndpoint = optionalUrl('DYNAMODB_ENDPOINT', source.DYNAMODB_ENDPOINT);
  const s3Endpoint = optionalUrl('S3_ENDPOINT', source.S3_ENDPOINT);
  const environment: Environment = {
    appEnvironment,
    host: source.HOST?.trim() || '0.0.0.0',
    port,
    shutdownTimeoutMs: positiveInteger('SHUTDOWN_TIMEOUT_MS', source.SHUTDOWN_TIMEOUT_MS, 5_000),
    publicOrigin: absoluteUrl(
      'PUBLIC_ORIGIN',
      source.PUBLIC_ORIGIN?.trim() || 'http://app.localhost:8088',
    ),
    awsRegion: source.AWS_REGION?.trim() || 'us-west-2',
    dynamoTable: required('DYNAMODB_TABLE', source.DYNAMODB_TABLE, 'trico-web-local'),
    s3Bucket: required('S3_BUCKET', source.S3_BUCKET, 'trico-web-local'),
    s3ForcePathStyle: bool(
      'S3_FORCE_PATH_STYLE',
      source.S3_FORCE_PATH_STYLE,
      appEnvironment === 'local',
    ),
    mailTransport,
    emailFrom: source.EMAIL_FROM?.trim() || 'TriCo Website <website@tricoinc.com>',
    bedrockMode,
    sessionCookieName: source.SESSION_COOKIE_NAME?.trim() || 'trico_session',
    cookieSecure: bool(
      'COOKIE_SECURE',
      source.COOKIE_SECURE,
      cloud || appEnvironment === 'preview',
    ),
    ...(dynamoEndpoint === undefined ? {} : { dynamoEndpoint }),
    ...(s3Endpoint === undefined ? {} : { s3Endpoint }),
    ...(mailTransport === 'smtp' ? { smtpHost: source.SMTP_HOST?.trim() || 'mailpit' } : {}),
    ...(source.SMTP_PORT?.trim()
      ? { smtpPort: positiveInteger('SMTP_PORT', source.SMTP_PORT, 1025) }
      : {}),
    ...(source.BEDROCK_MODEL_ID?.trim() ? { bedrockModelId: source.BEDROCK_MODEL_ID.trim() } : {}),
  };
  if (mailTransport === 'smtp' && environment.smtpHost === undefined)
    throw new Error('Missing SMTP_HOST');
  if (bedrockMode === 'web-search' && environment.bedrockModelId === undefined) {
    throw new Error('Missing BEDROCK_MODEL_ID');
  }
  return environment;
}
