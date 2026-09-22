import { z } from 'zod';

const applicationName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const imageUri =
  /^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$/;
const dnsName = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const applicationConfigSchema = z
  .object({
    applicationName: z.string().min(1).max(40).regex(applicationName),
    stage: z.enum(['dev', 'prod']),
    backendImageUri: z.string().regex(imageUri),
    publicOrigin: z.url().startsWith('https://'),
    customDomain: z.string().regex(dnsName),
    hostedZoneId: z.string().min(1).max(64),
    hostedZoneName: z.string().regex(dnsName),
    certificateArn: z.string().startsWith('arn:').min(20),
    sesIdentityDomain: z.string().regex(dnsName),
    bedrockModelId: z.string().min(1).max(256),
    alertTopicArn: z.string().startsWith('arn:').min(20),
    externalSyncEnabled: z.boolean(),
  })
  .strict();

export type ApplicationConfig = z.infer<typeof applicationConfigSchema>;

export const exampleApplicationConfig = (stage: 'dev' | 'prod'): ApplicationConfig => ({
  applicationName: 'trico-web',
  stage,
  backendImageUri:
    '111111111111.dkr.ecr.us-east-1.amazonaws.com/trico-web-backend@sha256:' + '0'.repeat(64),
  publicOrigin: `https://${stage}.example.com`,
  customDomain: `${stage}.example.com`,
  hostedZoneId: 'Z1111111111111',
  hostedZoneName: 'example.com',
  certificateArn:
    'arn:aws:acm:us-east-1:111111111111:certificate/00000000-0000-0000-0000-000000000000',
  sesIdentityDomain: 'example.com',
  bedrockModelId: 'example.responses-compatible-model',
  alertTopicArn: 'arn:aws:sns:us-east-2:111111111111:trico-web-operations',
  externalSyncEnabled: false,
});

export function parseApplicationConfig(value: unknown): ApplicationConfig {
  return applicationConfigSchema.parse(value);
}
