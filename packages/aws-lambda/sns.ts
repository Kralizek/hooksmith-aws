import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

export type RecordReader<TNotification, TData = unknown> = (
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

export interface ProcessorOptions<TNotification, TData = unknown> {
  read: RecordReader<TNotification, TData>;
  process: EventProcessor<TData>;
}

export function createProcessor<TNotification, TData = unknown>(
  options: ProcessorOptions<TNotification, TData>,
): (event: LambdaEvent<TNotification>) => Promise<void> {
  return async (event) => {
    for (const record of event.Records) {
      const document = await options.read(record.Sns);
      const report = await options.process(document);
      if (!report.success) {
        throw new Error("Hooksmith failed to process an SNS notification.");
      }
    }
  };
}
