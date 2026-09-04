# hooksmith-aws

AWS integrations for [Hooksmith](https://github.com/Kralizek/hooksmith).

The repository covers four complementary concerns:

- adapting AWS events into Hooksmith events;
- invoking AWS services from Hooksmith listeners and pipeline transformations;
- enriching Hooksmith events from AWS services before routing;
- hosting reusable Hooksmith runtimes inside AWS Lambda.

## Packages

| Package | Purpose |
| --- | --- |
| [`@hooksmith/aws`](https://jsr.io/@hooksmith/aws) | AWS event adapters, service listeners, enrichers, and pipeline transformations. |
| [`@hooksmith/aws-lambda`](https://jsr.io/@hooksmith/aws-lambda) | AWS Lambda hosting support for Hooksmith runtimes. |

`@hooksmith/aws` contains integration primitives and depends only on the Hooksmith contracts and pipeline APIs it needs. `@hooksmith/aws-lambda` is the hosting package and can depend on `@hooksmith/runtime` without forcing that dependency on consumers that only need AWS integrations.

## `@hooksmith/aws`

The package exposes service-oriented subpaths so consumers can import only the integration surface they need:

```text
@hooksmith/aws
@hooksmith/aws/eventbridge
@hooksmith/aws/lambda
@hooksmith/aws/pipeline/lambda
@hooksmith/aws/sns
@hooksmith/aws/sqs
@hooksmith/aws/ssm
@hooksmith/aws/sts
```

### Event adapters

AWS envelopes can be converted into Hooksmith `EventDocument` values before they enter the runtime.

Available adapters include:

- `fromSqs()` / `fromSqsRaw()` from `@hooksmith/aws/sqs`;
- `fromSns()` / `fromSnsRaw()` from `@hooksmith/aws/sns`;
- `fromEventBridge()` from `@hooksmith/aws/eventbridge`.

Service payloads become `event.data`, while AWS envelope information is preserved in event metadata. SQS and SNS message attributes are promoted to top-level Hooksmith metadata, with transport-specific fields kept under their service namespaces.

```ts
import { fromSqs } from "@hooksmith/aws/sqs";

const event = fromSqs(record);
```

### Listeners

Hooksmith routes can send events to AWS services using listeners:

- `sendSqsMessage()`;
- `publishSnsMessage()`;
- `putEventBridgeEvent()`;
- `invokeLambdaFunction()`.

Listener payloads default to `event.data` and can be static or resolved from the current event and Hooksmith context. Relevant native AWS SDK input fields are exposed through service-specific escape hatches.

```ts
import { sendSqsMessage } from "@hooksmith/aws/sqs";

const listener = sendSqsMessage({
  queueUrl: Deno.env.get("QUEUE_URL")!,
});
```

Lambda listeners use asynchronous invocation (`InvocationType: "Event"`), preserving the listener abstraction as a terminal side effect.

### Pipeline transformations

`@hooksmith/aws/pipeline/lambda` exposes synchronous Lambda invocation as a Hooksmith transformer. The returned Lambda payload becomes the next pipeline value.

```ts
import { lambda } from "@hooksmith/aws/pipeline/lambda";
import { pipe, project } from "@hooksmith/pipeline";

const listener = pipe(
  project(toRequest),
  lambda({ functionName: "transform-request" }),
  project(toNotification),
  terminalListener,
);
```

The transformer uses `InvocationType: "RequestResponse"` and fails on function errors, non-200 invocation status codes, missing payloads, or invalid JSON.

### Event enrichers

AWS enrichers run before routing and add metadata to the current Hooksmith event.

Available enrichers include:

- `invokeLambdaEnrichment()` from `@hooksmith/aws/lambda`;
- `getParameterEnrichment()` from `@hooksmith/aws/ssm`;
- `getCallerIdentityEnrichment()` from `@hooksmith/aws/sts`.

```ts
import { getParameterEnrichment } from "@hooksmith/aws/ssm";
import { getCallerIdentityEnrichment } from "@hooksmith/aws/sts";

export default {
  enrichers: [
    getCallerIdentityEnrichment(),
    getParameterEnrichment({
      parameterName: "/example/tenant-plan",
      map: (_event, response) => ({
        metadata: {
          tenantPlan: response.Parameter?.Value,
        },
      }),
    }),
  ],
  routes: [
    // Conditions and listeners see the enriched event.
  ],
};
```

`getCallerIdentityEnrichment()` provides the standard `metadata.sts` shape with `account`, `arn`, and `userId`. SSM and synchronous Lambda enrichment require explicit mapping because their responses do not have one universal Hooksmith metadata shape.

All AWS listeners, transformers, and service enrichers follow the same customization pattern where applicable: use `clientConfig` for normal SDK configuration or inject a compatible `client` for tests, custom credentials, LocalStack, or another endpoint.

## `@hooksmith/aws-lambda`

The hosting package runs Hooksmith inside AWS Lambda and exposes service-specific entry points for:

- EventBridge;
- SNS;
- SQS.

A host creates a reusable Hooksmith runtime and processes incoming AWS records through it. The service-specific handlers take care of the AWS invocation shape around the Hooksmith processor.

The SQS host supports partial-batch responses and per-record error handling with access to the Hooksmith execution context, including its logger. SNS and EventBridge handlers preserve their respective AWS delivery semantics while adapting records into Hooksmith processing.

For raw Lambda invocations whose payload is already a Hooksmith `EventDocument`, use the package root:

```ts
import { createHandler, createProcessor } from "@hooksmith/aws-lambda";
import { createRuntime } from "@hooksmith/runtime";

const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(processor);
```

The package root also exposes `lambdaEnvironmentEnrichment()`. It adds the current Lambda execution environment to event metadata before routing, including region, function/runtime details, and invocation-scoped values such as the current X-Ray trace header.

```ts
import { lambdaEnvironmentEnrichment } from "@hooksmith/aws-lambda";

const config = {
  enrichers: [lambdaEnvironmentEnrichment()],
  routes: [
    // Conditions and listeners see Lambda environment metadata.
  ],
};
```

## Examples

The repository contains focused examples under [`examples`](examples) covering:

- SQS, SNS, and EventBridge event adapters and Lambda hosts;
- outbound SQS, SNS, EventBridge, and Lambda listeners;
- synchronous Lambda pipeline transformations;
- STS and SSM event enrichment;
- Lambda execution-environment enrichment.

The main Hooksmith repository also contains an end-to-end [`aws-sqs-slack-lambda`](https://github.com/Kralizek/hooksmith/tree/master/examples/aws-sqs-slack-lambda) example showing AWS hosting together with an external notification extension.

## Ecosystem

The AWS repository is intentionally separate from the main Hooksmith release train. It can evolve and release independently while building on the stable contracts exposed by `@hooksmith/core`, `@hooksmith/pipeline`, and `@hooksmith/runtime`.

See the [main Hooksmith repository](https://github.com/Kralizek/hooksmith) for the runtime, pipeline operators, CLI, GitHub Action, standard conditions, HTTP listeners, and the complete extension catalog.

## Development

```sh
deno task check
```

## Release

Run the **Release** workflow manually and choose a `major`, `minor`, or `patch` version bump. Both workspace packages are versioned and released together.

## License

MIT
