import { CfnOutput, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnAnomalySubscription } from 'aws-cdk-lib/aws-ce';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

import { type DeliveryConfig, parseDeliveryConfig } from './delivery-config.js';

export interface EdgeFoundationStackProps extends StackProps {
  readonly config: DeliveryConfig;
}

export class EdgeFoundationStack extends Stack {
  public constructor(scope: Construct, id: string, props: EdgeFoundationStackProps) {
    super(scope, id, props);
    const config = parseDeliveryConfig(props.config);
    Tags.of(this).add('trico:application', config.applicationName);
    Tags.of(this).add('trico:scope', 'edge-foundation');

    const parentZone = HostedZone.fromHostedZoneAttributes(this, 'ParentZone', {
      hostedZoneId: config.parentZoneId,
      zoneName: config.parentZoneName,
    });
    const devCertificate = new Certificate(this, 'DevCertificate', {
      domainName: config.devDomain,
      validation: CertificateValidation.fromDns(parentZone),
    });
    const productionCertificate = new Certificate(this, 'ProductionCertificate', {
      domainName: config.productionDomain,
      validation: CertificateValidation.fromDns(parentZone),
    });
    if (config.productionSubdomainDomain !== undefined) {
      const productionSubdomainCertificate = new Certificate(
        this,
        'ProductionSubdomainCertificate',
        {
          domainName: config.productionSubdomainDomain,
          validation: CertificateValidation.fromDns(parentZone),
        },
      );
      new CfnOutput(this, 'ProductionSubdomainCertificateArn', {
        value: productionSubdomainCertificate.certificateArn,
      });
    }
    new CfnAnomalySubscription(this, 'CostAnomalySubscription', {
      frequency: 'DAILY',
      monitorArnList: [config.costAnomalyMonitorArn],
      subscribers: [{ address: config.alertEmail, type: 'EMAIL' }],
      subscriptionName: `${config.applicationName}-daily-cost-anomalies`,
      threshold: 5,
    });

    new CfnOutput(this, 'DevCertificateArn', { value: devCertificate.certificateArn });
    new CfnOutput(this, 'ProductionCertificateArn', {
      value: productionCertificate.certificateArn,
    });
  }
}
