# Bare Hooksmith Lambda

This is the smallest `@hooksmith/aws-lambda` example. Use it when the Lambda
invocation payload is already a Hooksmith `EventDocument`.

```text
Lambda payload (EventDocument)
    ↓
@hooksmith/aws-lambda
    ↓
Hooksmith runtime
```

There is no SQS, SNS, EventBridge, or other AWS envelope to interpret here. The
handler hydrates the event document and passes it to the runtime.

The runtime configuration is ordinary Hooksmith configuration, so customize
routes, conditions, listeners, and context exactly as you would outside Lambda.

If your Lambda is triggered by an AWS service envelope instead, see the
`lambda-sqs`, `lambda-sns`, and `lambda-eventbridge` examples. Those compose an
adapter from `@hooksmith/aws` with this bare host.
