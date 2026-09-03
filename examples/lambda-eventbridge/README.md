# EventBridge-triggered Hooksmith Lambda

This is the simplest AWS-trigger composition example: one EventBridge event
becomes one Hooksmith event.

```text
EventBridge event
    ↓
fromEventBridge(event)
    ↓
Hooksmith EventDocument
    ↓
createLambdaHandler(...)
    ↓
Hooksmith runtime
```

`fromEventBridge` maps `detail-type` to the Hooksmith event type, `detail` to
`event.data`, and keeps the EventBridge envelope fields as Hooksmith
source/metadata.

The handler processes the adapted event and throws if the Hooksmith report is
unsuccessful so the Lambda invocation fails and EventBridge/Lambda retry or
dead-letter behavior can apply.

## Customize the processing

Change the Hooksmith `config` and `context` to add your own routes and
listeners. There is no EventBridge SDK client involved in receiving the trigger;
AWS supplies the invocation payload.

For outbound EventBridge publishing and AWS SDK client customization, see
`../outbound-listeners` and `@hooksmith/aws/eventbridge`.
