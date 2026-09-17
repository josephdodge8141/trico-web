import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { CatalogValidationError, loadBehaviorCatalog, parseBehaviorSources } from './catalog.js';

const featureRoot = path.resolve('packages/cucumber/features');

test('the canonical catalog expands examples and preserves backgrounds and arguments', async () => {
  const catalog = await loadBehaviorCatalog(featureRoot);
  const invalidResult = catalog.cases.find(
    (catalogCase) => catalogCase.id === 'factory.accounting-invalid-outcome::missing-result',
  );
  const invalidLogin = catalog.cases.find(
    (catalogCase) => catalogCase.id === 'auth.login-nondisclosing::wrong-password',
  );
  const publicHealth = catalog.cases.find((catalogCase) => catalogCase.id === 'public.health');

  assert.ok(invalidResult);
  assert.equal(
    invalidResult.backgrounds.feature?.steps[0]?.text,
    'a canonical catalog with stable expanded case identities',
  );
  assert.equal(
    invalidResult.backgrounds.rule?.steps[0]?.text,
    'the layer has declared its exercised results and catalog no-ops',
  );
  assert.equal(invalidResult.steps[2]?.argument?.type, 'docString');
  assert.equal(invalidResult.steps[2]?.argument?.content, 'no linked result');
  assert.equal(invalidResult.example?.name, 'Invalid execution results');
  assert.equal(invalidResult.example?.values.reported_condition, 'no linked result');
  assert.ok(invalidLogin);
  assert.equal(invalidLogin.example?.values.credential_case, 'an incorrect password');
  assert.equal(publicHealth?.steps[3]?.argument?.type, 'docString');
  assert.equal(publicHealth?.steps[3]?.argument?.content, '{"status":"ok"}');
  assert.equal(
    catalog.cases.filter((catalogCase) => catalogCase.scenarioId === 'auth.login-nondisclosing')
      .length,
    3,
  );
  assert.equal(
    invalidLogin.noops.frontend,
    'The nondisclosing browser message is exercised by Compose Playwright and both credential cases are exercised by the backend adapter.',
  );
});

test('canonical feature files are the catalog source rather than copied text', async () => {
  const publicSource = await readFile(path.join(featureRoot, 'application/public.feature'), 'utf8');
  const catalog = parseBehaviorSources([
    { category: 'application', uri: 'application/public.feature', data: publicSource },
  ]);

  assert.deepEqual(
    catalog.cases.map((catalogCase) => catalogCase.id),
    [
      'public.pages::home',
      'public.pages::property-management',
      'public.pages::real-estate',
      'public.pages::construction',
      'public.pages::storage',
      'public.pages::development',
      'public.manifest-switch',
      'public.home-mounted-composition',
      'public.home-division-blue-treatment',
      'public.home-anniversary-presentation',
      'public.semantic-highlight-colors',
      'public.division-hero-media-contract',
      'public.shared-section-rhythm',
      'public.review-platform-contract',
      'public.development-measured-parity',
      'public.development-partner-composition',
      'public.development-about-composition',
      'public.development-footer-presentation',
      'public.shared-form-footer-geometry',
      'public.accessible-select-field',
      'public.home-broad-parity',
      'public.property-management-broad-parity',
      'public.profile-card-contract',
      'public.property-management-mounted-composition',
      'public.real-estate-card-geometry',
      'public.real-estate-listing-gallery',
      'public.real-estate-inverse-surfaces',
      'public.construction-collection-geometry',
      'public.construction-residual-composition',
      'public.construction-footer-presentation',
      'public.construction-bid-inverse-presentation',
      'public.split-hero-primary-media-presentation',
      'public.storage-about-rhythm',
      'public.storage-centered-logo-masthead',
      'public.storage-mounted-composition',
      'public.dedicated-division-composition::real-estate',
      'public.dedicated-division-composition::construction',
      'public.dedicated-division-composition::development',
      'public.construction-empty',
      'public.visual-baseline',
      'public.health',
    ],
  );
});

test('duplicate scenario IDs are rejected even when titles differ', () => {
  assertCatalogError(
    `Feature: Duplicate identities
  @id:duplicate.case
  Scenario: First title
    Given the first behavior

  @id:duplicate.case
  Scenario: Completely different title
    Given the second behavior
`,
    /duplicate scenario ID "duplicate\.case"/i,
  );
});

test('a scenario without a stable ID is rejected', () => {
  assertCatalogError(
    `Feature: Missing identity
  Scenario: No stable identifier
    Given a behavior
`,
    /exactly one @id:<identifier>/i,
  );
});

test('source categories and their canonical roots are explicit and fail closed', () => {
  const source = `Feature: Explicit origin
  @id:origin.case
  Scenario: Has an explicit origin
    Given a behavior
`;

  assert.throws(
    () =>
      parseBehaviorSources([
        { category: 'factory', uri: 'application/origin.feature', data: source },
      ]),
    (error: unknown) =>
      error instanceof CatalogValidationError &&
      /category.*root|root.*category/i.test(error.message),
  );
  assert.throws(
    () =>
      parseBehaviorSources([
        {
          category: 'application',
          uri: 'factroy/origin.feature',
          data: source,
        },
      ]),
    (error: unknown) =>
      error instanceof CatalogValidationError && /unknown.*root/i.test(error.message),
  );
  assert.throws(
    () =>
      parseBehaviorSources([
        {
          category: 'unknown',
          uri: 'unknown/origin.feature',
          data: source,
        } as never,
      ]),
    (error: unknown) =>
      error instanceof CatalogValidationError && /unknown.*category/i.test(error.message),
  );
});

test('an outline row must provide a non-empty case_id', () => {
  assertCatalogError(
    `Feature: Missing row identity
  @id:outline.case
  Scenario Outline: One row is unnamed
    Given value "<value>"

    Examples:
      | case_id | value |
      |         | one   |
`,
    /non-empty case_id/i,
  );
});

test('outline case IDs must be unique across Examples blocks', () => {
  assertCatalogError(
    `Feature: Repeated row identity
  @id:outline.case
  Scenario Outline: Rows span blocks
    Given value "<value>"

    Examples: First
      | case_id | value |
      | same    | one   |

    Examples: Second
      | case_id | value |
      | same    | two   |
`,
    /duplicate case_id "same"/i,
  );
});

test('no-op tags cannot be inherited from a Rule', () => {
  assertCatalogError(
    `Feature: Inherited no-op
  @backend-noop
  Rule: Wrong scope
    @id:rule.noop
    Scenario: Tagged by its rule
      backend-noop: This reason cannot make an inherited tag legal.
      Given a behavior
`,
    /Rule.*backend-noop/i,
  );
});

test('a no-op tag requires its exact scenario description reason', () => {
  assertCatalogError(
    `Feature: Missing reason
  @id:missing.reason @frontend-noop
  Scenario: Missing description declaration
    Given a behavior
`,
    /frontend-noop.*reason/i,
  );
});

test('a reason without the corresponding no-op tag is illegal', () => {
  assertCatalogError(
    `Feature: Stray reason
  @id:stray.reason
  Scenario: Stray description declaration
    frontend-noop: The declaration is not authorized by a tag.
    Given a behavior
`,
    /frontend-noop.*tag/i,
  );
});

function assertCatalogError(source: string, pattern: RegExp): void {
  assert.throws(
    () =>
      parseBehaviorSources([
        { category: 'application', uri: 'application/fixture.feature', data: source },
      ]),
    (error: unknown) => error instanceof CatalogValidationError && pattern.test(error.message),
  );
}
