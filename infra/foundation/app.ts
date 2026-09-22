#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { exampleApplicationConfig, parseApplicationConfig } from './application/config.js';
import { ApplicationStack } from './application/stack.js';
import { exampleFoundationConfig, parseFoundationConfig } from './config.js';
import { exampleDeliveryConfig, parseDeliveryConfig } from './delivery-config.js';
import { DeliveryFoundationStack } from './delivery-stack.js';
import { EdgeFoundationStack } from './edge-stack.js';
import { PreviewFoundationStack } from './stack.js';

const app = new App();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const environment = (region: string) => (account === undefined ? { region } : { account, region });
const deliveryConfig = parseDeliveryConfig({
  applicationName:
    app.node.tryGetContext('delivery:applicationName') ?? exampleDeliveryConfig.applicationName,
  repository: app.node.tryGetContext('delivery:repository') ?? exampleDeliveryConfig.repository,
  alertEmail: app.node.tryGetContext('delivery:alertEmail') ?? exampleDeliveryConfig.alertEmail,
  parentZoneId:
    app.node.tryGetContext('delivery:parentZoneId') ?? exampleDeliveryConfig.parentZoneId,
  parentZoneName:
    app.node.tryGetContext('delivery:parentZoneName') ?? exampleDeliveryConfig.parentZoneName,
  previewZoneName:
    app.node.tryGetContext('delivery:previewZoneName') ?? exampleDeliveryConfig.previewZoneName,
  devDomain: app.node.tryGetContext('delivery:devDomain') ?? exampleDeliveryConfig.devDomain,
  productionDomain:
    app.node.tryGetContext('delivery:productionDomain') ?? exampleDeliveryConfig.productionDomain,
  sesIdentityDomain:
    app.node.tryGetContext('delivery:sesIdentityDomain') ?? exampleDeliveryConfig.sesIdentityDomain,
  monthlyBudgetUsd:
    app.node.tryGetContext('delivery:monthlyBudgetUsd') ?? exampleDeliveryConfig.monthlyBudgetUsd,
  releaseRetentionDays:
    app.node.tryGetContext('delivery:releaseRetentionDays') ??
    exampleDeliveryConfig.releaseRetentionDays,
});
new DeliveryFoundationStack(app, 'TricoWebDeliveryFoundation', {
  config: deliveryConfig,
  env: environment('us-east-2'),
});
new EdgeFoundationStack(app, 'TricoWebEdgeFoundation', {
  config: deliveryConfig,
  env: environment('us-east-1'),
});
const config = parseFoundationConfig({
  applicationName:
    app.node.tryGetContext('foundation:applicationName') ?? exampleFoundationConfig.applicationName,
  previewZoneId:
    app.node.tryGetContext('foundation:previewZoneId') ?? exampleFoundationConfig.previewZoneId,
  previewZoneName:
    app.node.tryGetContext('foundation:previewZoneName') ?? exampleFoundationConfig.previewZoneName,
});

new PreviewFoundationStack(app, 'FullstackTsPreviewFoundation', {
  config,
  env: environment('us-east-2'),
});

for (const stage of ['dev', 'prod'] as const) {
  const example = exampleApplicationConfig(stage);
  const applicationConfig = parseApplicationConfig({
    applicationName: app.node.tryGetContext('application:name') ?? example.applicationName,
    stage,
    backendImageUri:
      app.node.tryGetContext(`application:${stage}:backendImageUri`) ?? example.backendImageUri,
    publicOrigin:
      app.node.tryGetContext(`application:${stage}:publicOrigin`) ?? example.publicOrigin,
    customDomain:
      app.node.tryGetContext(`application:${stage}:customDomain`) ?? example.customDomain,
    hostedZoneId:
      app.node.tryGetContext(`application:${stage}:hostedZoneId`) ?? example.hostedZoneId,
    hostedZoneName:
      app.node.tryGetContext(`application:${stage}:hostedZoneName`) ?? example.hostedZoneName,
    certificateArn:
      app.node.tryGetContext(`application:${stage}:certificateArn`) ?? example.certificateArn,
    sesIdentityDomain:
      app.node.tryGetContext(`application:${stage}:sesIdentityDomain`) ?? example.sesIdentityDomain,
    ...(app.node.tryGetContext(`application:${stage}:bedrockModelId`) === undefined
      ? {}
      : {
          bedrockModelId: app.node.tryGetContext(`application:${stage}:bedrockModelId`) as unknown,
        }),
    alertTopicArn:
      app.node.tryGetContext(`application:${stage}:alertTopicArn`) ?? example.alertTopicArn,
    externalSyncEnabled:
      app.node.tryGetContext(`application:${stage}:externalSyncEnabled`) ??
      example.externalSyncEnabled,
  });
  new ApplicationStack(app, `TricoWeb-${stage}`, {
    config: applicationConfig,
    env: environment('us-east-2'),
  });
}
