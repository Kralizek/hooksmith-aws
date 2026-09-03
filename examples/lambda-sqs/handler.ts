import type { Config, Context } from "@hooksmith/core";
import { fromSqs } from "@hooksmith/aws/sqs";
import { createLambdaHandler } from "@hooksmith/aws-lambda";
import { createProcessor } from "@hooksmith/aws-lambda/sqs";
import { createRuntime } from "@hooksmith/runtime";

const config: Config = {
  routes: [
    {
      name: "process-sqs-message",
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

export const handler = createProcessor(fromSqs, process);
