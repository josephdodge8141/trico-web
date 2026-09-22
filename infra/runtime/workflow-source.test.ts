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
