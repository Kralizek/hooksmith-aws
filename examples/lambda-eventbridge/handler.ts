import type { Config, Context } from "@hooksmith/core";
import {
  type EventBridgeEvent,
  fromEventBridge,
} from "@hooksmith/aws/eventbridge";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createRuntime, type RunReport } from "@hooksmith/runtime";

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

export async function handler(
  event: EventBridgeEvent,
): Promise<RunReport> {
  const report = await processor(fromEventBridge(event));
  if (!report.success) {
    throw new Error("Hooksmith failed to process the EventBridge event.");
  }

  return report;
}
