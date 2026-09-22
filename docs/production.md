# Dev and production delivery

`TricoWeb-dev` and `TricoWeb-prod` are separate permanent application stacks. Each owns one on-demand DynamoDB table with TTL/PITR/GSI, one private versioned content bucket, one CloudFront distribution, one image-based Lambda behind HTTP API Gateway, one disabled-by-default EventBridge sync schedule, narrowly scoped SES/Bedrock/data permissions, retained logs and Lambda error/throttle alarms.

Production durable resources use retain policies. Dev resources use destroy policies but do not auto-delete bucket objects. Neither stack creates a hosted zone or validates an SES identity. CloudFront provides the public endpoint; a custom domain and DNS activation require an independently validated hosted-zone/certificate enrollment.

The `Application deployment` workflow runs the full repository gate and then synthesizes the selected stack under its GitHub environment OIDC identity. Required variables in both `dev` and `prod` environments are:

- `AWS_REGION`
- `APPLICATION_DEPLOY_ROLE_ARN`
- `BACKEND_REPOSITORY_URI`
- `RELEASE_ARTIFACT_BUCKET`
- `PUBLIC_ORIGIN` (the environment's final HTTPS origin)
- `CUSTOM_DOMAIN`, `HOSTED_ZONE_ID`, and `HOSTED_ZONE_NAME`
- `CLOUDFRONT_CERTIFICATE_ARN` (an ACM certificate in `us-east-1`)
- `SES_IDENTITY_DOMAIN`
- `BEDROCK_MODEL_ID`
- `ALERT_TOPIC_ARN`

The workflow derives one `RELEASE_SHA`, runs the complete repository gate, publishes the dev Lambda image and frontend archive, then writes a strict manifest containing the exact digest, object key and checksum. Both development and production validate and consume that manifest. Production dispatch requires an explicit tested main-branch SHA and contains no application build or artifact publication path. Before a production mutation it creates a DynamoDB backup when an existing table is present.

Required environment configuration is `AWS_REGION`, `APPLICATION_DEPLOY_ROLE_ARN`, `BACKEND_REPOSITORY_URI`, `RELEASE_ARTIFACT_BUCKET`, `PUBLIC_ORIGIN`, `CUSTOM_DOMAIN`, `HOSTED_ZONE_ID`, `HOSTED_ZONE_NAME`, `CLOUDFRONT_CERTIFICATE_ARN`, `SES_IDENTITY_DOMAIN`, `BEDROCK_MODEL_ID`, `ALERT_TOPIC_ARN`, `REVIEWER_EMAIL`, and the protected `REVIEWER_PASSWORD` secret. `APPLICATION_DEPLOY_ENABLED` is a repository variable and remains absent or false until enrollment is complete. The CloudFront certificate must be in `us-east-1`.

Normal self-registration remains restricted to `@tricoinc.com`. A protected environment may set `REVIEWER_EMAIL` to one exact external bootstrap operator; the seed path accepts only that configured address and the environment-specific password must not be reused.

The release policy is PR preview → merge-to-main dev → approved production promotion of the same SHA-addressed backend digest and frontend archive. Bootstrap is idempotent and refuses nonmatching existing seed state; the versioned content bucket and pre-release DynamoDB backup retain recovery points. External EventBridge synchronization stays disabled until dev soak proves the selected Bedrock Responses-compatible model and required managed web-search permissions.
