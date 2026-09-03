# SNS-triggered Hooksmith Lambda

This example combines `@hooksmith/aws/sns` with the SNS processor from
`@hooksmith/aws-lambda/sns`.

```text
SNS Lambda event
    ↓
createProcessor(...)
    ├─ read: fromSns
    └─ process: Hooksmith Lambda handler
```

The processor owns the SNS `Records` loop. Each notification is adapted and
processed sequentially; an unsuccessful Hooksmith report fails the Lambda
invocation so AWS retry and failure handling can apply.

`fromSns` maps the SNS `Message` to `event.data`. Sender-defined SNS message
attributes are promoted to top-level Hooksmith metadata, while SNS envelope
information is available under `event.metadata.sns`.

No SNS SDK client is needed to receive the trigger. For outbound SNS client
configuration, see `../listener-sns`.
