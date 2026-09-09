#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { exampleApplicationConfig, parseApplicationConfig } from './application/config.js';
import { ApplicationStack } from './application/stack.js';
import { exampleFoundationConfig, parseFoundationConfig } from './config.js';
import { PreviewFoundationStack } from './stack.js';

const app = new App();
const config = parseFoundationConfig({
  applicationName:
    app.node.tryGetContext('foundation:applicationName') ?? exampleFoundationConfig.applicationName,
  previewZoneId:
    app.node.tryGetContext('foundation:previewZoneId') ?? exampleFoundationConfig.previewZoneId,
  previewZoneName:
    app.node.tryGetContext('foundation:previewZoneName') ?? exampleFoundationConfig.previewZoneName,
});

new PreviewFoundationStack(app, 'FullstackTsPreviewFoundation', { config });

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
    bedrockModelId:
      app.node.tryGetContext(`application:${stage}:bedrockModelId`) ?? example.bedrockModelId,
    externalSyncEnabled:
      app.node.tryGetContext(`application:${stage}:externalSyncEnabled`) ??
      example.externalSyncEnabled,
  });
  new ApplicationStack(app, `TricoWeb-${stage}`, { config: applicationConfig });
}
