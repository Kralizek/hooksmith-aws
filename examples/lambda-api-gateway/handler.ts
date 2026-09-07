import type { Config, Context } from "@hooksmith/core";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createApiGatewayHandler } from "@hooksmith/aws-lambda/api-gateway";
import {
  createConsoleLogWriter,
  createLoggerFactory,
  createRuntime,
} from "@hooksmith/runtime";

const config: Config = {
  routes: [
    {
      name: "process-http-event",
      listeners: [
        {
          name: "log-event",
          run(event) {
            console.log(event);
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

export const handler = createApiGatewayHandler(processor);
