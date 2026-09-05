import type { Config, Context } from "@hooksmith/core";
import { fromSqs } from "@hooksmith/aws/sqs";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createHandler } from "@hooksmith/aws-lambda/sqs";
import {
  createConsoleLogWriter,
  createLoggerFactory,
  createRuntime,
} from "@hooksmith/runtime";

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

const context: Context = {
  logger: createLoggerFactory({ write: createConsoleLogWriter() }),
};
const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(fromSqs, processor, context);
