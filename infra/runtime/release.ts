import { z } from 'zod';

const sha = z.string().regex(/^[0-9a-f]{40}$/);
const digestImage = z
  .string()
  .regex(
    /^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$/,
  );

export const releaseManifestSchema = z
  .object({
    version: z.literal(1),
    releaseSha: sha,
    backendImageUri: digestImage,
    frontend: z
      .object({
        key: z.string().min(1).max(1_024),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .strict(),
    publishedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedKey = `releases/${value.releaseSha}/frontend-dist.tar.gz`;
    if (value.frontend.key !== expectedKey) {
      context.addIssue({
        code: 'custom',
        message: `frontend.key must equal ${expectedKey}`,
        path: ['frontend', 'key'],
      });
    }
  });

export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;

export function parseReleaseManifest(value: unknown): ReleaseManifest {
  return releaseManifestSchema.parse(value);
}
