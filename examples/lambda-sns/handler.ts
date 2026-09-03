import type { Config, Context } from "@hooksmith/core";
import { fromSns, type SnsNotification } from "@hooksmith/aws/sns";
import { createLambdaHandler } from "@hooksmith/aws-lambda";
import { createRuntime, type RunReport } from "@hooksmith/runtime";

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
const processEvent = createLambdaHandler(createRuntime(config, context));

export interface SnsLambdaEvent {
  Records: Array<{ Sns: SnsNotification }>;
}

export async function handler(event: SnsLambdaEvent): Promise<RunReport[]> {
  const reports: RunReport[] = [];

  for (const record of event.Records) {
    const report = await processEvent(fromSns(record.Sns));
    if (!report.success) {
      throw new Error("Hooksmith failed to process an SNS notification.");
    }
    reports.push(report);
  }

  return reports;
}
