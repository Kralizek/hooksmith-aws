# hooksmith-aws

AWS integrations for [Hooksmith](https://github.com/Kralizek/hooksmith).

The repository covers four complementary concerns: adapting AWS events into Hooksmith events, enriching events from AWS services before routing, invoking AWS services from listeners or pipeline transformers, and hosting reusable Hooksmith runtimes inside AWS Lambda.

## Packages

| Package | Purpose |
| --- | --- |
| [`@hooksmith/aws`](https://jsr.io/@hooksmith/aws) | AWS event adapters, service enrichers, listeners, and pipeline transformers. |
| [`@hooksmith/aws-lambda`](https://jsr.io/@hooksmith/aws-lambda) | AWS Lambda hosting support and execution-environment enrichment for Hooksmith runtimes. |

`@hooksmith/aws` contains integration primitives and depends only on the Hooksmith contracts and pipeline APIs it needs. `@hooksmith/aws-lambda` is the hosting package and can depend on `@hooksmith/runtime` without forcing that dependency on consumers that only need adapters, enrichers, listeners, or transformers.

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

The AWS service modules contain event adapters, enrichers, and listeners where those concepts apply.

### Event enrichment

AWS enrichers run before routing and add metadata to the current Hooksmith event.

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

`getCallerIdentityEnrichment()` has a standard mapping under `metadata.sts` with `account`, `arn`, and `userId`. SSM and synchronous Lambda enrichment require an explicit mapper because their responses do not have one obvious Hooksmith metadata shape.

`invokeLambdaEnrichment()` from `@hooksmith/aws/lambda` invokes another Lambda synchronously with `RequestResponse`, parses its returned payload, and maps that payload into event enrichment. Function errors, non-200 invocation status codes, and missing response payloads fail enrichment.

All AWS service enrichers support `clientConfig` for normal AWS SDK customization or an injected compatible `client` for tests, custom credentials, LocalStack, or another endpoint.

### Listeners and pipeline transformations

The AWS service modules also expose listeners for SQS, SNS, EventBridge, and asynchronous Lambda invocation.

The pipeline Lambda module contains synchronous Lambda invocation as a Hooksmith `Transformer`, so a Lambda result can continue through `@hooksmith/pipeline` rather than terminating the listener chain.

This allows compositions such as:

```ts
pipe(
  project(toRequest),
  lambda({ functionName: "transform-request" }),
  project(toNotification),
  slack,
);
```

## `@hooksmith/aws-lambda`

The hosting package provides adapters for running Hooksmith in AWS Lambda with service-specific entry points for:

- EventBridge
- SNS
- SQS

A host creates a reusable Hooksmith runtime once and processes incoming AWS records through it. The SQS host supports per-record error handling with access to the Hooksmith execution context, including its logger.

The package root also exposes `lambdaEnvironmentEnrichment()`, which enriches each invocation from the current Lambda execution environment. By default it adds AWS region and Lambda function/runtime details under `metadata.aws`, including invocation-scoped values such as the current X-Ray trace header.

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

The repository contains focused AWS examples under [`examples`](examples), including enrichment from STS and SSM before outbound listeners and Lambda execution-environment enrichment in the bare Lambda host. The main Hooksmith repository also contains an end-to-end [`aws-sqs-slack-lambda`](https://github.com/Kralizek/hooksmith/tree/master/examples/aws-sqs-slack-lambda) example showing AWS hosting together with an external notification extension.

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
