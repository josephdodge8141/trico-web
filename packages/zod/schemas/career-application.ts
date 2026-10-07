import { z } from 'zod';

import { emailSchema } from './auth.js';

export const careerDivisionSchema = z.enum([
  'Real Estate',
  'Property Management',
  'Construction',
  'Storage Management',
  'Development',
  'Corporate',
  'Other / General',
]);

export const careerApplicationUploadRequestSchema = z
  .strictObject({
    resumeName: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[^/\\\r\n]+\.(?:pdf|doc|docx)$/i),
    resumeContentType: z.enum([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),
    contentLength: z
      .number()
      .int()
      .min(1)
      .max(10 * 1_024 * 1_024),
  })
  .superRefine((input, context) => {
    const extension = input.resumeName.split('.').pop()?.toLowerCase();
    const expected = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    } as const;
    if (
      extension === undefined ||
      !(extension in expected) ||
      expected[extension as keyof typeof expected] !== input.resumeContentType
    ) {
      context.addIssue({
        code: 'custom',
        path: ['resumeContentType'],
        message: 'Resume type does not match its filename',
      });
    }
  });

export const careerApplicationUploadResponseSchema = z.strictObject({
  uploadId: z.uuid(),
  uploadUrl: z.url(),
  expiresAt: z.iso.datetime(),
});

export const careerApplicationRequestSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100),
    email: emailSchema,
    phone: z.string().trim().max(20).optional(),
    division: careerDivisionSchema,
    position: z.string().trim().max(120).optional(),
    message: z.string().trim().max(1_000).optional(),
    uploadId: z.uuid(),
    website: z.string().trim().max(200).optional(),
  })
  .superRefine((input, context) => {
    if (input.website)
      context.addIssue({ code: 'custom', path: ['website'], message: 'Invalid application' });
  });

export const careerApplicationResponseSchema = z.strictObject({ delivered: z.literal(true) });

export type CareerDivision = z.infer<typeof careerDivisionSchema>;
export type CareerApplicationRequest = z.infer<typeof careerApplicationRequestSchema>;
export type CareerApplicationResponse = z.infer<typeof careerApplicationResponseSchema>;
export type CareerApplicationUploadRequest = z.infer<typeof careerApplicationUploadRequestSchema>;
export type CareerApplicationUploadResponse = z.infer<typeof careerApplicationUploadResponseSchema>;
