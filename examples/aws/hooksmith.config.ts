import type { Config } from "@hooksmith/core";
import {
  invokeLambdaFunction,
  publishSnsMessage,
  putEventBridgeEvent,
  sendSqsMessage,
} from "@hooksmith/aws";

export default {
  routes: [
    {
      name: "fan-out-order-created",
      listeners: [
        sendSqsMessage({
          queueUrl: Deno.env.get("ORDER_QUEUE_URL")!,
        }),
        publishSnsMessage({
          topicArn: Deno.env.get("ORDER_TOPIC_ARN")!,
        }),
        putEventBridgeEvent({
          eventBusName: Deno.env.get("EVENT_BUS_NAME") ?? "default",
        }),
        invokeLambdaFunction({
          functionName: Deno.env.get("ORDER_FUNCTION_NAME")!,
          input: { InvocationType: "Event" },
        }),
      ],
    },
  ],
} satisfies Config;
