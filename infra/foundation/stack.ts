import { CfnOutput, Duration, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import { CfnSecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import { CfnCluster } from 'aws-cdk-lib/aws-ecs';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

import { type FoundationConfig, type FoundationOutputs, parseFoundationConfig } from './config.js';

export interface PreviewFoundationStackProps extends StackProps {
  readonly config: FoundationConfig;
}

export class PreviewFoundationStack extends Stack {
  public constructor(scope: Construct, id: string, props: PreviewFoundationStackProps) {
    super(scope, id, props);
    const config = parseFoundationConfig(props.config);

    Tags.of(this).add('fullstack-ts:application', config.applicationName);
    Tags.of(this).add('fullstack-ts:scope', 'permanent-preview-foundation');

    const vpc = new Vpc(this, 'PreviewVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });
    const cluster = new CfnCluster(this, 'PreviewCluster', {
      clusterName: `${config.applicationName}-preview`,
    });

    const taskSecurityGroup = new CfnSecurityGroup(this, 'PreviewTaskSecurityGroup', {
      groupDescription: 'Ingress for dynamically managed Caddy preview tasks',
      groupName: `${config.applicationName}-preview-tasks`,
      securityGroupEgress: [{ cidrIp: '0.0.0.0/0', ipProtocol: '-1' }],
      securityGroupIngress: [
        {
          cidrIp: '0.0.0.0/0',
          description: 'Public HTTP to Caddy',
          fromPort: 80,
          ipProtocol: 'tcp',
          toPort: 80,
        },
        {
          cidrIp: '0.0.0.0/0',
          description: 'Public HTTPS to Caddy',
          fromPort: 443,
          ipProtocol: 'tcp',
          toPort: 443,
        },
      ],
      vpcId: vpc.vpcId,
    });

    const frontendRepository = this.imageRepository('FrontendImages', config, 'frontend');
    const backendRepository = this.imageRepository('BackendImages', config, 'backend');

    const stateTable = new Table(this, 'PreviewState', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'previewKey', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
      tableName: `${config.applicationName}-preview-state`,
      timeToLiveAttribute: 'expiresAt',
    });

    const logGroup = new LogGroup(this, 'PreviewLogs', {
      logGroupName: `/fullstack-ts/${config.applicationName}/preview`,
      removalPolicy: RemovalPolicy.RETAIN,
      retention: RetentionDays.ONE_WEEK,
    });

    const taskExecutionRole = new Role(this, 'TaskExecutionRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Pulls preview images and writes container logs for Fargate',
      roleName: `${config.applicationName}-preview-task-execution`,
    });
    taskExecutionRole.addToPolicy(
      new PolicyStatement({ actions: ['ecr:GetAuthorizationToken'], resources: ['*'] }),
    );

    const taskRole = new Role(this, 'TaskRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Runtime identity for the disposable preview application task',
      roleName: `${config.applicationName}-preview-task`,
    });
    const previewEditorSecret = new Secret(this, 'PreviewEditorSecret', {
      description: 'Permanent reviewer identity injected into disposable preview seed jobs',
      generateSecretString: {
        excludePunctuation: true,
        generateStringKey: 'password',
        passwordLength: 32,
        secretStringTemplate: JSON.stringify({ email: 'preview-editor@tricoinc.com' }),
      },
    });
    previewEditorSecret.grantRead(taskExecutionRole);
    taskExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:BatchGetImage',
          'ecr:GetDownloadUrlForLayer',
        ],
        resources: [frontendRepository.repositoryArn, backendRepository.repositoryArn],
      }),
    );
    taskExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [`${logGroup.logGroupArn}:*`],
      }),
    );

    const previewZone = HostedZone.fromHostedZoneAttributes(this, 'PreviewZone', {
      hostedZoneId: config.previewZoneId,
      zoneName: config.previewZoneName,
    });

    const outputs: FoundationOutputs = {
      BackendRepositoryUri: backendRepository.repositoryUri,
      ClusterArn: cluster.attrArn,
      FrontendRepositoryUri: frontendRepository.repositoryUri,
      LogGroupName: logGroup.logGroupName,
      PreviewZoneId: previewZone.hostedZoneId,
      PreviewZoneName: previewZone.zoneName,
      PreviewEditorSecretArn: previewEditorSecret.secretArn,
      PublicSubnetIds: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','),
      StateTableName: stateTable.tableName,
      TaskExecutionRoleArn: taskExecutionRole.roleArn,
      TaskRoleArn: taskRole.roleArn,
      TaskSecurityGroupId: taskSecurityGroup.attrGroupId,
      VpcId: vpc.vpcId,
    };
    for (const [outputId, value] of Object.entries(outputs)) {
      new CfnOutput(this, outputId, { value });
    }
  }

  private imageRepository(
    id: string,
    config: FoundationConfig,
    role: 'backend' | 'frontend',
  ): Repository {
    return new Repository(this, id, {
      imageScanOnPush: true,
      imageTagMutability: TagMutability.IMMUTABLE,
      lifecycleRules: [
        {
          description: 'Expire preview images after fourteen days',
          maxImageAge: Duration.days(14),
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
      repositoryName: `${config.applicationName}-${role}`,
    });
  }
}
