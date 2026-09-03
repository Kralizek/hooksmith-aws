import type { Context } from "@hooksmith/core";
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
    context: Context,
  ) => void | Promise<void>;
}

export function createHandler<TData = unknown>(
  read: EventReader<LambdaRecord, TData>,
  processor: EventProcessor<TData>,
  context: Context,
  options: HandlerOptions = {},
): LambdaHandler<LambdaEvent, BatchResponse> {
  const onRecordError = options.onRecordError ?? defaultErrorLogger;

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
          await onRecordError(error, record, context);
        } catch {
          // Observability hooks must not change SQS partial-batch semantics.
        }
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };
}

function defaultErrorLogger(
  error: unknown,
  record: LambdaRecord,
  context: Context,
): void {
  context.log.error(`Failed SQS record ${record.messageId}.`, error);
}
