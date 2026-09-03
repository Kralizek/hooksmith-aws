import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

export type RecordReader<TNotification = never, TData = unknown> = (
  notification: TNotification,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

export type EventProcessor<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

export interface LambdaRecord<TNotification> {
  Sns: TNotification;
}

export interface LambdaEvent<TNotification> {
  Records: Array<LambdaRecord<TNotification>>;
}

type AnyRecordReader = RecordReader<never, unknown>;
type ReaderNotification<TReader extends AnyRecordReader> = Parameters<
  TReader
>[0];
type ReaderData<TReader extends AnyRecordReader> =
  Awaited<ReturnType<TReader>> extends EventDocument<infer TData> ? TData
    : never;

export interface ProcessorOptions<TReader extends AnyRecordReader> {
  read: TReader;
  process: EventProcessor<ReaderData<TReader>>;
}

export function createProcessor<TReader extends AnyRecordReader>(
  options: ProcessorOptions<TReader>,
): (event: LambdaEvent<ReaderNotification<TReader>>) => Promise<void> {
  const read = options.read as RecordReader<
    ReaderNotification<TReader>,
    ReaderData<TReader>
  >;

  return async (event) => {
    for (const record of event.Records) {
      const document = await read(record.Sns);
      const report = await options.process(document);
      if (!report.success) {
        throw new Error("Hooksmith failed to process an SNS notification.");
      }
    }
  };
}
