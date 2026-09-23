# SQS tenant routing Lambda

This example composes the existing SQS Lambda host with the asynchronous Lambda
listener to route each SQS record to a tenant-isolated downstream Lambda.

> **Capability example only.** This example demonstrates how the Hooksmith AWS
> integrations fit together. It is not a production-ready security or tenant
> authorization reference. In a real system, tenant identity and downstream
> destination selection must come from sources your application treats as
> trusted and must be validated according to your own authorization model.

The Lambda listener receives the full adapted Hooksmith event, including promoted
message attributes and `metadata.sqs.attributes.MessageGroupId`. It resolves
`functionName`, `tenantId`, and `payload` dynamically from that event and
invokes the downstream Lambda asynchronously with `InvocationType: "Event"`.

Tenant identity is application-defined. The example checks a promoted `tenantId`
message attribute first and then `MessageGroupId`; applications can instead
inspect the payload, call a registry, or use another source. Downstream function
selection should come from trusted application configuration or a tenant
registry, not directly from untrusted message content.

The existing `@hooksmith/aws-lambda/sqs` host retains SQS partial-batch
semantics. If the asynchronous invocation request itself fails, Hooksmith
processing is unsuccessful and that record is returned in `batchItemFailures`.
Once AWS accepts the asynchronous invocation, downstream execution follows
Lambda's asynchronous delivery semantics.
