import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

export interface Notification {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  UnsubscribeURL?: string;
  MessageAttributes?: Record<string, unknown>;
}

export interface LambdaRecord {
  Sns: Notification;
}

export type RecordReader<TData = unknown> = (
  notification: Notification,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

export type EventProcessor<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

export interface LambdaEvent {
  Records: LambdaRecord[];
}

export function createProcessor<TData = unknown>(
  read: RecordReader<TData>,
  process: EventProcessor<TData>,
): (event: LambdaEvent) => Promise<void> {
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
