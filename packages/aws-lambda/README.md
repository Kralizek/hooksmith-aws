# @hooksmith/aws-lambda

AWS Lambda hosting support for running Hooksmith event processing in Lambda
functions.

The package root stays deliberately small. It assumes the Lambda invocation
payload is already a Hooksmith `EventDocument`, hydrates it, and passes it to a
Hooksmith runtime.

```ts
import { createLambdaHandler } from "@hooksmith/aws-lambda";
import { createRuntime } from "@hooksmith/runtime";

const runtime = createRuntime(config, context);

export const handler = createLambdaHandler(runtime);
```

The handler returns the Hooksmith `RunReport` produced by `runtime.process()`.
Invalid event documents fail during Hooksmith hydration before the runtime is
invoked.

## AWS service triggers

Service-specific Lambda mechanics are exposed through subpaths without coupling
the package to `@hooksmith/aws`:

- `@hooksmith/aws-lambda/sqs` provides `createProcessor`, `RecordReader`, and the
  Lambda partial-batch response types. The processor owns record iteration and
  `batchItemFailures` handling.
- `@hooksmith/aws-lambda/sns` provides `createProcessor` and `RecordReader`. The
  processor owns the SNS record loop and fails the invocation when Hooksmith
  processing is unsuccessful.

Consumers supply the reader, typically `fromSqs` or `fromSns` from
`@hooksmith/aws`, and a function that processes the resulting `EventDocument`.
The dependency remains loose: custom readers can be used instead.

EventBridge delivers one event per invocation, so explicit composition remains
simpler than a dedicated processor.
