import assert from 'node:assert/strict';
import test from 'node:test';

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { PreviewFoundationStack } from './stack.js';

function foundationTemplate(): Template {
  const app = new App();
  const stack = new PreviewFoundationStack(app, 'TestFoundation', {
    config: {
      applicationName: 'example-app',
      previewZoneId: 'Z0123456789EXAMPLE',
      previewZoneName: 'preview.example.com',
    },
  });
  return Template.fromStack(stack);
}

test('factory.foundation.synth creates only reusable permanent resources', () => {
  const template = foundationTemplate();

  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::EC2::NatGateway', 0);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
  template.resourceCountIs('AWS::ECR::Repository', 2);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.resourceCountIs('AWS::Logs::LogGroup', 1);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  template.resourceCountIs('AWS::IAM::ManagedPolicy', 0);
  const imageRepositories = Object.values(template.findResources('AWS::ECR::Repository'));
  assert.equal(imageRepositories.length, 2);
  for (const repository of imageRepositories) {
    assert.deepEqual(repository.Properties.ImageScanningConfiguration, { ScanOnPush: true });
  }
  template.hasResourceProperties('AWS::ECR::Repository', {
    ImageTagMutability: 'IMMUTABLE',
    LifecyclePolicy: Match.objectLike({}),
  });
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [Match.objectLike({ AttributeName: 'previewKey', KeyType: 'HASH' })],
  });
});

test('factory.foundation.synth exposes task execution and bounded image capabilities', () => {
  const template = foundationTemplate().toJSON();
  const outputs = Object.keys(template.Outputs as Record<string, unknown>);
  assert.deepEqual(
    outputs.sort(),
    [
      'BackendRepositoryUri',
      'ClusterArn',
      'FrontendRepositoryUri',
      'LogGroupName',
      'PreviewZoneId',
      'PreviewZoneName',
      'PreviewEditorSecretArn',
      'PublicSubnetIds',
      'StateTableName',
      'TaskExecutionRoleArn',
      'TaskRoleArn',
      'TaskSecurityGroupId',
      'VpcId',
    ].sort(),
  );
  const serialized = JSON.stringify(template);
  for (const requiredAction of ['ecr:BatchGetImage', 'logs:PutLogEvents']) {
    assert.match(serialized, new RegExp(requiredAction));
  }
  for (const forbiddenAction of [
    'cloudformation:',
    'ec2:DeleteVpc',
    'ecr:DeleteRepository',
    'ecs:DeleteCluster',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenAction));
  }
});

test('factory.foundation.synth excludes dynamic preview resources', () => {
  const resources = foundationTemplate().toJSON().Resources as Record<
    string,
    { readonly Type?: string }
  >;
  const types = new Set(Object.values(resources).map((resource) => resource.Type));

  for (const forbidden of [
    'AWS::ECS::Service',
    'AWS::ECS::TaskDefinition',
    'AWS::Route53::RecordSet',
    'AWS::Lambda::Function',
    'AWS::Scheduler::Schedule',
  ]) {
    assert.equal(types.has(forbidden), false, `${forbidden} must be created dynamically`);
  }
});
