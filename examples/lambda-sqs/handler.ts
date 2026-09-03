import type { Config, Context } from "@hooksmith/core";
import { fromSqs, type SqsMessage } from "@hooksmith/aws/sqs";
import { createLambdaHandler } from "@hooksmith/aws-lambda";
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
const processEvent = createLambdaHandler(createRuntime(config, context));

export interface SqsLambdaEvent {
  Records: SqsMessage[];
}

export interface SqsBatchResponse {
  batchItemFailures: Array<{ itemIdentifier: string }>;
}

export async function handler(
  event: SqsLambdaEvent,
): Promise<SqsBatchResponse> {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  for (const record of event.Records) {
    try {
      const report = await processEvent(fromSqs(record));
      if (!report.success) {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
