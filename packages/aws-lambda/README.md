# @hooksmith/aws-lambda

AWS Lambda hosting support for running Hooksmith event processing in Lambda
functions.

The package root exposes the common Hooksmith processor plus the raw Lambda
handler. `createProcessor(runtime)` always turns a Hooksmith runtime into an
`EventDocument` processor. `createHandler(processor)` is the raw Lambda handler
for invocations whose payload is already a Hooksmith `EventDocument`.

```ts
import { createHandler, createProcessor } from "@hooksmith/aws-lambda";
import { createRuntime } from "@hooksmith/runtime";

const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(processor);
```

The processor hydrates the event document and returns the Hooksmith `RunReport`
produced by `runtime.process()`. Invalid event documents fail during hydration
before the runtime is invoked.

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

## AWS service triggers

Service-specific Lambda mechanics are exposed through subpaths without coupling
the package to `@hooksmith/aws`:

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
