import type { Config, Context } from "@hooksmith/core";
import { fromEventBridge } from "@hooksmith/aws/eventbridge";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createHandler } from "@hooksmith/aws-lambda/eventbridge";
import { createRuntime } from "@hooksmith/runtime";

const config: Config = {
  routes: [
    {
      name: "process-eventbridge-event",
      listeners: [
        {
          name: "log-event",
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
const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(fromEventBridge, processor);
