# API Gateway webhook Hooksmith Lambda

This example shows API Gateway HTTP API payload format v2 receiving a generic
JSON webhook rather than an already-formed Hooksmith event document.

The host normalizes the API Gateway request into `HttpIngressRequest`, then the
`readWebhook` function maps the webhook payload into an `EventDocument` before
Hooksmith processes it:

```text
API Gateway HTTP API v2
    ↓
HttpIngressRequest
    ↓
readWebhook
    ↓
EventDocument
    ↓
Hooksmith runtime
    ↓
API Gateway response
```

The mapper is passed when the handler is created:

```ts
export const handler = createApiGatewayHandler(processor, {
  ingressMapper: readWebhook,
});
```

The sample webhook payload is expected to look like:

```json
{
  "event": "sample.created",
  "id": "delivery-123",
  "data": {
    "message": "hello"
  }
}
```

A real integration can replace `readWebhook` with a reusable mapper package,
for example one that validates webhook signatures using the raw request bytes.
