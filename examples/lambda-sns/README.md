# SNS-triggered Hooksmith Lambda

This example combines `@hooksmith/aws/sns` with `@hooksmith/aws-lambda` for an SNS-triggered Lambda.

```text
SNS Lambda event
    ↓
fromSns(record.Sns)
    ↓
Hooksmith EventDocument
    ↓
createLambdaHandler(...)
    ↓
Hooksmith runtime
```

SNS invokes Lambda with a `Records` envelope. The handler adapts each notification, processes it with Hooksmith, and collects the resulting reports.

Unlike SQS, SNS-triggered Lambda does not use the SQS partial-batch response contract. This example throws when a Hooksmith report is unsuccessful so the Lambda invocation itself fails and AWS applies the configured SNS/Lambda retry and failure handling.

## Customize the processing

Change the Hooksmith `config` and `context` to add your own routes and listeners. `fromSns` maps the SNS `Message` to `event.data` and preserves SNS envelope information as Hooksmith event identity and metadata.

No SNS SDK client is needed to receive the trigger. For outbound SNS publishing and AWS SDK client customization, see `../outbound-listeners` and `@hooksmith/aws/sns`.
