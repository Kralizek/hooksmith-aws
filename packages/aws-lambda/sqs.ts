import type { Context } from "@hooksmith/core";
import type { EventProcessor, EventReader, LambdaHandler } from "./types.ts";

/** One SQS message record delivered to an AWS Lambda handler. */
export interface LambdaRecord {
  messageId: string;
  body: string;
  receiptHandle?: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, unknown>;
  eventSourceARN?: string;
  awsRegion?: string;
}

/** AWS Lambda SQS event containing one or more message records. */
export interface LambdaEvent {
  Records: LambdaRecord[];
}

/** SQS record identifier reported as a partial-batch failure. */
export interface BatchItemFailure {
  itemIdentifier: string;
}

/** Partial-batch response returned by an SQS Lambda handler. */
export interface BatchResponse {
  batchItemFailures: BatchItemFailure[];
}

/** Optional hooks controlling SQS record error handling. */
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
