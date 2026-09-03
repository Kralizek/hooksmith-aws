import type { EventDocument } from "@hooksmith/core";
import type { Processor } from "./handler.ts";

export interface LambdaRecord {
  messageId: string;
  body: string;
  receiptHandle?: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, unknown>;
  eventSourceARN?: string;
  awsRegion?: string;
}

export type RecordReader<TData = unknown> = (
  record: LambdaRecord,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

export interface LambdaEvent {
  Records: LambdaRecord[];
}

export interface BatchItemFailure {
  itemIdentifier: string;
}

export interface BatchResponse {
  batchItemFailures: BatchItemFailure[];
}

export function createHandler<TData = unknown>(
  read: RecordReader<TData>,
  processor: Processor<TData>,
): (event: LambdaEvent) => Promise<BatchResponse> {
  return async (event) => {
    const batchItemFailures: BatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const document = await read(record);
        const report = await processor(document);
        if (!report.success) {
          batchItemFailures.push({ itemIdentifier: record.messageId });
        }
      } catch {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };
}
