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

## AWS service triggers

Service-specific Lambda mechanics are exposed through subpaths without coupling
the package to `@hooksmith/aws`:

- `@hooksmith/aws-lambda/sqs` provides `createHandler`, `RecordReader`, and the
  Lambda partial-batch response types. The handler owns record iteration and
  `batchItemFailures` handling.
- `@hooksmith/aws-lambda/sns` provides `createHandler` and `RecordReader`. The
  handler owns the SNS record loop and fails the invocation when Hooksmith
  processing is unsuccessful.
- `@hooksmith/aws-lambda/eventbridge` provides `createHandler` and
  `EventReader`. The handler adapts one EventBridge event and fails the
  invocation when Hooksmith processing is unsuccessful.

Consumers supply the reader, typically `fromSqs`, `fromSns`, or
`fromEventBridge` from `@hooksmith/aws`, plus the common processor:

```ts
import { fromSqs } from "@hooksmith/aws/sqs";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createHandler } from "@hooksmith/aws-lambda/sqs";

const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(fromSqs, processor);
```

The dependency remains loose: custom readers can be used instead.
