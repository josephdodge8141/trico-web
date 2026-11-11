import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  ImportSource,
  KeyValueStore,
  OriginRequestPolicy,
  OriginRequestHeaderBehavior,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  Alarm,
  ComparisonOperator,
  Dashboard,
  GraphWidget,
  Metric,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { CfnRule } from 'aws-cdk-lib/aws-events';
import { CfnApi, CfnIntegration, CfnRoute, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnFunction, CfnPermission } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

import { type ApplicationConfig, parseApplicationConfig } from './config.js';
import { freshRoutingCode, freshApiViewerCode } from './fresh-routing.js';

export interface ApplicationStackProps extends StackProps {
  readonly config: ApplicationConfig;
}

export class ApplicationStack extends Stack {
  public constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);
    const config = parseApplicationConfig(props.config);
    const prefix = `${config.applicationName}-${config.stage}`;
    const freshRuntime = config.freshDevRuntime === true;
    const durableRemoval = config.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
    const alertTopic = Topic.fromTopicArn(this, 'AlertTopic', config.alertTopicArn);

    Tags.of(this).add('trico:application', config.applicationName);
    Tags.of(this).add('trico:environment', config.stage);
    Tags.of(this).add('trico:scope', 'application');

    const table = new Table(this, 'ApplicationTable', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: durableRemoval,
      tableName: prefix,
      timeToLiveAttribute: 'expiresAt',
    });
    table.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    const contentBucket = new Bucket(this, 'ContentBucket', {
      autoDeleteObjects: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: durableRemoval,
      versioned: true,
    });
    const resumeBucket = new Bucket(this, 'ResumeBucket', {
      autoDeleteObjects: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: durableRemoval,
      versioned: false,
      cors: [
        {
          allowedOrigins: [config.publicOrigin],
          allowedMethods: [HttpMethods.PUT],
          allowedHeaders: ['Content-Type', 'Content-Length'],
          maxAge: 300,
        },
      ],
      lifecycleRules: [{ expiration: Duration.days(1) }],
    });

    const functionRole = new Role(this, 'BackendFunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: `Runtime role for ${prefix}`,
    });
    functionRole.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/lambda/${prefix}:*`,
        ],
      }),
    );
    if (config.externalSyncEnabled && config.bedrockModelId !== undefined) {
      functionRole.addToPolicy(
        new PolicyStatement({
          actions: ['bedrock-mantle:CreateInference'],
          effect: Effect.ALLOW,
          resources: ['*'],
        }),
      );
    }
    const freshState = freshRuntime
      ? new Table(this, 'FreshIntakeState', {
          billingMode: BillingMode.PAY_PER_REQUEST,
          partitionKey: { name: 'id', type: AttributeType.STRING },
          timeToLiveAttribute: 'ttl',
          pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
          deletionProtection: true,
          removalPolicy: RemovalPolicy.RETAIN,
        })
      : undefined;
    const originProof = freshRuntime
      ? new Secret(this, 'FreshApiOriginProof', {
          generateSecretString: { passwordLength: 48, excludePunctuation: true },
        }).secretValue.unsafeUnwrap()
      : undefined;
    if (freshState) {
      functionRole.addToPolicy(
        new PolicyStatement({
          actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'],
          resources: [freshState.tableArn],
        }),
      );
      functionRole.addToPolicy(
        new PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject'],
          resources: [resumeBucket.arnForObjects('fresh-trico/*')],
        }),
      );
      new CfnOutput(this, 'FreshIntakeStateTable', { value: freshState.tableName });
    } else {
      table.grantReadWriteData(functionRole);
      contentBucket.grantReadWrite(functionRole);
      resumeBucket.grantReadWrite(functionRole);
      functionRole.addToPolicy(
        new PolicyStatement({
          actions: ['ses:SendEmail', 'ses:SendRawEmail'],
          resources: [
            `arn:${this.partition}:ses:${this.region}:${this.account}:identity/${config.sesIdentityDomain}`,
          ],
        }),
      );
    }
    if (config.externalSyncEnabled && config.bedrockModelId !== undefined) {
      functionRole.addToPolicy(
        new PolicyStatement({
          actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
          effect: Effect.ALLOW,
          resources: [
            `arn:${this.partition}:bedrock:${this.region}::foundation-model/${config.bedrockModelId}`,
            `arn:${this.partition}:bedrock:${this.region}:${this.account}:inference-profile/${config.bedrockModelId}`,
          ],
        }),
      );
    }

    const backend = new CfnFunction(this, 'BackendFunction', {
      code: { imageUri: config.backendImageUri },
      environment: {
        variables: {
          APP_ENV: config.stage,
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
          BEDROCK_MODE: config.externalSyncEnabled ? 'web-search' : 'fixture',
          ...(config.bedrockModelId === undefined
            ? {}
            : { BEDROCK_MODEL_ID: config.bedrockModelId }),
          COOKIE_SECURE: 'true',
          DYNAMODB_TABLE: table.tableName,
          EMAIL_FROM: `no-reply@${config.sesIdentityDomain}`,
          ...(config.inquiryEmailTo === undefined
            ? {}
            : { INQUIRY_EMAIL_TO: config.inquiryEmailTo }),
          ...(config.careerEmailTo === undefined ? {} : { CAREER_EMAIL_TO: config.careerEmailTo }),
          EXTERNAL_SYNC_ENABLED: String(config.externalSyncEnabled),
          MAIL_TRANSPORT: 'ses',
          PUBLIC_ORIGIN: config.publicOrigin,
          S3_BUCKET: contentBucket.bucketName,
          RESUME_BUCKET: resumeBucket.bucketName,
          S3_FORCE_PATH_STYLE: 'false',
          SESSION_COOKIE_NAME: `trico_${config.stage}_session`,
          ...(freshState && originProof
            ? {
                INTAKE_STATE_TABLE: freshState.tableName,
                INTAKE_DELIVERY_MODE: 'capture',
                INTAKE_REQUIRE_EDGE: 'true',
                INTAKE_ORIGIN_SECRET: originProof,
                AWS_LWA_READINESS_CHECK_PATH: '/_candidate_ready',
              }
            : {}),
        },
      },
      functionName: prefix,
      memorySize: freshRuntime ? 1769 : 1024,
      packageType: 'Image',
      role: functionRole.roleArn,
      timeout: freshRuntime ? 25 : 900,
    });

    const backendLogs = new LogGroup(this, 'BackendLogs', {
      logGroupName: `/aws/lambda/${prefix}`,
      removalPolicy: durableRemoval,
      retention: config.stage === 'prod' ? RetentionDays.THREE_MONTHS : RetentionDays.TWO_WEEKS,
    });
    backend.node.addDependency(backendLogs);

    const api = new CfnApi(this, 'HttpApi', {
      name: `${prefix}-api`,
      protocolType: 'HTTP',
    });
    const integration = new CfnIntegration(this, 'LambdaIntegration', {
      apiId: api.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: backend.attrArn,
      payloadFormatVersion: '2.0',
    });
    new CfnRoute(this, 'DefaultRoute', {
      apiId: api.ref,
      routeKey: freshRuntime ? 'ANY /api/{proxy+}' : '$default',
      target: `integrations/${integration.ref}`,
    });
    if (freshRuntime)
      new CfnRoute(this, 'FreshApiRootRoute', {
        apiId: api.ref,
        routeKey: 'ANY /api',
        target: `integrations/${integration.ref}`,
      });
    new CfnStage(this, 'DefaultStage', {
      apiId: api.ref,
      autoDeploy: true,
      defaultRouteSettings: {
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      stageName: '$default',
    });
    new CfnPermission(this, 'ApiInvokePermission', {
      action: 'lambda:InvokeFunction',
      functionName: backend.ref,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:${this.partition}:execute-api:${this.region}:${this.account}:${api.ref}/*`,
    });

    const syncRule = new CfnRule(this, 'ExternalSyncSchedule', {
      description: 'Starts the bounded external listing synchronization job.',
      scheduleExpression: 'rate(15 minutes)',
      state: config.externalSyncEnabled ? 'ENABLED' : 'DISABLED',
      targets: [
        {
          arn: backend.attrArn,
          id: 'BackendExternalSync',
          input: JSON.stringify({ type: 'trico.external-sync', version: 1 }),
        },
      ],
    });
    new CfnPermission(this, 'ScheduleInvokePermission', {
      action: 'lambda:InvokeFunction',
      functionName: backend.ref,
      principal: 'events.amazonaws.com',
      sourceArn: syncRule.attrArn,
    });

    const routing = config.freshDevRouting;
    const routeStore = routing
      ? new KeyValueStore(this, 'FreshDocumentRegistry', {
          keyValueStoreName: `${prefix}-fresh-documents`,
          source: ImportSource.fromInline(
            JSON.stringify({
              data: [
                { key: 'active', value: routing.releaseSha },
                ...(routing.homeDocument
                  ? [{ key: `${routing.releaseSha}:home`, value: routing.homeDocument }]
                  : []),
                ...routing.documentPaths.map((uri) => ({
                  key: `${routing.releaseSha}:${uri.replace(/\/$/, '') || '/'}`,
                  value: '1',
                })),
              ],
            }),
          ),
        })
      : undefined;
    const documentRouter = routeStore
      ? new CloudFrontFunction(this, 'FreshDocumentRouter', {
          functionName: `${prefix}-fresh-documents-v2`,
          runtime: FunctionRuntime.JS_2_0,
          keyValueStore: routeStore,
          code: FunctionCode.fromInline(freshRoutingCode(routeStore.keyValueStoreId)),
        })
      : undefined;
    if (routeStore)
      new CfnOutput(this, 'FreshDocumentRegistryArn', { value: routeStore.keyValueStoreArn });
    const apiViewer = freshRuntime
      ? new CloudFrontFunction(this, 'FreshApiViewer', {
          functionName: `${prefix}-fresh-api-viewer`,
          runtime: FunctionRuntime.JS_2_0,
          code: FunctionCode.fromInline(freshApiViewerCode()),
        })
      : undefined;
    const apiHeaders = freshRuntime
      ? new OriginRequestPolicy(this, 'FreshApiHeaders', {
          headerBehavior: OriginRequestHeaderBehavior.allowList(
            'Content-Type',
            'Origin',
            'X-Trico-Viewer-Ip',
          ),
        })
      : OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER;
    const apiOrigin = new HttpOrigin(Fn.select(2, Fn.split('/', api.attrApiEndpoint)), {
      ...(originProof ? { customHeaders: { 'X-Trico-Origin-Proof': originProof } } : {}),
    });
    const apiAssociation = apiViewer
      ? {
          functionAssociations: [
            { eventType: FunctionEventType.VIEWER_REQUEST, function: apiViewer },
          ],
        }
      : {};
    const certificate = Certificate.fromCertificateArn(this, 'Certificate', config.certificateArn);
    const distribution = new Distribution(this, 'Distribution', {
      certificate,
      domainNames: [config.customDomain],
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(contentBucket as IBucket),
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
        ...(documentRouter
          ? {
              functionAssociations: [
                { eventType: FunctionEventType.VIEWER_REQUEST, function: documentRouter },
              ],
            }
          : {}),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        ...(routing
          ? {
              api: {
                allowedMethods: AllowedMethods.ALLOW_ALL,
                cachePolicy: CachePolicy.CACHING_DISABLED,
                origin: apiOrigin,
                originRequestPolicy: apiHeaders,
                ...apiAssociation,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              },
            }
          : {}),
        'api/*': {
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          origin: apiOrigin,
          originRequestPolicy: apiHeaders,
          ...apiAssociation,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      comment: `${prefix} public content and API`,
      enableLogging: false,
      ...(routing
        ? {}
        : {
            errorResponses: [
              { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
              { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
            ],
          }),
    });
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'ApplicationZone', {
      hostedZoneId: config.hostedZoneId,
      zoneName: config.hostedZoneName,
    });
    new ARecord(this, 'ApplicationAlias', {
      recordName: config.customDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: hostedZone,
    });

    const backendErrors = this.functionAlarm(
      'BackendErrors',
      prefix,
      'Errors',
      ComparisonOperator.GREATER_THAN_THRESHOLD,
    );
    const backendThrottles = this.functionAlarm(
      'BackendThrottles',
      prefix,
      'Throttles',
      ComparisonOperator.GREATER_THAN_THRESHOLD,
    );
    const apiErrors = new Alarm(this, 'ApiServerErrors', {
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      metric: new Metric({
        dimensionsMap: { ApiId: api.ref },
        metricName: '5xx',
        namespace: 'AWS/ApiGateway',
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 0,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    const apiClientErrors = new Alarm(this, 'ApiClientErrors', {
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      metric: new Metric({
        dimensionsMap: { ApiId: api.ref },
        metricName: '4xx',
        namespace: 'AWS/ApiGateway',
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 20,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    const apiLatency = new Alarm(this, 'ApiLatency', {
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      metric: new Metric({
        dimensionsMap: { ApiId: api.ref },
        metricName: 'Latency',
        namespace: 'AWS/ApiGateway',
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 3_000,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    const distributionErrors = new Alarm(this, 'DistributionServerErrors', {
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      metric: new Metric({
        dimensionsMap: { DistributionId: distribution.distributionId, Region: 'Global' },
        metricName: '5xxErrorRate',
        namespace: 'AWS/CloudFront',
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    for (const alarm of [
      backendErrors,
      backendThrottles,
      apiClientErrors,
      apiErrors,
      apiLatency,
      distributionErrors,
    ]) {
      alarm.addAlarmAction(new SnsAction(alertTopic));
    }
    const dashboard = new Dashboard(this, 'OperationsDashboard', {
      dashboardName: `${prefix}-operations`,
    });
    dashboard.addWidgets(
      new GraphWidget({
        left: [backendErrors.metric, backendThrottles.metric, apiErrors.metric, apiLatency.metric],
        title: `${prefix} application health`,
      }),
      new GraphWidget({
        left: [apiClientErrors.metric, distributionErrors.metric],
        title: `${prefix} public edge`,
      }),
    );

    new CfnOutput(this, 'ApiEndpoint', { value: api.attrApiEndpoint });
    new CfnOutput(this, 'BackendFunctionName', { value: backend.ref });
    new CfnOutput(this, 'ContentBucketName', { value: contentBucket.bucketName });
    new CfnOutput(this, 'ResumeBucketName', { value: resumeBucket.bucketName });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'DistributionDomainName', { value: distribution.distributionDomainName });
    new CfnOutput(this, 'TableName', { value: table.tableName });
  }

  private functionAlarm(
    id: string,
    functionName: string,
    metricName: string,
    comparisonOperator: ComparisonOperator,
  ): Alarm {
    return new Alarm(this, id, {
      comparisonOperator,
      evaluationPeriods: 1,
      metric: new Metric({
        dimensionsMap: { FunctionName: functionName },
        metricName,
        namespace: 'AWS/Lambda',
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 0,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
  }
}
