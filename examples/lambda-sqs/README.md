# SQS-triggered Hooksmith Lambda

This example combines `@hooksmith/aws/sqs` with the SQS processor from
`@hooksmith/aws-lambda/sqs`.

```text
SQS Lambda batch
    ↓
createProcessor(...)
    ├─ read: fromSqs
    └─ process: Hooksmith Lambda handler
    ↓
batchItemFailures
```

The processor owns the Lambda/SQS mechanics: it iterates `Records`, adapts each
record, runs Hooksmith, catches failures, and returns the partial-batch response
AWS expects. Consumers only provide the record reader and event processor.

`fromSqs` maps the message body to `event.data`. Sender-defined SQS message
attributes are promoted to top-level Hooksmith metadata, while SQS transport
information is available under `event.metadata.sqs`.

This example does not create an SQS SDK client because receiving the batch is
handled by the Lambda service integration. For outbound SQS client
configuration, see `../listener-sqs`.
