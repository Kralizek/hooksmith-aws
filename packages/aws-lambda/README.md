# @hooksmith/aws-lambda

AWS Lambda hosting support for running Hooksmith event processing in Lambda
functions.

This package intentionally stays small. It assumes the Lambda invocation payload
is already a Hooksmith `EventDocument`, hydrates it, and passes it to a
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

`@hooksmith/aws-lambda` does not interpret SQS, SNS, EventBridge, S3, or other
AWS service envelopes. Consumers that need those mappings can combine the host
with [`@hooksmith/aws`](../aws) or provide their own Lambda wrapper before
calling the Hooksmith handler.

This keeps Lambda hosting independent from AWS service semantics and avoids
forcing `@hooksmith/aws` on applications whose Lambda payload is already a
Hooksmith event document.
