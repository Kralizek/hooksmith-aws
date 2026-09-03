import type { EventProcessor, EventReader, LambdaHandler } from "./types.ts";

export interface LambdaRecord {
  messageId: string;
  body: string;
  receiptHandle?: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, unknown>;
  eventSourceARN?: string;
  awsRegion?: string;
}

export interface LambdaEvent {
  Records: LambdaRecord[];
}

export interface BatchItemFailure {
  itemIdentifier: string;
}

export interface BatchResponse {
  batchItemFailures: BatchItemFailure[];
}

export interface HandlerOptions {
  onRecordError?: (
    error: unknown,
    record: LambdaRecord,
  ) => void | Promise<void>;
}

export function createHandler<TData = unknown>(
  read: EventReader<LambdaRecord, TData>,
  processor: EventProcessor<TData>,
  options: HandlerOptions = {},
): LambdaHandler<LambdaEvent, BatchResponse> {
  return async (event) => {
    const batchItemFailures: BatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const document = await read(record);
        const report = await processor(document);
        if (!report.success) {
          batchItemFailures.push({ itemIdentifier: record.messageId });
        }
      } catch (error) {
        try {
          await options.onRecordError?.(error, record);
        } catch {
          // Observability hooks must not change SQS partial-batch semantics.
        }
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };
}
