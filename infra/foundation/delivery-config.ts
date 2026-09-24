import { z } from 'zod';

const dnsName = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const contextInteger = (minimum: number, maximum: number) =>
  z
    .union([z.number(), z.string().regex(/^\d+$/)])
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum));

export const deliveryConfigSchema = z
  .object({
    applicationName: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
    repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    repositoryOwnerId: z.string().regex(/^\d+$/),
    repositoryId: z.string().regex(/^\d+$/),
    alertEmail: z.email(),
    parentZoneId: z.string().regex(/^Z[A-Z0-9]{5,31}$/),
    parentZoneName: z.string().regex(dnsName),
    previewZoneName: z.string().regex(dnsName),
    devDomain: z.string().regex(dnsName),
    productionDomain: z.string().regex(dnsName),
    productionSubdomainDomain: z.string().regex(dnsName).optional(),
    sesIdentityDomain: z.string().regex(dnsName),
    costAnomalyMonitorArn: z
      .string()
      .regex(/^arn:aws[a-zA-Z-]*:ce::\d{12}:anomalymonitor\/[A-Za-z0-9-]+$/),
    monthlyBudgetUsd: contextInteger(1, 10_000),
    releaseRetentionDays: contextInteger(1, 3_650),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [field, domain] of [
      ['previewZoneName', value.previewZoneName],
      ['devDomain', value.devDomain],
      ['productionDomain', value.productionDomain],
    ] as const) {
      if (!domain.endsWith(`.${value.parentZoneName}`)) {
        context.addIssue({
          code: 'custom',
          message: `${field} must be below parentZoneName`,
          path: [field],
        });
      }
    }
    if (value.sesIdentityDomain !== value.parentZoneName) {
      context.addIssue({
        code: 'custom',
        message: 'sesIdentityDomain must equal parentZoneName',
        path: ['sesIdentityDomain'],
      });
    }
    if (value.productionSubdomainDomain !== undefined) {
      if (!value.productionSubdomainDomain.endsWith(`.${value.parentZoneName}`)) {
        context.addIssue({
          code: 'custom',
          message: 'productionSubdomainDomain must be below parentZoneName',
          path: ['productionSubdomainDomain'],
        });
      }
      if (
        value.productionSubdomainDomain === value.devDomain ||
        value.productionSubdomainDomain === value.productionDomain
      ) {
        context.addIssue({
          code: 'custom',
          message: 'productionSubdomainDomain must be distinct from devDomain and productionDomain',
          path: ['productionSubdomainDomain'],
        });
      }
    }
  });

export type DeliveryConfig = z.infer<typeof deliveryConfigSchema>;

export const exampleDeliveryConfig: DeliveryConfig = {
  applicationName: 'trico-web',
  repository: 'josephdodge8141/trico-web',
  repositoryOwnerId: '34195877',
  repositoryId: '1362078393',
  alertEmail: 'operator@example.com',
  parentZoneId: 'Z0123456789EXAMPLE',
  parentZoneName: 'example.com',
  previewZoneName: 'preview.trico.example.com',
  devDomain: 'dev.trico.example.com',
  productionDomain: 'trico.example.com',
  sesIdentityDomain: 'example.com',
  costAnomalyMonitorArn:
    'arn:aws:ce::123456789012:anomalymonitor/00000000-0000-0000-0000-000000000000',
  monthlyBudgetUsd: 50,
  releaseRetentionDays: 35,
};

export function parseDeliveryConfig(value: unknown): DeliveryConfig {
  return deliveryConfigSchema.parse(value);
}
