# Examples

The examples are intentionally small and isolated. Each directory has its own `deno.json` and is checked independently in CI.

| Example | Purpose |
| --- | --- |
| [`outbound-listeners`](./outbound-listeners) | Send Hooksmith events to AWS services. |
| [`aws-lambda`](./aws-lambda) | Run Hooksmith in Lambda when the invocation payload is already an `EventDocument`. |
| [`lambda-sqs`](./lambda-sqs) | Adapt an SQS Lambda batch and process each message with Hooksmith. |
| [`lambda-sns`](./lambda-sns) | Adapt SNS Lambda notifications and process them with Hooksmith. |
| [`lambda-eventbridge`](./lambda-eventbridge) | Adapt an EventBridge event and process it with Hooksmith. |

The Lambda trigger examples deliberately combine `@hooksmith/aws` and `@hooksmith/aws-lambda`:

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

Use the bare `aws-lambda` example when there is no AWS service envelope to adapt.
