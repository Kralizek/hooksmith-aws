# hooksmith-aws

AWS integrations for [Hooksmith](https://github.com/Kralizek/hooksmith).

The repository covers three complementary concerns: adapting AWS events into Hooksmith events, invoking AWS services from listeners or pipeline transformers, and hosting reusable Hooksmith runtimes inside AWS Lambda.

## Packages

| Package | Purpose |
| --- | --- |
| [`@hooksmith/aws`](https://jsr.io/@hooksmith/aws) | AWS event adapters, service listeners, and pipeline transformers. |
| [`@hooksmith/aws-lambda`](https://jsr.io/@hooksmith/aws-lambda) | AWS Lambda hosting support for Hooksmith runtimes. |

`@hooksmith/aws` contains integration primitives and depends only on the Hooksmith contracts and pipeline APIs it needs. `@hooksmith/aws-lambda` is the hosting package and can depend on `@hooksmith/runtime` without forcing that dependency on consumers that only need adapters, listeners, or transformers.

## `@hooksmith/aws`

The package exposes service-oriented subpaths so consumers can import only the integration surface they need:

```text
@hooksmith/aws
@hooksmith/aws/eventbridge
@hooksmith/aws/lambda
@hooksmith/aws/pipeline/lambda
@hooksmith/aws/sns
@hooksmith/aws/sqs
```

The AWS service modules contain event adapters and listeners. The pipeline Lambda module contains synchronous Lambda invocation as a Hooksmith `Transformer`, so a Lambda result can continue through `@hooksmith/pipeline` rather than terminating the listener chain.

This allows compositions such as:

```ts
pipe(
  project(toRequest),
  invokeLambda(...),
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

## Examples

The repository contains focused AWS examples under [`examples`](examples). The main Hooksmith repository also contains an end-to-end [`aws-sqs-slack-lambda`](https://github.com/Kralizek/hooksmith/tree/master/examples/aws-sqs-slack-lambda) example showing AWS hosting together with an external notification extension.

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
