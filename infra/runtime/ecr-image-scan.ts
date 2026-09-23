export interface EcrImageScanTarget {
  readonly repositoryName: string;
  readonly imageDigest: string;
}

export interface EcrImageScanResult {
  readonly imageDigest: string | undefined;
  readonly imageScanStatus: string | undefined;
  readonly imageScanCompletedAt: Date | undefined;
  readonly findingSeverityCounts: Readonly<Record<string, number>> | undefined;
}

export interface EcrImageScanReader {
  describeImageScanFindings(
    repositoryName: string,
    imageDigest: string,
    abortSignal: AbortSignal,
  ): Promise<EcrImageScanResult>;
}

export interface EcrImageScanWaitOptions {
  readonly timeoutMs?: number;
  readonly pollIntervalMs?: number;
  readonly now?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const MAX_QUERY_DURATION_MS = 30_000;

export async function requireCleanEcrImageScan(
  reader: EcrImageScanReader,
  target: EcrImageScanTarget,
  options: EcrImageScanWaitOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? pause;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('ECR image scan timeout must be a positive integer.');
  }
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new Error('ECR image scan poll interval must be a positive integer.');
  }
  if (target.repositoryName.length === 0 || !/^sha256:[0-9a-f]{64}$/.test(target.imageDigest)) {
    throw new Error('ECR image scan requires a repository and exact SHA-256 image digest.');
  }

  const deadline = now() + timeoutMs;
  while (true) {
    const remainingBeforeRequest = deadline - now();
    if (remainingBeforeRequest <= 0) {
      throw scanTimeout(target, timeoutMs);
    }
    const result = await reader.describeImageScanFindings(
      target.repositoryName,
      target.imageDigest,
      AbortSignal.timeout(Math.min(MAX_QUERY_DURATION_MS, remainingBeforeRequest)),
    );
    if (now() > deadline) throw scanTimeout(target, timeoutMs);
    if (result.imageScanStatus === 'COMPLETE') {
      assertCompleteScanMatchesTarget(result, target);
      return;
    }
    if (
      result.imageScanStatus !== 'IN_PROGRESS' &&
      result.imageScanStatus !== 'PENDING' &&
      result.imageScanStatus !== 'SCAN_NOT_FOUND'
    ) {
      throw new Error(
        `ECR scan for ${target.repositoryName}@${target.imageDigest} did not complete successfully: ${result.imageScanStatus ?? 'status unavailable'}.`,
      );
    }

    const remainingMs = deadline - now();
    if (remainingMs <= 0) {
      throw scanTimeout(target, timeoutMs);
    }
    await sleep(Math.min(pollIntervalMs, remainingMs));
  }
}

export async function requireCleanEcrImageScans(
  reader: EcrImageScanReader,
  targets: readonly EcrImageScanTarget[],
  options: EcrImageScanWaitOptions = {},
): Promise<void> {
  for (const target of targets) {
    await requireCleanEcrImageScan(reader, target, options);
  }
}

function scanTimeout(target: EcrImageScanTarget, timeoutMs: number): Error {
  return new Error(
    `ECR scan for ${target.repositoryName}@${target.imageDigest} did not complete within ${timeoutMs} milliseconds.`,
  );
}

function assertCompleteScanMatchesTarget(
  result: EcrImageScanResult,
  target: EcrImageScanTarget,
): void {
  if (result.imageDigest !== target.imageDigest) {
    throw new Error(
      `ECR scan response digest did not match ${target.repositoryName}@${target.imageDigest}.`,
    );
  }
  if (
    result.imageScanCompletedAt === undefined ||
    !Number.isFinite(result.imageScanCompletedAt.getTime())
  ) {
    throw new Error(
      `ECR scan findings are unavailable for ${target.repositoryName}@${target.imageDigest}.`,
    );
  }
  const counts = result.findingSeverityCounts;
  if (counts === undefined) {
    throw new Error(
      `ECR scan severity counts are unavailable for ${target.repositoryName}@${target.imageDigest}.`,
    );
  }
  for (const [severity, count] of Object.entries(counts)) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(
        `ECR scan returned an invalid ${severity} finding count for ${target.repositoryName}@${target.imageDigest}.`,
      );
    }
  }

  const high = counts.HIGH ?? 0;
  const critical = counts.CRITICAL ?? 0;
  if (high > 0 || critical > 0) {
    throw new Error(
      `ECR image ${target.repositoryName}@${target.imageDigest} is blocked by scan findings: HIGH=${high}, CRITICAL=${critical}.`,
    );
  }
}

async function pause(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
