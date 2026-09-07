# Examples

The examples are intentionally small and isolated. Each directory has its own
`deno.json` and is checked independently in CI.

| Example                                                      | Purpose                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [`listener-sqs`](./listener-sqs)                             | Send one Hooksmith event to SQS.                                                                        |
| [`listener-sns`](./listener-sns)                             | Publish one Hooksmith event to SNS.                                                                     |
| [`listener-eventbridge`](./listener-eventbridge)             | Publish one Hooksmith event to EventBridge.                                                             |
| [`listener-lambda`](./listener-lambda)                       | Invoke a Lambda function from a Hooksmith listener.                                                     |
| [`pipeline-lambda`](./pipeline-lambda)                       | Use a synchronous Lambda invocation as a pipeline transformation.                                       |
| [`outbound-listeners`](./outbound-listeners)                 | Compose multiple AWS listeners on one Hooksmith route.                                                  |
| [`aws-lambda`](./aws-lambda)                                 | Run Hooksmith in Lambda when the invocation payload is already an `EventDocument`.                      |
| [`lambda-sqs`](./lambda-sqs)                                 | Adapt an SQS Lambda batch and process each message with Hooksmith.                                      |
| [`lambda-sns`](./lambda-sns)                                 | Adapt SNS Lambda notifications and process them with Hooksmith.                                         |
| [`lambda-eventbridge`](./lambda-eventbridge)                 | Adapt an EventBridge event and process it with Hooksmith.                                               |
| [`lambda-api-gateway`](./lambda-api-gateway)                 | Process API Gateway HTTP API v2 requests whose body is already a Hooksmith `EventDocument`.             |
| [`lambda-api-gateway-webhook`](./lambda-api-gateway-webhook) | Map a generic API Gateway HTTP API v2 webhook request into an `EventDocument` with `HttpIngressMapper`. |

The `listener-*` examples are the authoritative minimal references for each
outbound listener. `pipeline-lambda` shows the request/response Lambda use case,
while `outbound-listeners` demonstrates listener composition after the
individual APIs are clear.

The Lambda trigger examples deliberately combine `@hooksmith/aws` and
`@hooksmith/aws-lambda` when an AWS service envelope needs an adapter:

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

API Gateway follows the shared HTTP ingress path instead:

```text
API Gateway HTTP API v2
    ↓
HttpIngressRequest
    ↓
optional HttpIngressMapper
    ↓
Hooksmith EventDocument
    ↓
@hooksmith/aws-lambda
    ↓
Hooksmith runtime
```

Use `lambda-api-gateway` when the HTTP body is already an `EventDocument`. Use
`lambda-api-gateway-webhook` when an incoming webhook payload must first be
mapped into one.
