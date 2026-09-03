import type { Config } from "@hooksmith/core";
import { publishSnsMessage } from "@hooksmith/aws/sns";

export default {
  routes: [
    {
      listeners: [
        publishSnsMessage({
          topicArn: Deno.env.get("TOPIC_ARN")!,
          clientConfig: { region: Deno.env.get("AWS_REGION") },
        }),
      ],
    },
  ],
} satisfies Config;
