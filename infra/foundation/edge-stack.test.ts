import test from 'node:test';

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { exampleDeliveryConfig } from './delivery-config.js';
import { EdgeFoundationStack } from './edge-stack.js';

test('edge foundation creates separate DNS-validated dev and production certificates', () => {
  const template = Template.fromStack(
    new EdgeFoundationStack(new App(), 'TestEdgeFoundation', {
      config: exampleDeliveryConfig,
    }),
  );
  template.resourceCountIs('AWS::CertificateManager::Certificate', 2);
  template.resourceCountIs('AWS::CE::AnomalyMonitor', 0);
  template.resourceCountIs('AWS::CE::AnomalySubscription', 1);
  template.hasResourceProperties('AWS::CE::AnomalySubscription', {
    MonitorArnList: [exampleDeliveryConfig.costAnomalyMonitorArn],
  });
  template.hasResourceProperties('AWS::CertificateManager::Certificate', {
    DomainName: 'dev.trico.example.com',
    ValidationMethod: 'DNS',
  });
  template.hasResourceProperties('AWS::CertificateManager::Certificate', {
    DomainName: 'trico.example.com',
    ValidationMethod: 'DNS',
  });
});

test('edge foundation adds a production subdomain certificate without replacing production', () => {
  const template = Template.fromStack(
    new EdgeFoundationStack(new App(), 'TestEdgeFoundationSubdomain', {
      config: {
        ...exampleDeliveryConfig,
        productionSubdomainDomain: 'prod.trico.example.com',
      },
    }),
  );
  template.resourceCountIs('AWS::CertificateManager::Certificate', 3);
  template.hasResourceProperties('AWS::CertificateManager::Certificate', {
    DomainName: 'trico.example.com',
    ValidationMethod: 'DNS',
  });
  template.hasResourceProperties('AWS::CertificateManager::Certificate', {
    DomainName: 'prod.trico.example.com',
    ValidationMethod: 'DNS',
  });
  template.hasOutput('ProductionSubdomainCertificateArn', {});
});
