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

test('factory.delivery.redeploy-existing requires an explicit dev release SHA', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const releaseStart = workflow.indexOf('id: release');
  const checkoutStart = workflow.indexOf('uses: actions/checkout@', releaseStart);
  assert.ok(releaseStart >= 0);
  assert.ok(checkoutStart > releaseStart);
  const releaseBlock = workflow.slice(releaseStart, checkoutStart);

  assert.match(workflow, /deployment_path:/);
  assert.match(workflow, /options: \[standard, redeploy-existing\]/);
  assert.match(releaseBlock, /INPUT_DEPLOYMENT_PATH/);
  assert.match(releaseBlock, /redeploy-existing/);
  assert.match(releaseBlock, /test "\$stage" = dev/);
  assert.match(releaseBlock, /test -n "\$INPUT_RELEASE_SHA"/);
  assert.match(releaseBlock, /echo "path=\$path" >> "\$GITHUB_OUTPUT"/);
});

test('factory.delivery.redeploy-existing validates and reactivates without building or seeding', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const loginStart = workflow.indexOf('uses: aws-actions/amazon-ecr-login@');
  const buildStart = workflow.indexOf('name: Build and publish reviewed dev artifacts');
  const resolveStart = workflow.indexOf('name: Resolve and verify immutable tested artifacts');
  const seedStart = workflow.indexOf('name: Bootstrap application data');
  const activateStart = workflow.indexOf('name: Activate frontend release');
  const deployStart = workflow.indexOf('name: Deploy exact backend digest');
  const verifyStart = workflow.indexOf('name: Verify six pages and protected session');
  assert.ok(loginStart >= 0);
  assert.ok(buildStart > loginStart);
  assert.ok(resolveStart > buildStart);
  assert.ok(deployStart > resolveStart);
  assert.ok(seedStart > deployStart);
  assert.ok(activateStart > seedStart);
  assert.ok(verifyStart > activateStart);

  const loginBlock = workflow.slice(loginStart, buildStart);
  const buildBlock = workflow.slice(buildStart, resolveStart);
  const seedBlock = workflow.slice(seedStart, activateStart);
  const resolveBlock = workflow.slice(resolveStart, deployStart);
  const verifyBlock = workflow.slice(verifyStart);
  assert.match(loginBlock, /path == 'standard'/);
  assert.match(buildBlock, /path == 'standard'/);
  assert.match(seedBlock, /path == 'standard'/);
  assert.match(resolveBlock, /sha256sum --check/);
  assert.match(
    resolveBlock,
    /manifest_repo.*BACKEND_REPOSITORY_URI|BACKEND_REPOSITORY_URI.*manifest_repo/s,
  );
  assert.match(resolveBlock, /batch-get-image/);
  assert.match(resolveBlock, /frontend_sha/);
  assert.match(verifyBlock, /lambda get-function/);
  assert.match(verifyBlock, /Code\.ImageUri/);
  assert.match(verifyBlock, /deployment\.json/);
  assert.match(verifyBlock, /releaseSha/);
});
