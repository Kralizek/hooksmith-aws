# Lambda invocation listener

Minimal reference for `invokeLambdaFunction` from `@hooksmith/aws/lambda`.

Set `FUNCTION_NAME`; `AWS_REGION` is optional. Lambda invocation listeners are
asynchronous sinks: Hooksmith always invokes the target with AWS invocation type
`Event` and does not expose synchronous request/response semantics.

The listener serializes `event.data` as the Lambda payload unless you provide an
explicit `payload`. Native `input` options remain available for AWS-specific
settings, but cannot override the function name, payload, or invocation type.

Use `clientConfig` for simple SDK configuration, or inject a `LambdaClient`
through `client` for custom credentials, LocalStack, or another endpoint.
