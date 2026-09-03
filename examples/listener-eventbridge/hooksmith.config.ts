import type { Config } from "@hooksmith/core";
import { putEventBridgeEvent } from "@hooksmith/aws/eventbridge";

export default {
  routes: [
    {
      listeners: [
        putEventBridgeEvent({
          eventBusName: Deno.env.get("EVENT_BUS_NAME") ?? "default",
          clientConfig: { region: Deno.env.get("AWS_REGION") },
        }),
      ],
    },
  ],
} satisfies Config;
