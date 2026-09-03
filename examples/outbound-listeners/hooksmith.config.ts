import type { Config } from "@hooksmith/core";
import { putEventBridgeEvent } from "@hooksmith/aws/eventbridge";
import { sendSqsMessage } from "@hooksmith/aws/sqs";

export default {
  routes: [
    {
      name: "fan-out-order-created",
      listeners: [
        sendSqsMessage({
          queueUrl: Deno.env.get("ORDER_QUEUE_URL")!,
        }),
        putEventBridgeEvent({
          eventBusName: Deno.env.get("EVENT_BUS_NAME") ?? "default",
        }),
      ],
    },
  ],
} satisfies Config;
