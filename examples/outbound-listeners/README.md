# Outbound AWS listeners

This example shows a Hooksmith route sending the same event to two AWS services: SQS and EventBridge. It intentionally uses only two listeners so the routing shape stays easy to read; SNS publishing and Lambda invocation follow the same pattern through `@hooksmith/aws/sns` and `@hooksmith/aws/lambda`.

Set these environment variables before running the configuration:

- `ORDER_QUEUE_URL` — target SQS queue URL.
- `EVENT_BUS_NAME` — optional EventBridge bus name; defaults to `default`.

## AWS client configuration

The listeners use the normal AWS SDK credential and region resolution by default. You can override SDK configuration directly:

```ts
sendSqsMessage({
  queueUrl,
  clientConfig: {
    region: "eu-north-1",
  },
});
```

For complete control, create and inject the AWS SDK client yourself. This is useful for custom credentials, LocalStack, or another endpoint:

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

The same `clientConfig`/`client` pattern is available on the SNS, EventBridge, and Lambda listeners.
