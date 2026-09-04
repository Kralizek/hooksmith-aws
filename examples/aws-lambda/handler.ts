import type { Config, Context } from "@hooksmith/core";
import {
  createHandler,
  createProcessor,
  lambdaEnvironmentEnrichment,
} from "@hooksmith/aws-lambda";
import { createRuntime } from "@hooksmith/runtime";

const config: Config = {
  enrichers: [
    lambdaEnvironmentEnrichment(),
  ],
  routes: [
    {
      name: "log-event",
      listeners: [
        {
          name: "console",
          run(event) {
            console.log(event);
            return { success: true };
          },
        },
      ],
    },
  ],
};

const context: Context = { log: console };
const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(processor);
