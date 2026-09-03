# @hooksmith/aws

AWS integrations for Hooksmith, with event adapters and listeners for AWS
services.

This package does not host the Hooksmith runtime. Lambda hosting support lives
in [`@hooksmith/aws-lambda`](../aws-lambda).

AWS integrations are exposed through focused subpaths so consumers only load the
dependencies they actually use:

- `@hooksmith/aws/sqs`
- `@hooksmith/aws/sns`
- `@hooksmith/aws/eventbridge`
- `@hooksmith/aws/lambda`
- `@hooksmith/aws/pipeline/lambda`

The package root contains only shared AWS integration types.

## Event adapters

AWS envelopes are mapped to Hooksmith event documents. The service payload
becomes `event.data`, while fields with direct Hooksmith equivalents are
promoted to the event itself.

For SQS and SNS, sender-defined message attributes are promoted to top-level
Hooksmith `event.metadata` so application metadata remains easy to consume.
AWS-owned envelope and transport information is kept under `metadata.sqs` or
`metadata.sns`. Those service keys are reserved; an SQS message attribute named
`sqs` or an SNS message attribute named `sns` is rejected rather than silently
overwriting transport metadata.

```ts
import { fromEventBridge } from "@hooksmith/aws/eventbridge";
import { fromSns } from "@hooksmith/aws/sns";
import { fromSqs } from "@hooksmith/aws/sqs";

const sqsEvent = fromSqs(sqsMessage);
const snsEvent = fromSns(snsNotification);
const eventBridgeEvent = fromEventBridge(eventBridgePayload);
```

`fromSqsRaw` and `fromSnsRaw` cover raw delivery where the transported payload
is already a complete Hooksmith `EventDocument`.

```ts
import { fromSnsRaw } from "@hooksmith/aws/sns";
import { fromSqsRaw } from "@hooksmith/aws/sqs";

const sqsEvent = fromSqsRaw(sqsMessage);
const snsEvent = fromSnsRaw(rawPayload);
```

The raw adapters validate the basic Hooksmith event-document shape instead of
inventing event metadata from an envelope that is no longer present.

## Listeners

The package provides listeners for common event-oriented AWS services:

- `sendSqsMessage` from `@hooksmith/aws/sqs`
- `publishSnsMessage` from `@hooksmith/aws/sns`
- `putEventBridgeEvent` from `@hooksmith/aws/eventbridge`
- `invokeLambdaFunction` from `@hooksmith/aws/lambda`

Listener payloads default to `event.data` and can be static or resolved from the
current event and Hooksmith context.

```ts
import { sendSqsMessage } from "@hooksmith/aws/sqs";

const listener = sendSqsMessage({
  queueUrl: Deno.env.get("QUEUE_URL")!,
});
```

Lambda invocation listeners are asynchronous sinks. They always use AWS
`InvocationType: "Event"`; synchronous request/response invocation is outside
the listener abstraction.

Each listener exposes relevant native AWS SDK input fields through `input` (or
`entry` for EventBridge). Explicit Hooksmith-friendly options and fixed listener
semantics cannot be overridden through the native escape hatch.

## Pipeline transformations

`lambda()` from `@hooksmith/aws/pipeline/lambda` turns a synchronous Lambda
invocation into a Hooksmith pipeline transformation.

```ts
import { lambda } from "@hooksmith/aws/pipeline/lambda";
import { pipe } from "@hooksmith/pipeline";

const listener = pipe(
  lambda<Input, Output>({
    functionName: "enrich-order",
  }),
  terminalListener,
);
```

The transformer always uses `InvocationType: "RequestResponse"`. It serializes
the current pipeline value as JSON and requires the Lambda response payload to
contain valid JSON for the next pipeline value. Function errors, non-200 status
codes, missing payloads, and invalid JSON fail the transformation.

The pipeline integration is isolated behind its own subpath. Consumers that use
only the AWS adapters/listeners do not import `@hooksmith/pipeline`, and
consumers that do not use Lambda do not import the Lambda SDK through this
integration.

As with the listeners, use `clientConfig` for normal SDK customization or inject
a compatible client through `client` for custom credentials, LocalStack, or
another endpoint. Native invocation fields can be supplied through `input`, but
`FunctionName`, `Payload`, and `InvocationType` are owned by the transformer.

AWS credentials and region use the normal AWS SDK credential and configuration
resolution unless a custom client or client configuration is supplied.
