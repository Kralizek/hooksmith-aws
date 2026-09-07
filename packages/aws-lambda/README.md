# @hooksmith/aws-lambda

AWS Lambda hosting support for running Hooksmith event processing in Lambda
functions.

The package root exposes the common Hooksmith processor, the raw Lambda handler,
and Lambda-host enrichment. `createProcessor(runtime)` always turns a Hooksmith
runtime into an `EventDocument` processor. `createHandler(processor)` is the raw
Lambda handler for invocations whose payload is already a Hooksmith
`EventDocument`.

```ts
import { createHandler, createProcessor } from "@hooksmith/aws-lambda";
import { createRuntime } from "@hooksmith/runtime";

const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(processor);
```

The processor hydrates the event document and returns the Hooksmith `RunReport`
produced by `runtime.process()`. Invalid event documents fail during hydration
before the runtime is invoked.

## Lambda environment enrichment

`lambdaEnvironmentEnrichment()` adds execution-environment metadata before
routing. By default it writes under `metadata.aws`:

```ts
import { lambdaEnvironmentEnrichment } from "@hooksmith/aws-lambda";

export default {
  enrichers: [lambdaEnvironmentEnrichment()],
  routes: [
    // conditions can inspect the enriched metadata
  ],
};
```

The default enrichment includes the AWS region plus Lambda function name,
version, memory size, execution environment, log group/stream, and X-Ray trace
header when those environment variables are available.

Use `map` when a different metadata shape is preferred:

```ts
lambdaEnvironmentEnrichment({
  map: (_event, environment) => ({
    metadata: {
      region: environment.region,
      functionName: environment.functionName,
    },
  }),
});
```

This enricher only uses information available to the current Lambda execution
environment. AWS service lookups such as STS caller identity or invoking another
Lambda for enrichment live in `@hooksmith/aws` instead.

## Function contracts

The package root exports the structural function types used by all Lambda
handlers:

- `EventProcessor<TData>` processes a Hooksmith `EventDocument` and returns a
  `RunReport`.
- `EventReader<TInput, TData>` converts an input shape into a Hooksmith
  `EventDocument`, synchronously or asynchronously.
- `LambdaHandler<TInput, TOutput>` describes the Lambda entry point produced by
  a handler factory.

TypeScript structural typing means custom readers and handlers do not need to
implement a framework interface. Functions with compatible signatures satisfy
the contracts directly. Consumers can use these types as guidelines when
building handlers for trigger shapes that Hooksmith does not provide.

## HTTP API Gateway

`@hooksmith/aws-lambda/api-gateway` hosts Hooksmith behind API Gateway HTTP API
payload format v2. It converts the AWS event into the shared
`HttpIngressRequest` shape from `@hooksmith/core/ingress`, preserving raw body
bytes for reusable webhook mappers and signature verification.

```ts
import { createProcessor } from "@hooksmith/aws-lambda";
import { createApiGatewayHandler } from "@hooksmith/aws-lambda/api-gateway";
import { createRuntime } from "@hooksmith/runtime";

const processor = createProcessor(createRuntime(config, context));

export const handler = createApiGatewayHandler(processor, {
  ingressMapper: ({ request }) => ({
    type: "webhook.received",
    timestamp: new Date().toISOString(),
    source: { kind: "webhook" },
    data: JSON.parse(new TextDecoder().decode(request.body)),
  }),
});
```

Without an ingress mapper, the request body is treated as a Hooksmith event
document directly. Mapper or request-decoding failures return HTTP 400; runtime
processing exceptions return HTTP 500. Completed Hooksmith reports return HTTP
200 regardless of their `success` value.

## AWS service triggers

Service-specific Lambda mechanics are exposed through subpaths without coupling
the package to `@hooksmith/aws`:

- `@hooksmith/aws-lambda/api-gateway` provides `createApiGatewayHandler` and the
  HTTP API v2 event/result shapes used by the host.
- `@hooksmith/aws-lambda/sqs` provides `createHandler` and the Lambda
  partial-batch response types. The handler owns record iteration and
  `batchItemFailures` handling. Reader or processor exceptions are logged
  through the supplied Hooksmith `Context` by default. An optional
  `onRecordError` hook can override that behavior and receives the same context
  while preserving partial-batch semantics.
- `@hooksmith/aws-lambda/sns` provides `createHandler`. The handler owns the SNS
  record loop and fails the invocation when Hooksmith processing is
  unsuccessful. Failures include the SNS message and topic identifiers in the
  error cause.
- `@hooksmith/aws-lambda/eventbridge` provides `createHandler`. The handler
  adapts one EventBridge event and fails the invocation when Hooksmith
  processing is unsuccessful.

Consumers supply the reader, typically `fromSqs`, `fromSns`, or
`fromEventBridge` from `@hooksmith/aws`, plus the common processor:

```ts
import { fromSqs } from "@hooksmith/aws/sqs";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createHandler } from "@hooksmith/aws-lambda/sqs";

const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(fromSqs, processor, context);
```

The dependency remains loose: custom readers can be used instead.
