import { createAwsProductionBackupClient, ensureProductionBackup } from './production-backup.js';

const releaseSha = process.argv[2];

if (releaseSha === undefined) {
  console.error('Usage: production-backup-cli.ts <release-sha>');
  process.exitCode = 2;
} else {
  try {
    const result = await ensureProductionBackup(createAwsProductionBackupClient(), releaseSha);
    console.log(
      result === 'first-deploy'
        ? 'CloudFormation confirmed no production stack; proceeding without a snapshot.'
        : 'Production backup is AVAILABLE; deployment may proceed.',
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Production backup gate failed: ${message}`);
    process.exitCode = 1;
  }
}
