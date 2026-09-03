# SQS-triggered Hooksmith Lambda

This example shows how to combine `@hooksmith/aws/sqs` with
`@hooksmith/aws-lambda` for an SQS-triggered Lambda.

```text
SQS Lambda batch
    ↓
fromSqs(record)
    ↓
Hooksmith EventDocument
    ↓
createLambdaHandler(...)
    ↓
Hooksmith runtime
```

Lambda delivers SQS messages in batches, so the handler loops over `Records` and
processes each message independently. It returns `batchItemFailures` so AWS can
retry only the messages that failed instead of replaying the whole batch.

The example catches both adapter/runtime exceptions and unsuccessful Hooksmith
reports and marks the corresponding `messageId` as failed.

## Customize the processing

Change the Hooksmith `config` and `context` exactly as in any other runtime. The
SQS adapter maps the message body to `event.data` and keeps SQS envelope
information in the Hooksmith event metadata.

This example does not create an SQS SDK client because receiving the batch is
handled by the Lambda service integration. AWS SDK client configuration is
relevant to outbound listeners; see `../outbound-listeners` for `clientConfig`
and custom-client examples.
