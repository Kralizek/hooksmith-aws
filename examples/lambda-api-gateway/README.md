# API Gateway-triggered Hooksmith Lambda

This example uses `@hooksmith/aws-lambda/api-gateway` to host Hooksmith behind
API Gateway HTTP API payload format v2.

```text
API Gateway HTTP API v2
    ↓
createApiGatewayHandler(...)
    ↓
Hooksmith event document
    ↓
createProcessor(...)
    ↓
RunReport
    ↓
API Gateway response
```

With no ingress mapper configured, the HTTP request body must already contain a
valid Hooksmith event document. The API Gateway host normalizes the incoming
request, parses the event document, runs Hooksmith, and returns the execution
report as JSON.

For webhook-specific payloads, pass an `HttpIngressMapper` to
`createApiGatewayHandler(...)`. The mapper receives the normalized request,
including the raw request body bytes, so packages can perform signature
verification and map vendor payloads into Hooksmith events before processing.
