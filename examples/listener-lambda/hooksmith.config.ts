import type { Config } from "@hooksmith/core";
import { invokeLambdaFunction } from "@hooksmith/aws/lambda";

export default {
  routes: [
    {
      listeners: [
        invokeLambdaFunction({
          functionName: Deno.env.get("FUNCTION_NAME")!,
          input: { InvocationType: "Event" },
          clientConfig: { region: Deno.env.get("AWS_REGION") },
        }),
      ],
    },
  ],
} satisfies Config;
