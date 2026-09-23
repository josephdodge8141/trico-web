import { DescribeImageScanFindingsCommand, ECRClient } from '@aws-sdk/client-ecr';

import {
  requireCleanEcrImageScans,
  type EcrImageScanReader,
  type EcrImageScanTarget,
} from './ecr-image-scan.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.length % 2 !== 0) {
    throw new Error('usage: ecr-image-scan-cli.ts <repository> <sha256-digest> [...targets]');
  }
  const targets: EcrImageScanTarget[] = [];
  for (let index = 0; index < args.length; index += 2) {
    const repositoryName = args[index];
    const imageDigest = args[index + 1];
    if (repositoryName === undefined || imageDigest === undefined) {
      throw new Error('ECR image scan targets require repository and digest pairs.');
    }
    targets.push({ repositoryName, imageDigest });
  }

  const client = new ECRClient({});
  const reader = createEcrImageScanReader(client);
  try {
    await requireCleanEcrImageScans(reader, targets);
  } finally {
    client.destroy();
  }
  for (const target of targets) {
    process.stdout.write(
      `Clean ECR scan confirmed for ${target.repositoryName}@${target.imageDigest}\n`,
    );
  }
}

function createEcrImageScanReader(client: ECRClient): EcrImageScanReader {
  return {
    async describeImageScanFindings(repositoryName, imageDigest, abortSignal) {
      try {
        const response = await client.send(
          new DescribeImageScanFindingsCommand({
            imageId: { imageDigest },
            repositoryName,
          }),
          { abortSignal },
        );
        return {
          imageDigest: response.imageId?.imageDigest,
          imageScanStatus: response.imageScanStatus?.status,
          imageScanCompletedAt: response.imageScanFindings?.imageScanCompletedAt,
          findingSeverityCounts: response.imageScanFindings?.findingSeverityCounts,
        };
      } catch (error: unknown) {
        if (isScanNotFound(error)) {
          return {
            imageDigest,
            imageScanStatus: 'SCAN_NOT_FOUND',
            imageScanCompletedAt: undefined,
            findingSeverityCounts: undefined,
          };
        }
        throw error;
      }
    },
  };
}

function isScanNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ScanNotFoundException'
  );
}

await main();
