# Lambda pipeline transformation

This example uses a synchronous AWS Lambda invocation as a Hooksmith pipeline
transformation.

```text
Order
  ↓
lambda<Order, EnrichedOrder>(...)
  ↓
EnrichedOrder
  ↓
terminal listener
```

Set `FUNCTION_NAME`; `AWS_REGION` is optional. The transformer invokes Lambda
with `InvocationType: "RequestResponse"`, JSON-serializes the current pipeline
value, and parses the returned JSON payload as the next pipeline value.

The integration is imported from `@hooksmith/aws/pipeline/lambda`, so consumers
that do not use this subpath do not pull the pipeline package into their module
graph through the AWS package.
