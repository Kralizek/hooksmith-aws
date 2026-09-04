# Outbound AWS listeners

This example shows a Hooksmith configuration enriching an event from AWS before
sending the same event to two AWS services: SQS and EventBridge.

The configuration runs two enrichers before routing:

- `getCallerIdentityEnrichment()` calls STS and adds the standard caller
  identity under `metadata.sts`.
- `getParameterEnrichment()` reads an SSM parameter and maps its value to
  `metadata.tenantPlan`.

After enrichment, the route sends the event to SQS and EventBridge. It
intentionally uses only two listeners so the routing shape stays easy to read;
SNS publishing and Lambda invocation follow the same pattern through
`@hooksmith/aws/sns` and `@hooksmith/aws/lambda`.

Set these environment variables before running the configuration:

- `TENANT_PLAN_PARAMETER` — SSM parameter containing the tenant plan.
- `ORDER_QUEUE_URL` — target SQS queue URL.
- `EVENT_BUS_NAME` — optional EventBridge bus name; defaults to `default`.

## AWS client configuration

The enrichers and listeners use the normal AWS SDK credential and region
resolution by default. You can override SDK configuration directly:

```ts
sendSqsMessage({
  queueUrl,
  clientConfig: {
    region: "eu-north-1",
  },
});
```

For complete control, create and inject the AWS SDK client yourself. This is
useful for custom credentials, LocalStack, or another endpoint:

```ts
import { SQSClient } from "@aws-sdk/client-sqs";
import { sendSqsMessage } from "@hooksmith/aws/sqs";

const client = new SQSClient({
  region: "eu-north-1",
  endpoint: "http://localhost:4566",
});

sendSqsMessage({
  queueUrl,
  client,
});
```

The same `clientConfig`/`client` pattern is available on the AWS service
enrichers and listeners.
