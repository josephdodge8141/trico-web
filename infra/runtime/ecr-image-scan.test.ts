import assert from 'node:assert/strict';
import test from 'node:test';

import { requireCleanEcrImageScan, type EcrImageScanReader } from './ecr-image-scan.js';

const target = {
  repositoryName: 'trico-web-release-backend',
  imageDigest: `sha256:${'a'.repeat(64)}`,
};

function completed(
  findingSeverityCounts: Readonly<Record<string, number>> = {},
  overrides: Partial<{
    imageDigest: string | undefined;
    imageScanStatus: string | undefined;
    imageScanCompletedAt: Date | undefined;
    findingSeverityCounts: Readonly<Record<string, number>> | undefined;
  }> = {},
) {
  return {
    imageDigest: target.imageDigest,
    imageScanStatus: 'COMPLETE',
    imageScanCompletedAt: new Date('2026-09-23T12:00:00.000Z'),
    findingSeverityCounts,
    ...overrides,
  };
}

function reader(
  responses: readonly Awaited<ReturnType<EcrImageScanReader['describeImageScanFindings']>>[],
  calls: string[] = [],
): EcrImageScanReader {
  let index = 0;
  return {
    async describeImageScanFindings(repositoryName, imageDigest) {
      calls.push(`${repositoryName}@${imageDigest}`);
      const response = responses[index];
      index += 1;
      if (response === undefined) throw new Error('unexpected extra scan request');
      return response;
    },
  };
}

test('factory.delivery.image-scan-gate allows a completed low and medium scan for the exact digest', async () => {
  const calls: string[] = [];
  await requireCleanEcrImageScan(reader([completed({ LOW: 4, MEDIUM: 3 })], calls), target, {
    timeoutMs: 100,
    pollIntervalMs: 1,
  });
  assert.deepEqual(calls, [`${target.repositoryName}@${target.imageDigest}`]);
});

test('factory.delivery.image-scan-gate polls pending results until the exact digest is complete', async () => {
  const calls: string[] = [];
  const imageReader: EcrImageScanReader = {
    ...reader(
      [
        {
          imageDigest: target.imageDigest,
          imageScanStatus: 'IN_PROGRESS',
          imageScanCompletedAt: undefined,
          findingSeverityCounts: undefined,
        },
        completed({ LOW: 1 }),
      ],
      calls,
    ),
  };
  await requireCleanEcrImageScan(imageReader, target, {
    timeoutMs: 100,
    pollIntervalMs: 1,
    sleep: async () => undefined,
  });
  assert.equal(calls.length, 2);
});

test('factory.delivery.image-scan-gate retries a scan-not-found response while push scanning starts', async () => {
  const calls: string[] = [];
  await requireCleanEcrImageScan(
    reader(
      [
        {
          imageDigest: target.imageDigest,
          imageScanStatus: 'SCAN_NOT_FOUND',
          imageScanCompletedAt: undefined,
          findingSeverityCounts: undefined,
        },
        completed(),
      ],
      calls,
    ),
    target,
    { timeoutMs: 100, pollIntervalMs: 1, sleep: async () => undefined },
  );
  assert.equal(calls.length, 2);
});

test('factory.delivery.image-scan-gate rejects completed HIGH or CRITICAL findings', async () => {
  await assert.rejects(
    requireCleanEcrImageScan(reader([completed({ HIGH: 1 })]), target, {
      timeoutMs: 100,
      pollIntervalMs: 1,
    }),
    /HIGH=1/,
  );
  await assert.rejects(
    requireCleanEcrImageScan(reader([completed({ CRITICAL: 1 })]), target, {
      timeoutMs: 100,
      pollIntervalMs: 1,
    }),
    /CRITICAL=1/,
  );
});

test('factory.delivery.image-scan-gate fails closed for unavailable or unsupported scan responses', async () => {
  const failedResults = [
    completed({}, { imageScanStatus: 'FAILED' }),
    completed({}, { imageScanStatus: 'UNSUPPORTED_IMAGE' }),
    completed({}, { imageScanStatus: 'FINDINGS_UNAVAILABLE' }),
    completed({}, { imageScanStatus: 'ACTIVE' }),
    completed({}, { imageScanStatus: undefined }),
    completed({}, { findingSeverityCounts: undefined }),
    completed({}, { imageScanCompletedAt: undefined }),
    completed({}, { imageDigest: undefined }),
    completed({}, { imageDigest: `sha256:${'b'.repeat(64)}` }),
    completed({ HIGH: -1 }),
  ];
  for (const response of failedResults) {
    await assert.rejects(
      requireCleanEcrImageScan(reader([response]), target, {
        timeoutMs: 100,
        pollIntervalMs: 1,
      }),
    );
  }
});

test('factory.delivery.image-scan-gate times out pending scans and propagates query errors', async () => {
  let now = 0;
  await assert.rejects(
    requireCleanEcrImageScan(
      reader([
        {
          imageDigest: target.imageDigest,
          imageScanStatus: 'PENDING',
          imageScanCompletedAt: undefined,
          findingSeverityCounts: undefined,
        },
        {
          imageDigest: target.imageDigest,
          imageScanStatus: 'PENDING',
          imageScanCompletedAt: undefined,
          findingSeverityCounts: undefined,
        },
      ]),
      target,
      {
        timeoutMs: 10,
        pollIntervalMs: 5,
        now: () => now,
        sleep: async (milliseconds) => {
          now += milliseconds;
        },
      },
    ),
    /did not complete within 10 milliseconds/,
  );
  await assert.rejects(
    requireCleanEcrImageScan(
      {
        async describeImageScanFindings() {
          throw new Error('access denied');
        },
      },
      target,
      { timeoutMs: 100, pollIntervalMs: 1 },
    ),
    /access denied/,
  );
});
