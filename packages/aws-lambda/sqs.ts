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

export interface ProcessorOptions<
  TRecord extends { messageId: string },
  TData = unknown,
> {
  read: RecordReader<TRecord, TData>;
  process: EventProcessor<TData>;
}

export function createProcessor<
  TRecord extends { messageId: string },
  TData = unknown,
>(
  options: ProcessorOptions<TRecord, TData>,
): (event: LambdaEvent<TRecord>) => Promise<BatchResponse> {
  return async (event) => {
    const batchItemFailures: BatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const document = await options.read(record);
        const report = await options.process(document);
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
