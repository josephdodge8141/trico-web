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
    alertEmail: z.email(),
    parentZoneId: z.string().regex(/^Z[A-Z0-9]{5,31}$/),
    parentZoneName: z.string().regex(dnsName),
    previewZoneName: z.string().regex(dnsName),
    devDomain: z.string().regex(dnsName),
    productionDomain: z.string().regex(dnsName),
    sesIdentityDomain: z.string().regex(dnsName),
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
  });

export type DeliveryConfig = z.infer<typeof deliveryConfigSchema>;

export const exampleDeliveryConfig: DeliveryConfig = {
  applicationName: 'trico-web',
  repository: 'josephdodge8141/trico-web',
  alertEmail: 'operator@example.com',
  parentZoneId: 'Z0123456789EXAMPLE',
  parentZoneName: 'example.com',
  previewZoneName: 'preview.trico.example.com',
  devDomain: 'dev.trico.example.com',
  productionDomain: 'trico.example.com',
  sesIdentityDomain: 'example.com',
  monthlyBudgetUsd: 50,
  releaseRetentionDays: 35,
};

export function parseDeliveryConfig(value: unknown): DeliveryConfig {
  return deliveryConfigSchema.parse(value);
}
