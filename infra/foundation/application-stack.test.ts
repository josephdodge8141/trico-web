import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

import { exampleApplicationConfig } from './application/config.js';
import { ApplicationStack } from './application/stack.js';
import { freshRoutingCode, freshApiViewerCode } from './application/fresh-routing.js';

function applicationTemplate(stage: 'dev' | 'prod' = 'dev'): Template {
  const app = new App();
  return Template.fromStack(
    new ApplicationStack(app, `Test-${stage}`, { config: exampleApplicationConfig(stage) }),
  );
}

test('application stack creates isolated durable content infrastructure', async () => {
  const template = applicationTemplate();
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
    GlobalSecondaryIndexes: [
      Match.objectLike({ IndexName: 'gsi1', Projection: { ProjectionType: 'ALL' } }),
    ],
  });
  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
    VersioningConfiguration: { Status: 'Enabled' },
  });
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
    CorsConfiguration: {
      CorsRules: [
        Match.objectLike({
          AllowedOrigins: ['https://dev.example.com'],
          AllowedMethods: ['PUT'],
        }),
      ],
    },
    LifecycleConfiguration: {
      Rules: [Match.objectLike({ ExpirationInDays: 1 })],
    },
  });
  template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  template.resourceCountIs('AWS::Route53::RecordSet', 1);
  const release = 'a'.repeat(40);
  const previous = 'b'.repeat(40);
  const records = new Map([
    ['active', release],
    [release + ':/', '1'],
    [release + ':/construction', '1'],
    [release + ':home', 'home.html'],
    [previous + ':/', '1'],
  ]);
  const handler = runInNewContext(
    freshRoutingCode('fixture').replace("import cf from 'cloudfront';", '') + '\nhandler;',
    {
      cf: {
        kvs: () => ({
          get: async (key: string) => {
            const value = records.get(key);
            if (value === undefined) throw new Error('Missing key');
            return value;
          },
          exists: async (key: string) => records.has(key),
        }),
      },
    },
  ) as (event: {
    request: { uri: string; method: string };
  }) => Promise<{ uri?: string; statusCode?: number }>;
  const request = (uri: string, method = 'GET') => handler({ request: { uri, method } });
  assert.equal((await request('/')).uri, `/fresh-releases/${release}/home.html`);
  assert.equal((await request('/index.html')).statusCode, 404);
  records.set(release + ':home', '../private.html');
  assert.equal((await request('/')).statusCode, 503, 'Invalid Home metadata fails closed');
  records.set(release + ':home', 'home.html');
  assert.equal((await request('/construction/')).uri, `/fresh-releases/${release}/index.html`);
  assert.equal((await request('/missing-project')).statusCode, 404);
  assert.equal((await request('/construction', 'POST')).statusCode, 405);
  assert.equal(
    (await request(`/fresh-releases/${previous}/assets/missing.js`)).uri,
    `/fresh-releases/${previous}/assets/missing.js`,
  );
  assert.equal(
    (await request('/missing.svg')).uri,
    '/missing.svg',
    'Origin error status must not be rewritten',
  );
  assert.equal(
    (await request('/deployment.json')).uri,
    `/fresh-releases/${release}/deployment.json`,
  );
  records.set('active', previous);
  assert.equal(
    (await request('/')).uri,
    `/fresh-releases/${previous}/index.html`,
    'Rollback restores the prior registry',
  );
  assert.equal(
    (await request('/construction')).statusCode,
    404,
    'Do not reuse routes from another release',
  );
  records.set('active', 'c'.repeat(40));
  assert.equal((await request('/')).statusCode, 503, 'An incomplete registry fails closed');
  records.set('active', 'invalid');
  assert.equal((await request('/')).statusCode, 503);
  records.delete('active');
  assert.equal((await request('/')).statusCode, 503);

  const freshApp = new App();
  const freshTemplate = Template.fromStack(
    new ApplicationStack(freshApp, 'FreshDev', {
      config: {
        ...exampleApplicationConfig('dev'),
        freshDevRouting: {
          releaseSha: 'a'.repeat(40),
          documentPaths: ['/', '/construction'],
          homeDocument: 'home.html',
        },
      },
    }),
  );
  freshTemplate.resourceCountIs('AWS::CloudFront::KeyValueStore', 1);
  const registryAsset = freshApp.node
    .findChild('FreshDev')
    .node.findChild('FreshDocumentRegistry')
    .node.findChild('ImportSource');
  assert.ok(registryAsset instanceof Asset);
  assert.deepEqual(
    JSON.parse(
      readFileSync(path.join(freshApp.synth().directory, registryAsset.assetPath), 'utf8'),
    ),
    {
      data: [
        { key: 'active', value: release },
        { key: release + ':home', value: 'home.html' },
        { key: release + ':/', value: '1' },
        { key: release + ':/construction', value: '1' },
      ],
    },
  );
  freshTemplate.resourceCountIs('AWS::CloudFront::Function', 1);
  const freshDistribution = Object.values(
    freshTemplate.findResources('AWS::CloudFront::Distribution'),
  )[0];
  assert.ok(freshDistribution);
  assert.equal(freshDistribution.Properties.DistributionConfig.CustomErrorResponses, undefined);
  assert.equal(
    freshDistribution.Properties.DistributionConfig.DefaultCacheBehavior.FunctionAssociations
      .length,
    1,
  );
  assert.equal(
    freshDistribution.Properties.DistributionConfig.CacheBehaviors.find(
      (behavior: { PathPattern: string }) => behavior.PathPattern === 'api/*',
    ).FunctionAssociations,
    undefined,
  );
  assert.throws(
    () =>
      new ApplicationStack(new App(), 'RejectedProdRouting', {
        config: {
          ...exampleApplicationConfig('prod'),
          freshDevRouting: { releaseSha: 'a'.repeat(40), documentPaths: ['/'] },
        },
      }),
    /dev/i,
  );

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
  template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
    DefaultRouteSettings: {
      ThrottlingBurstLimit: 100,
      ThrottlingRateLimit: 50,
    },
  });
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
  assert.doesNotMatch(
    JSON.stringify(template.findResources('AWS::Lambda::Function')),
    /INQUIRY_EMAIL_TO|CAREER_EMAIL_TO/,
  );
  const configuredApp = new App();
  const configuredTemplate = Template.fromStack(
    new ApplicationStack(configuredApp, 'Configured-mailboxes', {
      config: {
        ...exampleApplicationConfig('prod'),
        inquiryEmailTo: 'inquiries@example.com',
        careerEmailTo: 'careers@example.com',
      },
    }),
  );
  configuredTemplate.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.objectLike({
        INQUIRY_EMAIL_TO: 'inquiries@example.com',
        CAREER_EMAIL_TO: 'careers@example.com',
      }),
    },
  });
  const freshTemplate = Template.fromStack(
    new ApplicationStack(new App(), 'FreshRuntime', {
      config: {
        ...exampleApplicationConfig('dev'),
        freshDevRouting: { releaseSha: 'a'.repeat(40), documentPaths: ['/'] },
        freshDevRuntime: true,
      },
    }),
  );
  freshTemplate.resourceCountIs('AWS::DynamoDB::Table', 2);
  freshTemplate.resourceCountIs('AWS::SecretsManager::Secret', 1);
  freshTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
    DeletionProtectionEnabled: true,
  });
  freshTemplate.hasResourceProperties('AWS::Lambda::Function', {
    MemorySize: 1769,
    Timeout: 25,
    Environment: {
      Variables: Match.objectLike({
        INTAKE_DELIVERY_MODE: 'capture',
        INTAKE_STATE_TABLE: Match.anyValue(),
        INTAKE_REQUIRE_EDGE: 'true',
        INTAKE_ORIGIN_SECRET: Match.anyValue(),
        AWS_LWA_READINESS_CHECK_PATH: '/_candidate_ready',
      }),
    },
  });
  freshTemplate.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'ANY /api' });
  freshTemplate.hasResourceProperties('AWS::ApiGatewayV2::Route', {
    RouteKey: 'ANY /api/{proxy+}',
  });
  const freshPolicies = JSON.stringify(freshTemplate.findResources('AWS::IAM::Policy'));
  assert.doesNotMatch(freshPolicies, /ses:|bedrock:|bedrock-mantle:|sqs:/);
  freshTemplate.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
    OriginRequestPolicyConfig: {
      HeadersConfig: {
        HeaderBehavior: 'whitelist',
        Headers: ['Content-Type', 'Origin', 'X-Trico-Viewer-Ip'],
      },
    },
  });
  const distribution = Object.values(
    freshTemplate.findResources('AWS::CloudFront::Distribution'),
  )[0];
  const fn = Object.values(freshTemplate.findResources('AWS::Lambda::Function'))[0];
  assert.ok(distribution && fn);
  const config = distribution.Properties.DistributionConfig;
  for (const path of ['api', 'api/*']) {
    const behavior = config.CacheBehaviors.find(
      (entry: { PathPattern: string }) => entry.PathPattern === path,
    );
    assert.equal(behavior.FunctionAssociations.length, 1);
    assert.match(JSON.stringify(behavior.FunctionAssociations), /FreshApiViewer/);
    assert.equal(behavior.CachePolicyId, '4135ea2d-6df8-44a3-9df3-4b5a84be39ad');
  }
  const headers = config.Origins.flatMap(
    (entry: { OriginCustomHeaders?: { HeaderName: string; HeaderValue: unknown }[] }) =>
      entry.OriginCustomHeaders || [],
  );
  const proof = headers.find(
    (entry: { HeaderName: string }) => entry.HeaderName === 'X-Trico-Origin-Proof',
  );
  assert.deepEqual(proof?.HeaderValue, fn.Properties.Environment.Variables.INTAKE_ORIGIN_SECRET);
  const forward = runInNewContext(freshApiViewerCode() + '\nhandler;') as (event: unknown) => {
    headers: Record<string, { value: string }>;
    statusCode?: number;
  };
  const forwarded = forward({
    viewer: { ip: '2001:db8::15' },
    request: {
      headers: {
        'x-trico-viewer-ip': { value: '192.0.2.1' },
        'cloudfront-viewer-address': { value: '192.0.2.1:443' },
        'x-trico-origin-proof': { value: 'forged' },
      },
    },
  });
  assert.equal(forwarded.headers['x-trico-viewer-ip']?.value, '2001:db8::15');
  assert.equal(forwarded.headers['cloudfront-viewer-address'], undefined);
  assert.equal(forwarded.headers['x-trico-origin-proof'], undefined);
  assert.equal(forward({ request: { headers: {} } }).statusCode, 403);
  assert.throws(
    () =>
      new ApplicationStack(new App(), 'MissingFreshRegistry', {
        config: { ...exampleApplicationConfig('dev'), freshDevRuntime: true },
      }),
    /freshDevRouting/,
  );
  assert.throws(
    () =>
      new ApplicationStack(new App(), 'RejectedFreshSync', {
        config: {
          ...exampleApplicationConfig('dev'),
          freshDevRuntime: true,
          externalSyncEnabled: true,
          bedrockModelId: 'fixture-model',
          freshDevRouting: { releaseSha: 'a'.repeat(40), documentPaths: ['/'] },
        },
      }),
    /disabled external sync/,
  );
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
