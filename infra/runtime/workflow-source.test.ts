import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowPath = new URL('../../.github/workflows/application-deploy.yml', import.meta.url);
const pullRequestWorkflowPath = new URL(
  '../../.github/workflows/pull-request.yml',
  import.meta.url,
);

test('factory.delivery.dependency-audit gates unprivileged candidates and releases before credentials', async () => {
  const [pullRequestWorkflow, applicationWorkflow] = await Promise.all([
    readFile(pullRequestWorkflowPath, 'utf8'),
    readFile(workflowPath, 'utf8'),
  ]);
  const auditCommand = 'npm audit --audit-level=high';
  const candidateAudit = pullRequestWorkflow.indexOf(auditCommand);
  const candidateInstall = pullRequestWorkflow.indexOf('run: npm ci');
  const candidateChecks = pullRequestWorkflow.indexOf('npm run check:ci');
  assert.ok(candidateAudit > candidateInstall);
  assert.ok(candidateChecks > candidateAudit);
  assert.match(pullRequestWorkflow, /permissions:\n {2}contents: read/);
  assert.doesNotMatch(pullRequestWorkflow, /id-token:\s*write|configure-aws-credentials|secrets\./);

  const releaseAudit = applicationWorkflow.indexOf(auditCommand);
  const releaseInstall = applicationWorkflow.indexOf('run: npm ci');
  const credentialAction = applicationWorkflow.indexOf(
    'uses: aws-actions/configure-aws-credentials@',
  );
  assert.ok(releaseAudit > releaseInstall);
  assert.ok(credentialAction > releaseAudit);
  assert.doesNotMatch(
    applicationWorkflow,
    /audit[^\n]*continue-on-error|continue-on-error:[^\n]*audit/i,
  );
  assert.doesNotMatch(applicationWorkflow, /AUDIT_(?:BYPASS|IGNORE)|SKIP_?AUDIT/i);
});
const previewWorkflowPath = new URL('../../.github/workflows/trusted-preview.yml', import.meta.url);

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

test('factory.delivery.automatic-main-delivery promotes only the verified exact dev release', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.match(workflow, / {2}dev:\n/);
  assert.match(workflow, /name: Promote verified main release to production/);
  assert.match(workflow, /needs: dev/);
  assert.match(workflow, /environment: prod/);
  const prodStart = workflow.indexOf('name: Promote verified main release to production');
  assert.ok(prodStart >= 0);
  const prodBlock = workflow.slice(prodStart);
  assert.match(
    prodBlock,
    /if: github\.event_name == 'push' && vars\.APPLICATION_DEPLOY_ENABLED == 'true'/,
  );
  assert.match(workflow, /needs\.dev\.outputs\.release_sha/);
  assert.match(workflow, /needs\.dev\.outputs\.backend_image/);
  assert.match(workflow, /needs\.dev\.outputs\.frontend_sha/);
  assert.match(workflow, /Verify six pages and protected session/);
  const devVerify = workflow.indexOf('name: Verify six pages and protected session');
  assert.ok(devVerify >= 0 && devVerify < prodStart);
  assert.doesNotMatch(
    prodBlock,
    /docker build|docker push|npm run build -w @app\/frontend|aws s3 cp frontend-dist\.tar\.gz/,
  );
});

test('factory.delivery.automatic-main-disabled skips both environment deployment jobs', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.match(workflow, /if:.*vars\.APPLICATION_DEPLOY_ENABLED == 'true'/);
  assert.match(
    workflow,
    /if:.*github\.event_name == 'workflow_dispatch'.*APPLICATION_DEPLOY_ENABLED/s,
  );
});

test('factory.delivery.automatic-main-stale rejects a superseded main SHA before environment mutation', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.match(workflow, /gh api "repos\/\$\{GITHUB_REPOSITORY\}\/commits\/main" --jq \.sha/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /current_main_sha.*RELEASE_SHA/s);
  assert.match(workflow, /concurrency:\n {2}group: application-deploy/);
});

