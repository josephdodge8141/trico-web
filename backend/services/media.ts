import { randomUUID } from 'node:crypto';

import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MediaPresignRequest, MediaPresignResponse } from '@app/schemas';

const extensionFor = (contentType: MediaPresignRequest['contentType']): string =>
  ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  })[contentType];

export interface MediaService {
  presign(input: MediaPresignRequest): Promise<MediaPresignResponse>;
}

export function createMediaService(objects: S3Client, bucket: string): MediaService {
  return {
    presign: async (input) => {
      const key = `media/${randomUUID()}.${extensionFor(input.contentType)}`;
      const expiresIn = 300;
      const uploadUrl = await getSignedUrl(
        objects,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: input.contentType,
          ContentLength: input.contentLength,
        }),
        { expiresIn },
      );
      return {
        uploadUrl,
        reference: { bucket, key, publicUrl: `/media/${key.slice('media/'.length)}` },
        expiresAt: new Date(Date.now() + expiresIn * 1_000).toISOString(),
      };
    },
  };
}
