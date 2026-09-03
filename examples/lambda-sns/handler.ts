import type { Config, Context } from "@hooksmith/core";
import { fromSns } from "@hooksmith/aws/sns";
import { createLambdaHandler } from "@hooksmith/aws-lambda";
import { createProcessor } from "@hooksmith/aws-lambda/sns";
import { createRuntime } from "@hooksmith/runtime";

const config: Config = {
  routes: [
    {
      name: "process-sns-message",
      listeners: [
        {
          name: "log-message",
          run(event) {
            console.log(event.data);
            return { success: true };
          },
        },
      ],
    },
  ],
};

const context: Context = { log: console };
const process = createLambdaHandler(createRuntime(config, context));

export const handler = createProcessor({
  read: fromSns,
  process,
});
