import assert from 'node:assert/strict';
import test from 'node:test';

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { exampleDeliveryConfig } from './delivery-config.js';
import { DeliveryFoundationStack } from './delivery-stack.js';

function deliveryTemplate(): Template {
  const app = new App();
  return Template.fromStack(
    new DeliveryFoundationStack(app, 'TestDeliveryFoundation', {
      config: exampleDeliveryConfig,
    }),
  );
}

test('factory.delivery.foundation creates environment-scoped OIDC roles and protected release stores', () => {
  const template = deliveryTemplate();
  template.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
  template.resourceCountIs('AWS::AccessAnalyzer::Analyzer', 1);
  template.resourceCountIs('AWS::CloudTrail::Trail', 1);
  template.resourceCountIs('AWS::ECR::Repository', 1);
  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.resourceCountIs('AWS::Budgets::Budget', 1);
  template.resourceCountIs('AWS::Route53::HostedZone', 1);
  template.resourceCountIs('AWS::IAM::Role', 5);
  template.hasResourceProperties('AWS::ECR::Repository', {
    ImageScanningConfiguration: { ScanOnPush: true },
    ImageTagMutability: 'IMMUTABLE',
  });
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: Match.anyValue(),
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
    VersioningConfiguration: { Status: 'Enabled' },
  });
  template.hasResourceProperties('AWS::AccessAnalyzer::Analyzer', {
    AnalyzerName: 'trico-web-account-access',
    Type: 'ACCOUNT',
  });
  template.hasResourceProperties('AWS::CloudTrail::Trail', {
    EnableLogFileValidation: true,
    IncludeGlobalServiceEvents: true,
    IsLogging: true,
    IsMultiRegionTrail: true,
    TrailName: 'trico-web-account-management',
  });
});

test('delivery OIDC trust binds each routine role to its GitHub environment', () => {
  const serialized = JSON.stringify(deliveryTemplate().toJSON());
  for (const environment of ['preview', 'dev', 'prod']) {
    assert.match(
      serialized,
      new RegExp(`repo:josephdodge8141@34195877/trico-web@1362078393:environment:${environment}`),
    );
  }
  assert.match(serialized, /sts\.amazonaws\.com/);
  assert.doesNotMatch(serialized, /repo:\*|environment:\*/);
});

test('routine workflows cannot assume the human foundation owner role', () => {
  const template = deliveryTemplate().toJSON();
  const roles = Object.values(
    template.Resources as Record<string, { Type: string; Properties?: Record<string, unknown> }>,
  ).filter((resource) => resource.Type === 'AWS::IAM::Role');
  const owner = roles.find((role) =>
    JSON.stringify(role.Properties).includes('delivery-foundation-owner'),
  );
  assert.notEqual(owner, undefined);
  assert.doesNotMatch(JSON.stringify(owner), /token\.actions\.githubusercontent\.com/);
});
