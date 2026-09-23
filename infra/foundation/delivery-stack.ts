import { CfnOutput, Duration, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import { CfnAnalyzer } from 'aws-cdk-lib/aws-accessanalyzer';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import { ReadWriteType, Trail } from 'aws-cdk-lib/aws-cloudtrail';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import {
  AccountPrincipal,
  Effect,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  ServicePrincipal,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import {
  CfnRecordSet,
  HostedZone,
  PublicHostedZone,
  TxtRecord,
  ZoneDelegationRecord,
} from 'aws-cdk-lib/aws-route53';
import { BlockPublicAccess, Bucket, BucketEncryption, type IBucket } from 'aws-cdk-lib/aws-s3';
import { CfnEmailIdentity } from 'aws-cdk-lib/aws-ses';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import type { Construct } from 'constructs';

import { type DeliveryConfig, parseDeliveryConfig } from './delivery-config.js';

export interface DeliveryFoundationStackProps extends StackProps {
  readonly config: DeliveryConfig;
}

type DeploymentEnvironment = 'preview' | 'dev' | 'prod';

export class DeliveryFoundationStack extends Stack {
  public constructor(scope: Construct, id: string, props: DeliveryFoundationStackProps) {
    super(scope, id, props);
    const config = parseDeliveryConfig(props.config);

    Tags.of(this).add('trico:application', config.applicationName);
    Tags.of(this).add('trico:scope', 'delivery-foundation');

    const parentZone = HostedZone.fromHostedZoneAttributes(this, 'ParentZone', {
      hostedZoneId: config.parentZoneId,
      zoneName: config.parentZoneName,
    });
    const previewZone = new PublicHostedZone(this, 'PreviewZone', {
      zoneName: config.previewZoneName,
    });
    const previewNameServers = previewZone.hostedZoneNameServers;
    if (previewNameServers === undefined) throw new Error('preview zone nameservers are required');
    new ZoneDelegationRecord(this, 'PreviewZoneDelegation', {
      nameServers: previewNameServers,
      recordName: config.previewZoneName,
      ttl: Duration.minutes(5),
      zone: parentZone,
    });

    const releaseRepository = new Repository(this, 'ReleaseBackendRepository', {
      imageScanOnPush: true,
      imageTagMutability: TagMutability.IMMUTABLE,
      lifecycleRules: [
        {
          description: 'Expire release images after the selected rollback window',
          maxImageAge: Duration.days(config.releaseRetentionDays),
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
      repositoryName: `${config.applicationName}-release-backend`,
    });
    const releaseBucket = new Bucket(this, 'ReleaseArtifactBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: Duration.days(7),
          expiration: Duration.days(config.releaseRetentionDays),
          noncurrentVersionExpiration: Duration.days(config.releaseRetentionDays),
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });

    const auditBucket = new Bucket(this, 'AccountAuditBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: Duration.days(7),
          expiration: Duration.days(config.releaseRetentionDays),
          noncurrentVersionExpiration: Duration.days(config.releaseRetentionDays),
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });
    new Trail(this, 'AccountManagementTrail', {
      // CDK's concrete Bucket carries an exact-optional isWebsite property that its
      // own Trail IBucket surface currently types as required.
      bucket: auditBucket as unknown as IBucket,
      enableFileValidation: true,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      managementEvents: ReadWriteType.ALL,
      trailName: `${config.applicationName}-account-management`,
    });
    const accessAnalyzer = new CfnAnalyzer(this, 'AccountAccessAnalyzer', {
      analyzerName: `${config.applicationName}-account-access`,
      type: 'ACCOUNT',
    });

    const alerts = new Topic(this, 'OperationsAlerts', {
      displayName: 'TriCo infrastructure alerts',
      topicName: `${config.applicationName}-operations`,
    });
    alerts.addToResourcePolicy(
      new PolicyStatement({
        actions: ['sns:Publish'],
        principals: [
          new ServicePrincipal('budgets.amazonaws.com'),
          new ServicePrincipal('cloudwatch.amazonaws.com'),
        ],
        resources: [alerts.topicArn],
      }),
    );
    alerts.addSubscription(new EmailSubscription(config.alertEmail));
    new CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetLimit: { amount: config.monthlyBudgetUsd, unit: 'USD' },
        budgetName: `${config.applicationName}-monthly`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
      },
      notificationsWithSubscribers: [50, 80, 100].map((threshold) => ({
        notification: {
          comparisonOperator: 'GREATER_THAN',
          notificationType: 'ACTUAL',
          threshold,
          thresholdType: 'PERCENTAGE',
        },
        subscribers: [{ subscriptionType: 'SNS', address: alerts.topicArn }],
      })),
    });

    const identity = new CfnEmailIdentity(this, 'SesIdentity', {
      emailIdentity: config.sesIdentityDomain,
      dkimAttributes: { signingEnabled: true },
    });
    for (const [index, name, value] of [
      ['One', identity.attrDkimDnsTokenName1, identity.attrDkimDnsTokenValue1],
      ['Two', identity.attrDkimDnsTokenName2, identity.attrDkimDnsTokenValue2],
      ['Three', identity.attrDkimDnsTokenName3, identity.attrDkimDnsTokenValue3],
    ] as const) {
      new CfnRecordSet(this, `SesDkim${index}`, {
        hostedZoneId: parentZone.hostedZoneId,
        name,
        resourceRecords: [value],
        ttl: '300',
        type: 'CNAME',
      });
    }
    new TxtRecord(this, 'SesSpf', {
      recordName: config.sesIdentityDomain,
      values: ['v=spf1 include:amazonses.com ~all'],
      zone: parentZone,
    });
    new TxtRecord(this, 'SesDmarc', {
      recordName: `_dmarc.${config.sesIdentityDomain}`,
      values: [`v=DMARC1; p=none; rua=mailto:${config.alertEmail}`],
      zone: parentZone,
    });

    const oidc = new OpenIdConnectProvider(this, 'GitHubOidc', {
      clientIds: ['sts.amazonaws.com'],
      url: 'https://token.actions.githubusercontent.com',
    });
    const ownerRole = new Role(this, 'FoundationOwnerRole', {
      assumedBy: new AccountPrincipal(this.account).withConditions({
        Bool: { 'aws:MultiFactorAuthPresent': 'true' },
      }),
      description: 'Human-controlled role for permanent TriCo foundation changes',
      roleName: `${config.applicationName}-delivery-foundation-owner`,
    });
    ownerRole.addToPolicy(
      new PolicyStatement({
        actions: ['cloudformation:*', 'iam:*', 'route53:*', 'acm:*', 'ses:*'],
        effect: Effect.ALLOW,
        resources: ['*'],
      }),
    );

    const roles = new Map<DeploymentEnvironment, Role>();
    const [repositoryOwner, repositoryName] = config.repository.split('/');
    const repositorySubject = `${repositoryOwner}@${config.repositoryOwnerId}/${repositoryName}@${config.repositoryId}`;
    for (const environment of ['preview', 'dev', 'prod'] as const) {
      const role = new Role(this, `${environment}DeploymentRole`, {
        assumedBy: new WebIdentityPrincipal(oidc.openIdConnectProviderArn, {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': `repo:${repositorySubject}:environment:${environment}`,
          },
        }),
        description: `GitHub ${environment} deployment role for ${config.repository}`,
        roleName: `${config.applicationName}-${environment}-github`,
      });
      roles.set(environment, role);
    }

    const previewRole = roles.get('preview');
    const devRole = roles.get('dev');
    const prodRole = roles.get('prod');
    if (previewRole === undefined || devRole === undefined || prodRole === undefined) {
      throw new Error('deployment roles are required');
    }
    this.grantPreviewPermissions(previewRole, config, previewZone.hostedZoneArn);
    alerts.grantPublish(previewRole);
    this.grantApplicationPermissions(devRole, 'dev', releaseRepository, releaseBucket);
    this.grantApplicationPermissions(prodRole, 'prod', releaseRepository, releaseBucket);

    new CfnOutput(this, 'AlertTopicArn', { value: alerts.topicArn });
    new CfnOutput(this, 'AuditBucketName', { value: auditBucket.bucketName });
    new CfnOutput(this, 'AccessAnalyzerArn', { value: accessAnalyzer.attrArn });
    new CfnOutput(this, 'DevDeploymentRoleArn', { value: devRole.roleArn });
    new CfnOutput(this, 'FoundationOwnerRoleArn', { value: ownerRole.roleArn });
    new CfnOutput(this, 'PreviewDeploymentRoleArn', { value: previewRole.roleArn });
    new CfnOutput(this, 'PreviewZoneId', { value: previewZone.hostedZoneId });
    new CfnOutput(this, 'PreviewZoneName', { value: previewZone.zoneName });
    new CfnOutput(this, 'ProdDeploymentRoleArn', { value: prodRole.roleArn });
    new CfnOutput(this, 'ReleaseArtifactBucketOutput', { value: releaseBucket.bucketName });
    new CfnOutput(this, 'ReleaseBackendRepositoryUriOutput', {
      value: releaseRepository.repositoryUri,
    });
  }

  private grantPreviewPermissions(role: Role, config: DeliveryConfig, zoneArn: string): void {
    role.addToPolicy(
      new PolicyStatement({
        actions: [
          'cloudformation:DescribeStacks',
          'dynamodb:DeleteItem',
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:Scan',
          'dynamodb:UpdateItem',
          'ec2:DescribeNetworkInterfaces',
          'ecr:BatchCheckLayerAvailability',
          'ecr:CompleteLayerUpload',
          'ecr:DescribeImages',
          'ecr:GetAuthorizationToken',
          'ecr:InitiateLayerUpload',
          'ecr:PutImage',
          'ecr:UploadLayerPart',
          'ecs:DeregisterTaskDefinition',
          'ecs:DescribeTasks',
          'ecs:ListTagsForResource',
          'ecs:RegisterTaskDefinition',
          'ecs:RunTask',
          'ecs:StopTask',
          'ecs:TagResource',
          'iam:PassRole',
          'secretsmanager:GetSecretValue',
        ],
        resources: ['*'],
      }),
    );
    role.addToPolicy(
      new PolicyStatement({
        actions: ['ecr:DescribeImageScanFindings'],
        resources: ['backend', 'frontend'].map((image) =>
          this.formatArn({
            service: 'ecr',
            resource: 'repository',
            resourceName: `${config.applicationName}-${image}`,
          }),
        ),
      }),
    );
    role.addToPolicy(
      new PolicyStatement({
        actions: ['route53:ChangeResourceRecordSets', 'route53:GetChange'],
        resources: [zoneArn, 'arn:aws:route53:::change/*'],
      }),
    );
    role.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          this.formatArn({
            service: 'logs',
            resource: 'log-group',
            resourceName: `/fullstack-ts/${config.applicationName}/preview:*`,
          }),
        ],
      }),
    );
  }

  private grantApplicationPermissions(
    role: Role,
    environment: 'dev' | 'prod',
    repository: Repository,
    bucket: Bucket,
  ): void {
    repository.grantPull(role);
    role.addToPolicy(
      new PolicyStatement({
        actions: ['ecr:DescribeImageScanFindings'],
        resources: [repository.repositoryArn],
      }),
    );
    bucket.grantRead(role, 'releases/*');
    if (environment === 'dev') {
      repository.grantPush(role);
      role.addToPolicy(
        new PolicyStatement({
          actions: ['ecr:DescribeImages'],
          resources: [repository.repositoryArn],
        }),
      );
      bucket.grantPut(role, 'releases/*');
    }
    role.addToPolicy(
      new PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          this.formatArn({
            service: 'ssm',
            resource: 'parameter',
            resourceName: 'cdk-bootstrap/hnb659fds/version',
          }),
        ],
      }),
    );
    role.addToPolicy(
      new PolicyStatement({
        actions: [
          'cloudformation:CreateChangeSet',
          'cloudformation:CreateStack',
          'cloudformation:DeleteChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DescribeStacks',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:GetTemplate',
          'cloudformation:UpdateStack',
        ],
        resources: [
          this.formatArn({
            service: 'cloudformation',
            resource: 'stack',
            resourceName: `TricoWeb-${environment}/*`,
          }),
        ],
      }),
    );
    role.addToPolicy(
      new PolicyStatement({
        actions: [
          'apigateway:*',
          'cloudfront:*',
          'cloudwatch:*',
          'dynamodb:*',
          'events:*',
          'iam:GetRole',
          'iam:GetRolePolicy',
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:DeleteRolePolicy',
          'iam:PassRole',
          'iam:PutRolePolicy',
          'iam:TagRole',
          'iam:UntagRole',
          'iam:UpdateAssumeRolePolicy',
          'lambda:*',
          'logs:*',
          'route53:ChangeResourceRecordSets',
          'route53:GetChange',
          's3:*',
        ],
        resources: ['*'],
      }),
    );
    if (environment === 'prod') {
      role.addToPolicy(
        new PolicyStatement({ actions: ['dynamodb:CreateBackup'], resources: ['*'] }),
      );
    }
  }
}
