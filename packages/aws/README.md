# @hooksmith/aws

AWS integrations for Hooksmith, with event adapters and listeners for AWS
services.

This package does not host the Hooksmith runtime. Lambda hosting support lives
in [`@hooksmith/aws-lambda`](../aws-lambda).

## Event adapters

AWS envelopes are mapped to Hooksmith event documents. Service metadata comes
from the envelope while the service payload becomes `event.data`.

```ts
import { fromEventBridge, fromSns, fromSqs } from "@hooksmith/aws";

const sqsEvent = fromSqs(sqsMessage);
const snsEvent = fromSns(snsNotification);
const eventBridgeEvent = fromEventBridge(eventBridgePayload);
```

`fromSqsRaw` and `fromSnsRaw` cover raw delivery where the transported payload
is already a complete Hooksmith `EventDocument`.

```ts
import { fromSnsRaw, fromSqsRaw } from "@hooksmith/aws";

const sqsEvent = fromSqsRaw(sqsMessage);
const snsEvent = fromSnsRaw(rawPayload);
```

The raw adapters validate the basic Hooksmith event-document shape instead of
inventing event metadata from an envelope that is no longer present.

## Listeners

The package provides listeners for common event-oriented AWS services:

- `sendSqsMessage`
- `publishSnsMessage`
- `putEventBridgeEvent`
- `invokeLambdaFunction`

Listener payloads default to `event.data` and can be static or resolved from the
current event and Hooksmith context.

```ts
import { sendSqsMessage } from "@hooksmith/aws";

const listener = sendSqsMessage({
  queueUrl: Deno.env.get("QUEUE_URL")!,
});
```

Each listener also exposes the corresponding native AWS SDK input fields through
`input` (or `entry` for EventBridge). Explicit Hooksmith-friendly options win
over native input fields when both are supplied.

AWS credentials and region use the normal AWS SDK credential and configuration
resolution unless a custom client or client configuration is supplied.
