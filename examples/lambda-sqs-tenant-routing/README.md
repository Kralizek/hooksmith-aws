# SQS tenant routing Lambda

This example composes the existing SQS Lambda host with the synchronous Lambda
pipeline transformer to route each SQS record to a tenant-isolated downstream
Lambda.

> **Capability example only.** This example demonstrates how the Hooksmith AWS
> integrations fit together. It is not a production-ready security or tenant
> authorization reference. In a real system, tenant identity and downstream
> destination selection must come from sources your application treats as
> trusted and must be validated according to your own authorization model.

The SQS reader owns tenant resolution because it can inspect the full adapted
Hooksmith event, including promoted message attributes and
`metadata.sqs.attributes.MessageGroupId`. It then resolves the downstream
function through a trusted tenant-to-function mapping before constructing a
small route value containing:

- the validated tenant ID;
- the trusted downstream function name;
- the payload to forward.

The pipeline then resolves `functionName`, `tenantId`, and `payload` dynamically
from that route value.

Tenant identity is application-defined. The example checks a promoted `tenantId`
message attribute first and then `MessageGroupId`; applications can instead
inspect the payload, call a registry, or use another source. Downstream function
selection should come from trusted application configuration or a tenant
registry, not directly from untrusted message content.

The existing `@hooksmith/aws-lambda/sqs` host retains SQS partial-batch
semantics. A failed downstream invocation makes Hooksmith processing
unsuccessful, so that record is returned in `batchItemFailures`.
