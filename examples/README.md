# Examples

The examples are intentionally small and isolated. Each directory has its own
`deno.json` and is checked independently in CI.

| Example                                          | Purpose                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [`listener-sqs`](./listener-sqs)                 | Send one Hooksmith event to SQS.                                                   |
| [`listener-sns`](./listener-sns)                 | Publish one Hooksmith event to SNS.                                                |
| [`listener-eventbridge`](./listener-eventbridge) | Publish one Hooksmith event to EventBridge.                                        |
| [`listener-lambda`](./listener-lambda)           | Invoke a Lambda function from a Hooksmith listener.                                |
| [`outbound-listeners`](./outbound-listeners)     | Compose multiple AWS listeners on one Hooksmith route.                             |
| [`aws-lambda`](./aws-lambda)                     | Run Hooksmith in Lambda when the invocation payload is already an `EventDocument`. |
| [`lambda-sqs`](./lambda-sqs)                     | Adapt an SQS Lambda batch and process each message with Hooksmith.                 |
| [`lambda-sns`](./lambda-sns)                     | Adapt SNS Lambda notifications and process them with Hooksmith.                    |
| [`lambda-eventbridge`](./lambda-eventbridge)     | Adapt an EventBridge event and process it with Hooksmith.                          |

The `listener-*` examples are the authoritative minimal references for each
outbound listener. `outbound-listeners` demonstrates composition after the
individual APIs are clear.

The Lambda trigger examples deliberately combine `@hooksmith/aws` and
`@hooksmith/aws-lambda`:

```text
AWS trigger envelope
    ↓
@hooksmith/aws adapter
    ↓
Hooksmith EventDocument
    ↓
@hooksmith/aws-lambda
    ↓
Hooksmith runtime
```

Use the bare `aws-lambda` example when there is no AWS service envelope to
adapt.
