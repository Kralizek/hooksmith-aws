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

export function createProcessor<TNotification, TData = unknown>(
  read: RecordReader<TNotification, TData>,
  process: EventProcessor<TData>,
): (event: LambdaEvent<TNotification>) => Promise<void> {
  return async (event) => {
    for (const record of event.Records) {
      const document = await read(record.Sns);
      const report = await process(document);
      if (!report.success) {
        throw new Error("Hooksmith failed to process an SNS notification.");
      }
    }
  };
}
