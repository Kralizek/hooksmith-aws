import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

export type RecordReader<TRecord = never, TData = unknown> = (
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

type AnyRecordReader = RecordReader<never, unknown>;
type ReaderRecord<TReader extends AnyRecordReader> = Parameters<TReader>[0];
type ReaderData<TReader extends AnyRecordReader> =
  Awaited<ReturnType<TReader>> extends EventDocument<infer TData> ? TData
    : never;

export interface ProcessorOptions<TReader extends AnyRecordReader> {
  read: TReader;
  process: EventProcessor<ReaderData<TReader>>;
}

export function createProcessor<TReader extends AnyRecordReader>(
  options: ProcessorOptions<TReader>,
): (
  event: LambdaEvent<ReaderRecord<TReader> & { messageId: string }>,
) => Promise<BatchResponse> {
  const read = options.read as RecordReader<
    ReaderRecord<TReader>,
    ReaderData<TReader>
  >;

  return async (event) => {
    const batchItemFailures: BatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const document = await read(record);
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
