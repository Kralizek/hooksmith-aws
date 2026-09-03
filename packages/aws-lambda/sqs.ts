import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

export type RecordReader<TRecord, TData = unknown> = (
  record: TRecord,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

export type EventProcessor<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

export interface LambdaEvent<TRecord> {
  Records: TRecord[];
}

export interface BatchItemFailure {
  itemIdentifier: string;
}

export interface BatchResponse {
  batchItemFailures: BatchItemFailure[];
}

export function createProcessor<
  TRecord extends { messageId: string },
  TData = unknown,
>(
  read: RecordReader<TRecord, TData>,
  process: EventProcessor<TData>,
): (event: LambdaEvent<TRecord>) => Promise<BatchResponse> {
  return async (event) => {
    const batchItemFailures: BatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const document = await read(record);
        const report = await process(document);
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
