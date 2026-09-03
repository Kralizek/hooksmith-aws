import type { Config } from "@hooksmith/core";
import { sendSqsMessage } from "@hooksmith/aws/sqs";

export default {
  routes: [
    {
      listeners: [
        sendSqsMessage({
          queueUrl: Deno.env.get("QUEUE_URL")!,
          clientConfig: { region: Deno.env.get("AWS_REGION") },
        }),
      ],
    },
  ],
} satisfies Config;
