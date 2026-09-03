# Lambda invocation listener

Minimal reference for `invokeLambdaFunction` from `@hooksmith/aws/lambda`.

Set `FUNCTION_NAME`; `AWS_REGION` is optional. This example uses asynchronous
invocation with `InvocationType: "Event"`. The listener serializes `event.data`
as the Lambda payload unless you provide an explicit payload/input override.

Use `clientConfig` for simple SDK configuration, or inject a `LambdaClient`
through `client` for custom credentials, LocalStack, or another endpoint.
