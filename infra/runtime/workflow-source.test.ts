import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowPath = new URL('../../.github/workflows/application-deploy.yml', import.meta.url);

test('factory.delivery.release-identity uses one derived release SHA and strict manifest', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.match(workflow, /id: release/);
  assert.match(workflow, /echo "sha=\$RELEASE_SHA" >> "\$GITHUB_OUTPUT"/);
  assert.doesNotMatch(workflow, /RELEASE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /release-manifest\.json/);
  assert.match(workflow, /release-cli\.ts/);
});

test('factory.delivery.promote-exact keeps production out of build and publication steps', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const buildStep = workflow.indexOf('name: Build and publish reviewed dev artifacts');
  const resolveStep = workflow.indexOf('name: Resolve and verify immutable tested artifacts');
  assert.ok(buildStep >= 0);
  assert.ok(resolveStep > buildStep);
  const buildBlock = workflow.slice(buildStep, resolveStep);
  assert.match(buildBlock, /if:.*== 'dev'/);
  assert.match(workflow, /if:.*workflow_dispatch/);
  assert.match(workflow, /APPLICATION_DEPLOY_ENABLED/);
});

test('factory.delivery production backup gate runs before deployment and fails closed', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const backupStep = workflow.indexOf('name: Snapshot existing production state');
  const deployStep = workflow.indexOf('name: Deploy exact backend digest');
  assert.ok(backupStep >= 0);
  assert.ok(deployStep > backupStep);
  const backupBlock = workflow.slice(backupStep, deployStep);
  assert.match(backupBlock, /production-backup-cli\.ts/);
  assert.doesNotMatch(backupBlock, /\|\| true/);
  assert.doesNotMatch(backupBlock, /if test -n "\$table"/);
});

test('factory.delivery installs the browser runtime before the CI gate', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const installStep = workflow.indexOf('npx playwright install --with-deps chromium');
  const checkStep = workflow.indexOf('npm run check:ci');
  assert.ok(installStep >= 0);
  assert.ok(checkStep > installStep);
});
