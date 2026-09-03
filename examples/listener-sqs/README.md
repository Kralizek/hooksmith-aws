# SQS listener

Minimal reference for `sendSqsMessage` from `@hooksmith/aws/sqs`.

Set `QUEUE_URL`; `AWS_REGION` is optional because the AWS SDK uses its normal
configuration chain by default. The listener serializes `event.data` as the
message body unless you provide an explicit payload/input override.

Use `clientConfig` for simple SDK configuration, or inject an `SQSClient`
through `client` when you need custom credentials, LocalStack, or another
endpoint.