test('factory.delivery publishes the dev verification receipt only after smoke passes', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const smokeStart = workflow.indexOf('name: Verify six pages and protected session');
  const receiptStart = workflow.indexOf('name: Record successful development verification');
  const prodStart = workflow.indexOf('  automatic-prod:');
  assert.ok(smokeStart >= 0);
  assert.ok(receiptStart > smokeStart && receiptStart < prodStart);
  const receiptBlock = workflow.slice(receiptStart, prodStart);
  assert.match(receiptBlock, /if: steps\.release\.outputs\.stage == 'dev'/);
  assert.match(receiptBlock, /releases\/\$\{RELEASE_SHA\}\/dev-verification\.json/);
  assert.match(
    receiptBlock,
    /version:1,releaseSha:\$releaseSha,backendImageUri:\$backendImageUri,frontendSha256:\$frontendSha256/,
  );
});

test('factory.delivery requires an exact dev receipt before manual and automatic production gates', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const resolveStart = workflow.indexOf('name: Resolve and verify immutable tested artifacts');
  const scanStart = workflow.indexOf('name: Require clean ECR image scan before activation');
  const prodStart = workflow.indexOf('name: Promote verified main release to production');
  assert.ok(resolveStart >= 0 && scanStart > resolveStart);
  const manualProductionResolution = workflow.slice(resolveStart, scanStart);
  assert.match(manualProductionResolution, /if test "\$STAGE" = prod/);
  assert.match(manualProductionResolution, /dev-verification\.json/);
  assert.match(
    manualProductionResolution,
    /\(keys \| sort\) == \["backendImageUri","frontendSha256","releaseSha","version"\]/,
  );
  assert.match(manualProductionResolution, /\.backendImageUri == \$backendImageUri/);
  assert.match(manualProductionResolution, /\.frontendSha256 == \$frontendSha256/);

  const automaticProduction = workflow.slice(prodStart);
  const automaticResolveStart = automaticProduction.indexOf(
    'name: Resolve and verify the exact development-tested artifacts',
  );
  const automaticScanStart = automaticProduction.indexOf(
    'name: Require clean ECR image scan before production activation',
  );
  assert.ok(automaticResolveStart >= 0 && automaticScanStart > automaticResolveStart);
  const automaticResolution = automaticProduction.slice(automaticResolveStart, automaticScanStart);
  assert.match(automaticResolution, /dev-verification\.json/);
  assert.match(
    automaticResolution,
    /\(keys \| sort\) == \["backendImageUri","frontendSha256","releaseSha","version"\]/,
  );
  assert.doesNotMatch(automaticProduction, /aws s3 cp dev-verification\.json "s3:\/\//);
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

test('factory.delivery.image-scan-gate checks the exact release digest before backend deployment', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const resolveStart = workflow.indexOf('name: Resolve and verify immutable tested artifacts');
  const scanStart = workflow.indexOf('name: Require clean ECR image scan before activation');
  const backupStart = workflow.indexOf('name: Snapshot existing production state');
  const deployStart = workflow.indexOf('name: Deploy exact backend digest');
  assert.ok(resolveStart >= 0);
  assert.ok(scanStart > resolveStart);
  assert.ok(backupStart > scanStart);
  assert.ok(deployStart > scanStart);
  const scanBlock = workflow.slice(scanStart, backupStart);
  assert.match(scanBlock, /ecr-image-scan-cli\.ts/);
  assert.match(scanBlock, /BACKEND_REPOSITORY_URI/);
  assert.match(scanBlock, /BACKEND_IMAGE_URI/);
  assert.match(scanBlock, /BACKEND_IMAGE_URI##\*@/);
});

test('factory.delivery.historical-control-tools runs both privileged control gates from trusted source', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const identityStart = workflow.indexOf('name: Derive exact release identity');
  const releaseCheckout = workflow.indexOf('ref: ${{ steps.release.outputs.sha }}');
  const controlCheckout = workflow.indexOf('path: .workflow-control');
  const controlInstall = workflow.indexOf('name: Install trusted workflow-control dependencies');
  const controlAudit = workflow.indexOf(
    'name: Reject high and critical trusted workflow-control vulnerabilities',
  );
  const controlMove = workflow.indexOf(
    'name: Move trusted workflow control outside the release workspace',
  );
  const publishStart = workflow.indexOf('name: Build and publish reviewed dev artifacts');
  const candidateChecks = workflow.indexOf('- run: npm run check:ci');
  const credentials = workflow.indexOf('uses: aws-actions/configure-aws-credentials@');
  const scanStart = workflow.indexOf('name: Require clean ECR image scan before activation');
  const backupStart = workflow.indexOf('name: Snapshot existing production state');
  const deployStart = workflow.indexOf('name: Deploy exact backend digest');
  assert.ok(releaseCheckout >= 0);
  assert.ok(identityStart >= 0);
  const identityBlock = workflow.slice(identityStart, releaseCheckout);
  assert.match(identityBlock, /GITHUB_REF.*refs\/heads\/main|refs\/heads\/main.*GITHUB_REF/);
  assert.ok(releaseCheckout > identityStart);
  assert.ok(controlCheckout > releaseCheckout);
  assert.ok(controlInstall > controlCheckout);
  assert.ok(controlAudit > controlInstall);
  assert.ok(controlMove > controlInstall);
  assert.ok(controlMove > controlAudit);
  assert.ok(candidateChecks > controlMove);
  assert.ok(publishStart > controlMove);
  assert.ok(credentials > controlInstall);
  assert.ok(credentials > controlMove);
  assert.ok(scanStart > credentials);
  assert.ok(backupStart > scanStart);
  assert.ok(deployStart > backupStart);

  const controlBlock = workflow.slice(controlCheckout, credentials);
  assert.match(workflow, /CONTROL_SHA: \$\{\{ github\.workflow_sha \}\}/);
  assert.match(controlBlock, /ref: \$\{\{ steps\.release\.outputs\.control_sha \}\}/);
  assert.match(identityBlock, /test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.match(controlBlock, /npm ci/);
  assert.match(controlBlock, /run: npm audit --audit-level=high/);
  assert.match(controlBlock, /working-directory: \.workflow-control/);
  assert.doesNotMatch(controlBlock, /audit[^\n]*continue-on-error|continue-on-error:[^\n]*audit/i);
  assert.match(workflow.slice(scanStart, backupStart), /cd "\$CONTROL_TOOLS_DIR"/);
  assert.match(workflow.slice(scanStart, backupStart), /ecr-image-scan-cli\.ts/);
  assert.match(workflow.slice(backupStart, deployStart), /cd "\$CONTROL_TOOLS_DIR"/);
  assert.match(workflow.slice(backupStart, deployStart), /production-backup-cli\.ts/);
  assert.match(workflow, /npx cdk deploy "TricoWeb-\$\{STAGE\}"/);
  assert.doesNotMatch(
    workflow.slice(deployStart, workflow.indexOf('  automatic-prod:')),
    /working-directory: \.workflow-control/,
  );
});

test('factory.trusted-preview.image-scan-gate checks both exact image digests before admission', async () => {
  const workflow = await readFile(previewWorkflowPath, 'utf8');
  const publishStart = workflow.indexOf('id: publish');
  const scanStart = workflow.indexOf(
    'name: Require clean ECR image scans before preview admission',
  );
  const admitStart = workflow.indexOf('name: Admit one four-hour Fargate preview');
  assert.ok(publishStart >= 0);
  assert.ok(scanStart > publishStart);
  assert.ok(admitStart > scanStart);
  const scanBlock = workflow.slice(scanStart, admitStart);
  assert.match(scanBlock, /ecr-image-scan-cli\.ts/);
  assert.match(scanBlock, /PREVIEW_BACKEND_IMAGE/);
  assert.match(scanBlock, /PREVIEW_FRONTEND_IMAGE/);
  assert.match(scanBlock, /backend_digest/);
  assert.match(scanBlock, /frontend_digest/);
});
