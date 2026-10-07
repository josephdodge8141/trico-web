import { z } from 'zod';

import { emailSchema } from './auth.js';

export const inquiryKindSchema = z.enum([
  'property-new-client',
  'property-analysis',
  'real-estate-new-client',
  'real-estate-contact',
  'construction-bid',
  'construction-contact',
  'storage-consultation',
  'development-contact',
]);

const optionalShort = z.string().trim().max(200).optional();

export const inquiryRequestSchema = z
  .strictObject({
    kind: inquiryKindSchema,
    name: z.string().trim().min(1).max(100),
    email: emailSchema,
    phone: z.string().trim().max(30).optional(),
    interest: optionalShort,
    propertyAddress: optionalShort,
    propertyType: optionalShort,
    location: optionalShort,
    facilityCount: z.string().trim().max(50).optional(),
    company: optionalShort,
    message: z.string().trim().max(2_000).optional(),
    website: z.string().trim().max(200).optional(),
  })
  .superRefine((input, context) => {
    const requireValue = (key: 'phone' | 'interest' | 'location' | 'propertyType' | 'message') => {
      if (input[key]?.trim()) return;
      context.addIssue({ code: 'custom', path: [key], message: `${key} is required` });
    };
    if (input.kind === 'property-new-client' || input.kind === 'real-estate-new-client') {
      requireValue('interest');
    }
    if (input.kind !== 'property-new-client' && input.kind !== 'real-estate-new-client') {
      requireValue('phone');
    }
    if (input.kind === 'construction-bid') {
      requireValue('location');
      requireValue('propertyType');
      requireValue('message');
    }
    if (input.website?.trim()) {
      context.addIssue({ code: 'custom', path: ['website'], message: 'Invalid inquiry' });
    }
  });

export const inquiryResponseSchema = z.strictObject({ delivered: z.literal(true) });

export type InquiryRequest = z.infer<typeof inquiryRequestSchema>;
export type InquiryKind = z.infer<typeof inquiryKindSchema>;
export type InquiryResponse = z.infer<typeof inquiryResponseSchema>;
