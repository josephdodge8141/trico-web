import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);
const PRODUCTION_STACK_NAME = 'TricoWeb-prod';
const BACKUP_POLL_INTERVAL_MS = 10_000;
const BACKUP_TIMEOUT_MS = 30 * 60_000;

export type ProductionStackLookup = { kind: 'not-found' } | { kind: 'exists'; tableName: string };

export interface ProductionBackupClient {
  describeProductionStack(): Promise<ProductionStackLookup>;
  createBackup(tableName: string, backupName: string): Promise<string>;
  waitForAvailable(backupArn: string): Promise<void>;
}

export type AwsCommand = (args: readonly string[]) => Promise<string>;

export async function ensureProductionBackup(
  client: ProductionBackupClient,
  releaseSha: string,
): Promise<'first-deploy' | 'backup-ready'> {
  if (!/^[a-f0-9]{40}$/i.test(releaseSha)) {
    throw new Error('Production backup requires a full 40-character release SHA.');
  }

  const stack = await client.describeProductionStack();
  if (stack.kind === 'not-found') {
    return 'first-deploy';
  }

  const backupName = `pre-${releaseSha}-${Date.now()}`;
  const backupArn = await client.createBackup(stack.tableName, backupName);
  await client.waitForAvailable(backupArn);
  return 'backup-ready';
}

export function createAwsProductionBackupClient(
  command: AwsCommand = executeAwsCommand,
  pause: (milliseconds: number) => Promise<void> = delay,
): ProductionBackupClient {
  return {
    async describeProductionStack() {
      let response: string;
      try {
        response = await command([
          'cloudformation',
          'describe-stacks',
          '--stack-name',
          PRODUCTION_STACK_NAME,
          '--output',
          'json',
        ]);
      } catch (error: unknown) {
        if (isProductionStackNotFound(error)) {
          return { kind: 'not-found' };
        }
        throw error;
      }

      const parsed = parseJson(response, 'CloudFormation describe-stacks');
      const tableName = readProductionTableName(parsed);
      return { kind: 'exists', tableName };
    },
    async createBackup(tableName, backupName) {
      const response = await command([
        'dynamodb',
        'create-backup',
        '--table-name',
        tableName,
        '--backup-name',
        backupName,
        '--output',
        'json',
      ]);
      const parsed = parseJson(response, 'DynamoDB create-backup');
      const backupArn = readStringAt(parsed, ['BackupDetails', 'BackupArn']);
      if (backupArn === undefined) {
        throw new Error('DynamoDB create-backup did not return a backup ARN.');
      }
      return backupArn;
    },
    async waitForAvailable(backupArn) {
      const deadline = Date.now() + BACKUP_TIMEOUT_MS;
      while (true) {
        const response = await command([
          'dynamodb',
          'describe-backup',
          '--backup-arn',
          backupArn,
          '--output',
          'json',
        ]);
        const parsed = parseJson(response, 'DynamoDB describe-backup');
        const status = readStringAt(parsed, ['BackupDescription', 'BackupDetails', 'BackupStatus']);
        if (status === 'AVAILABLE') {
          return;
        }
        if (status !== 'CREATING') {
          throw new Error(`Production backup readiness check returned ${status ?? 'no status'}.`);
        }
        if (Date.now() >= deadline) {
          throw new Error('Production backup did not become AVAILABLE within 30 minutes.');
        }
        await pause(BACKUP_POLL_INTERVAL_MS);
      }
    },
  };
}

export function isProductionStackNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('stderr' in error)) {
    return false;
  }
  const stderr = error.stderr;
  return (
    typeof stderr === 'string' &&
    /An error occurred \(ValidationError\) when calling the DescribeStacks operation: Stack with id TricoWeb-prod does not exist\.?$/.test(
      stderr.trim(),
    )
  );
}

async function executeAwsCommand(args: readonly string[]): Promise<string> {
  const { stdout } = await executeFile('aws', [...args], { maxBuffer: 1024 * 1024 });
  return stdout;
}

function parseJson(value: string, operation: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${operation} returned invalid JSON.`);
  }
}

function readProductionTableName(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.Stacks) || value.Stacks.length !== 1) {
    throw new Error('CloudFormation did not return exactly one production stack.');
  }
  const stack = value.Stacks[0];
  if (!isRecord(stack) || !Array.isArray(stack.Outputs)) {
    throw new Error('The production stack has no outputs.');
  }
  const output = stack.Outputs.find(
    (candidate: unknown) => isRecord(candidate) && candidate.OutputKey === 'TableName',
  );
  if (
    !isRecord(output) ||
    typeof output.OutputValue !== 'string' ||
    output.OutputValue.length === 0
  ) {
    throw new Error('The production stack does not expose a valid TableName output.');
  }
  return output.OutputValue;
}

function readStringAt(value: unknown, path: readonly string[]): string | undefined {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return typeof current === 'string' && current.length > 0 ? current : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
