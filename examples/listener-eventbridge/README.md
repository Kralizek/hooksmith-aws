# EventBridge listener

Minimal reference for `putEventBridgeEvent` from `@hooksmith/aws/eventbridge`.

`EVENT_BUS_NAME` defaults to `default`; `AWS_REGION` is optional. By default the
listener derives `Source` from the Hooksmith event source, `DetailType` from the
event type, and serializes `event.data` into `Detail`.

Use `clientConfig` for simple SDK configuration, or inject an
`EventBridgeClient` through `client` for custom credentials, LocalStack, or
another endpoint.
