# SNS listener

Minimal reference for `publishSnsMessage` from `@hooksmith/aws/sns`.

Set `TOPIC_ARN`; `AWS_REGION` is optional because the AWS SDK uses its normal
configuration chain by default. The listener serializes `event.data` as the SNS
message unless you provide an explicit payload/input override.

Use `clientConfig` for simple SDK configuration, or inject an `SNSClient`
through `client` for custom credentials, LocalStack, or another endpoint.
