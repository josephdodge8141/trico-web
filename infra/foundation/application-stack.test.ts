import assert from 'node:assert/strict';
import test from 'node:test';

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { exampleApplicationConfig } from './application/config.js';
import { ApplicationStack } from './application/stack.js';

function applicationTemplate(stage: 'dev' | 'prod' = 'dev'): Template {
  const app = new App();
  return Template.fromStack(
    new ApplicationStack(app, `Test-${stage}`, { config: exampleApplicationConfig(stage) }),
  );
}

test('application stack creates isolated durable content infrastructure', () => {
  const template = applicationTemplate();
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
    GlobalSecondaryIndexes: [
      Match.objectLike({ IndexName: 'gsi1', Projection: { ProjectionType: 'ALL' } }),
    ],
  });
  template.resourceCountIs('AWS::S3::Bucket', 1);
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
    VersioningConfiguration: { Status: 'Enabled' },
  });
  template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  template.resourceCountIs('AWS::Route53::RecordSet', 1);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Aliases: ['dev.example.com'],
      ViewerCertificate: { AcmCertificateArn: Match.anyValue() },
    },
  });
});

test('application stack exposes API and scheduled Lambda entrypoints', () => {
  const template = applicationTemplate();
  template.resourceCountIs('AWS::Lambda::Function', 1);
  template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
  template.resourceCountIs('AWS::Events::Rule', 1);
  template.resourceCountIs('AWS::CloudWatch::Alarm', 6);
  template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    AlarmActions: ['arn:aws:sns:us-east-2:111111111111:trico-web-operations'],
  });
  template.hasResourceProperties('AWS::Lambda::Function', {
    PackageType: 'Image',
    Environment: {
      Variables: Match.objectLike({
        APP_ENV: 'dev',
        BEDROCK_MODE: 'fixture',
        EXTERNAL_SYNC_ENABLED: 'false',
      }),
    },
  });
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.not(Match.objectLike({ BEDROCK_MODEL_ID: Match.anyValue() })),
    },
  });
  const policies = template.findResources('AWS::IAM::Policy');
  assert.doesNotMatch(JSON.stringify(policies), /bedrock(?:-mantle)?:/u);
});

test('production retains data while development can be intentionally destroyed', () => {
  const production = applicationTemplate('prod').toJSON();
  const table = Object.values(
    production.Resources as Record<string, { Type: string; DeletionPolicy?: string }>,
  ).find((resource) => resource.Type === 'AWS::DynamoDB::Table');
  const bucket = Object.values(
    production.Resources as Record<string, { Type: string; DeletionPolicy?: string }>,
  ).find((resource) => resource.Type === 'AWS::S3::Bucket');
  assert.equal(table?.DeletionPolicy, 'Retain');
  assert.equal(bucket?.DeletionPolicy, 'Retain');
});
