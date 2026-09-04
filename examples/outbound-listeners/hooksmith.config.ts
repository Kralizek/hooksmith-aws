import type { Config } from "@hooksmith/core";
import { putEventBridgeEvent } from "@hooksmith/aws/eventbridge";
import { getParameterEnrichment } from "@hooksmith/aws/ssm";
import { sendSqsMessage } from "@hooksmith/aws/sqs";
import { getCallerIdentityEnrichment } from "@hooksmith/aws/sts";

export default {
  enrichers: [
    getCallerIdentityEnrichment(),
    getParameterEnrichment({
      parameterName: Deno.env.get("TENANT_PLAN_PARAMETER")!,
      withDecryption: true,
      map: (_event, response) => ({
        metadata: {
          tenantPlan: response.Parameter?.Value,
        },
      }),
    }),
  ],
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
