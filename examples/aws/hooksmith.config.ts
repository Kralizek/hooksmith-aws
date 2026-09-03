import type { Config } from "@hooksmith/core";
import { putEventBridgeEvent } from "@hooksmith/aws/eventbridge";
import { invokeLambdaFunction } from "@hooksmith/aws/lambda";
import { publishSnsMessage } from "@hooksmith/aws/sns";
import { sendSqsMessage } from "@hooksmith/aws/sqs";

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
